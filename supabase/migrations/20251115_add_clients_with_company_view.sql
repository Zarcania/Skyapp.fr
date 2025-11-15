-- Migration: Ajouter une vue clients_with_company pour afficher le nom de l'entreprise
-- Date: 2025-11-15
-- Description: Crée une fonction pour récupérer le nom de l'entreprise et une vue qui l'utilise

-- 1️⃣ Créer une fonction pour récupérer le nom de l'entreprise
CREATE OR REPLACE FUNCTION get_company_name(company_uuid UUID)
RETURNS TEXT AS $$
  SELECT nom FROM companies WHERE id = company_uuid LIMIT 1;
$$ LANGUAGE sql STABLE;

-- 2️⃣ Créer une vue qui ajoute le company_name aux clients
CREATE OR REPLACE VIEW clients_with_company AS
SELECT 
  clients.id,
  clients.company_id,
  clients.nom,
  clients.email,
  clients.telephone,
  clients.adresse,
  clients.created_at,
  get_company_name(clients.company_id) AS company_name
FROM clients;

-- 3️⃣ Commentaires pour documentation
COMMENT ON FUNCTION get_company_name(UUID) IS 'Récupère le nom de l''entreprise à partir de son UUID';
COMMENT ON VIEW clients_with_company IS 'Vue des clients avec le nom de l''entreprise (colonne virtuelle company_name)';
