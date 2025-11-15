-- Migration: Ajouter colonne items (JSONB) à la table quotes
-- Date: 2025-11-15
-- Description: Permet de stocker les articles/prestations de chaque devis en format JSON

-- Ajouter la colonne items de type JSONB avec valeur par défaut []
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- Ajouter un commentaire pour la documentation
COMMENT ON COLUMN quotes.items IS 'Articles et prestations du devis stockés en JSON (nom, quantité, prix)';

-- Index GIN pour recherches efficaces dans le JSON
CREATE INDEX IF NOT EXISTS idx_quotes_items ON quotes USING GIN (items);
