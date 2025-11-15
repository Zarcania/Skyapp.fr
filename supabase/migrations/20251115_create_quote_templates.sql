-- Migration: Création de la table quote_templates
-- Date: 2025-11-15
-- Description: Templates de devis personnalisés par entreprise

-- Table des templates de devis
CREATE TABLE IF NOT EXISTS quote_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags VARCHAR(100)[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_quote_templates_company ON quote_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_quote_templates_name ON quote_templates(name);
CREATE INDEX IF NOT EXISTS idx_quote_templates_tags ON quote_templates USING GIN(tags);

-- Index GIN pour recherche dans items JSON
CREATE INDEX IF NOT EXISTS idx_quote_templates_items ON quote_templates USING GIN(items);

-- Commentaires
COMMENT ON TABLE quote_templates IS 'Templates de devis personnalisés par entreprise';
COMMENT ON COLUMN quote_templates.company_id IS 'Entreprise propriétaire du template';
COMMENT ON COLUMN quote_templates.name IS 'Nom du template (ex: Devis Standard BTP)';
COMMENT ON COLUMN quote_templates.description IS 'Description du template';
COMMENT ON COLUMN quote_templates.items IS 'Articles et prestations pré-remplis en JSON';
COMMENT ON COLUMN quote_templates.tags IS 'Tags pour catégoriser les templates (ex: plomberie, BTP)';

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_quote_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quote_templates_timestamp
BEFORE UPDATE ON quote_templates
FOR EACH ROW
EXECUTE FUNCTION update_quote_templates_timestamp();

-- RLS (Row Level Security)
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs ne peuvent voir que les templates de leur entreprise
CREATE POLICY quote_templates_company_isolation ON quote_templates
  FOR ALL
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Données de test (optionnel)
-- INSERT INTO quote_templates (company_id, name, description, items, tags) VALUES
-- ('company-uuid-here', 'Devis Standard BTP', 'Template de base pour travaux BTP', '[{"name":"Main d'\''oeuvre","quantity":1,"price":500,"total":500}]', ARRAY['btp', 'standard']);
