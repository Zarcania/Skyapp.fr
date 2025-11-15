-- Migration: Ajouter la colonne items à la vue quotes_with_client_name
-- Date: 2025-11-15
-- Description: Mettre à jour la vue pour inclure la colonne items (JSONB)

-- Recréer la vue en ajoutant items
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
  q.items,  -- AJOUT DE LA COLONNE ITEMS
  q.created_at,
  q.updated_at,
  c.nom as client_name,
  c.email as client_email,
  c.telephone as client_phone,
  c.adresse as client_address
FROM quotes q
LEFT JOIN clients c ON q.client_id = c.id;

COMMENT ON VIEW quotes_with_client_name IS 'Vue des devis avec informations client et articles/prestations (items)';
