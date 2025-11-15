-- Migration: Vue quotes avec nom du client
-- Date: 2025-11-15
-- Description: Créer une vue pour afficher les devis avec le nom et email du client associé

-- Fonction helper pour récupérer le nom du client
CREATE OR REPLACE FUNCTION get_client_info(p_client_id UUID)
RETURNS TABLE(nom TEXT, email TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT c.nom, c.email
  FROM clients c
  WHERE c.id = p_client_id;
END;
$$ LANGUAGE plpgsql;

-- Vue quotes_with_client_name
CREATE OR REPLACE VIEW quotes_with_client_name AS
SELECT 
  q.id,
  q.company_id,
  q.client_id,
  q.user_id,
  q.title,
  q.description,
  q.amount,
  q.status,
  q.created_at,
  q.updated_at,
  c.nom as client_name,
  c.email as client_email,
  c.telephone as client_phone,
  c.adresse as client_address
FROM quotes q
LEFT JOIN clients c ON q.client_id = c.id;

-- Commentaire pour documentation
COMMENT ON VIEW quotes_with_client_name IS 'Vue permettant d''afficher les devis avec les informations du client (nom, email, téléphone, adresse)';
