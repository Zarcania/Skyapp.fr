-- -- Migration: Création de la table company_settings pour les paramètres d'entreprise
-- Date: 2025-11-19
-- Description: Table pour stocker les informations légales de l'entreprise (logo, SIRET, etc.)

-- Créer la table company_settings
CREATE TABLE IF NOT EXISTS public.company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    legal_form TEXT NOT NULL,
    address TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    city TEXT NOT NULL,
    siret TEXT NOT NULL,
    siren TEXT NOT NULL,
    rcs_rm TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(company_id)
);

-- Index pour la recherche rapide par company_id
CREATE INDEX IF NOT EXISTS idx_company_settings_company_id ON public.company_settings(company_id);

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_company_settings_timestamp ON public.company_settings;

CREATE TRIGGER update_company_settings_timestamp
    BEFORE UPDATE ON public.company_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_company_settings_updated_at();

-- RLS (Row Level Security)
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir les paramètres de leur entreprise
DROP POLICY IF EXISTS "Users can view their company settings" ON public.company_settings;
CREATE POLICY "Users can view their company settings"
    ON public.company_settings
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Politique: Seuls les admins peuvent créer/modifier les paramètres
DROP POLICY IF EXISTS "Admins can create company settings" ON public.company_settings;
CREATE POLICY "Admins can create company settings"
    ON public.company_settings
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND company_id = company_settings.company_id
            AND role = 'ADMIN'
        )
    );

DROP POLICY IF EXISTS "Admins can update company settings" ON public.company_settings;
CREATE POLICY "Admins can update company settings"
    ON public.company_settings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND company_id = company_settings.company_id
            AND role = 'ADMIN'
        )
    );

-- Commentaires pour la documentation
COMMENT ON TABLE public.company_settings IS 'Paramètres et informations légales de l''entreprise';
COMMENT ON COLUMN public.company_settings.company_name IS 'Nom officiel de l''entreprise';
COMMENT ON COLUMN public.company_settings.legal_form IS 'Forme juridique (SARL, SAS, Auto-entrepreneur, etc.)';
COMMENT ON COLUMN public.company_settings.siret IS 'Numéro SIRET (14 chiffres)';
COMMENT ON COLUMN public.company_settings.siren IS 'Numéro SIREN (9 chiffres)';
COMMENT ON COLUMN public.company_settings.rcs_rm IS 'Registre du Commerce et des Sociétés ou Répertoire des Métiers';
COMMENT ON COLUMN public.company_settings.logo_url IS 'URL du logo de l''entreprise';
