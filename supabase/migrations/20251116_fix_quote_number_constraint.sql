-- Migration pour corriger la contrainte UNIQUE sur quote_number
-- Permet à chaque entreprise d'avoir sa propre séquence de numérotation

-- 1. Supprimer la contrainte UNIQUE globale
ALTER TABLE quotes 
DROP CONSTRAINT IF EXISTS quotes_quote_number_key;

-- 2. Ajouter une contrainte UNIQUE composite (company_id + quote_number)
-- Cela permet à différentes entreprises d'avoir le même numéro de devis
ALTER TABLE quotes 
ADD CONSTRAINT quotes_company_quote_number_unique 
UNIQUE (company_id, quote_number);

-- 3. Créer un index pour améliorer les performances des recherches
CREATE INDEX IF NOT EXISTS idx_quotes_company_quote_number 
ON quotes(company_id, quote_number);

-- Commentaire explicatif
COMMENT ON CONSTRAINT quotes_company_quote_number_unique ON quotes IS 
'Garantit l''unicité du numéro de devis par entreprise. Chaque entreprise peut avoir ses propres numéros (202511-001, 202511-002, etc.) sans interférence avec les autres entreprises.';
