-- Migration pour ajouter un numéro de devis unique
-- Format: YYYYMM-XXX (exemple: 202511-001, 202511-002, etc.)

-- 1. Ajouter la colonne quote_number
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS quote_number VARCHAR(50) UNIQUE;

-- 2. Créer un index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);

-- 3. Créer une fonction pour générer le prochain numéro de devis
CREATE OR REPLACE FUNCTION generate_quote_number(p_company_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR(6);
  v_counter INTEGER;
  v_quote_number VARCHAR(50);
BEGIN
  -- Format: YYYYMM (ex: 202511)
  v_prefix := TO_CHAR(NOW(), 'YYYYMM');
  
  -- Trouver le dernier numéro du mois pour cette entreprise
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(quote_number FROM LENGTH(v_prefix) + 2) AS INTEGER
      )
    ), 0
  ) INTO v_counter
  FROM quotes
  WHERE company_id = p_company_id
    AND quote_number LIKE v_prefix || '-%';
  
  -- Incrémenter le compteur
  v_counter := v_counter + 1;
  
  -- Formater avec 3 chiffres (001, 002, etc.)
  v_quote_number := v_prefix || '-' || LPAD(v_counter::TEXT, 3, '0');
  
  RETURN v_quote_number;
END;
$$ LANGUAGE plpgsql;

-- 4. Mettre à jour les devis existants avec des numéros
-- (Seulement pour les devis sans numéro)
DO $$
DECLARE
  r RECORD;
  v_new_number VARCHAR(50);
BEGIN
  FOR r IN 
    SELECT id, company_id 
    FROM quotes 
    WHERE quote_number IS NULL 
    ORDER BY created_at ASC
  LOOP
    v_new_number := generate_quote_number(r.company_id);
    UPDATE quotes 
    SET quote_number = v_new_number 
    WHERE id = r.id;
  END LOOP;
END $$;

-- 5. Rendre la colonne NOT NULL après avoir rempli les valeurs existantes
ALTER TABLE quotes 
ALTER COLUMN quote_number SET NOT NULL;

-- 6. Mettre à jour la vue quotes_with_client_name pour inclure quote_number
DROP VIEW IF EXISTS quotes_with_client_name;
CREATE VIEW quotes_with_client_name AS
SELECT 
  q.id,
  q.company_id,
  q.client_id,
  q.quote_number,
  q.title,
  q.description,
  q.amount,
  q.status,
  q.items,
  q.created_at,
  q.updated_at,
  c.nom as client_name,
  c.email as client_email,
  c.telephone as client_phone,
  c.adresse as client_address
FROM quotes q
LEFT JOIN clients c ON q.client_id = c.id;

COMMENT ON COLUMN quotes.quote_number IS 'Numéro unique du devis au format YYYYMM-XXX';
COMMENT ON FUNCTION generate_quote_number IS 'Génère le prochain numéro de devis pour une entreprise (format YYYYMM-XXX)';
