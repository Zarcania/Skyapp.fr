-- ============================================================================
-- Migration: Facturation Électronique - Conforme Réforme DGFiP 2026-2027
-- Date: 2025-11-19
-- Description: Tables pour la gestion complète de la facturation électronique
--              Format Factur-X, intégration PDP, E-Reporting, Archivage 10 ans
-- ============================================================================

-- ============================================================================
-- 1. TABLE PRINCIPALE: invoices_electronic
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invoices_electronic (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    
    -- Informations facture
    invoice_number TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    
    -- Informations client (SIREN obligatoire réforme)
    customer_name TEXT NOT NULL,
    siren_client TEXT NOT NULL CHECK (char_length(siren_client) = 9),
    address_billing TEXT NOT NULL,
    address_delivery TEXT,
    
    -- Montants
    total_ht DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_tva DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_ttc DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Format et statut
    format TEXT NOT NULL CHECK (format IN ('facturx', 'ubl', 'cii', 'pdf')),
    status_pdp TEXT NOT NULL DEFAULT 'draft' CHECK (status_pdp IN (
        'draft',           -- Brouillon
        'pending',         -- En attente envoi
        'transmitted',     -- Envoyée à PDP
        'accepted',        -- Acceptée par destinataire
        'rejected',        -- Rejetée
        'received',        -- Facture reçue (entrante)
        'archived'         -- Archivée
    )),
    
    -- Fichiers
    file_url_pdf TEXT,
    file_url_xml TEXT,
    file_hash_sha256 TEXT, -- Hash pour intégrité
    
    -- PDP tracking
    pdp_tracking_id TEXT,
    pdp_provider TEXT CHECK (pdp_provider IN ('chorus_pro', 'yooz', 'pennylane', 'jefacture', 'sellsy', 'myunisoft')),
    pdp_sent_at TIMESTAMP WITH TIME ZONE,
    pdp_status_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Conditions paiement
    payment_terms TEXT,
    payment_method TEXT CHECK (payment_method IN ('virement', 'cheque', 'carte', 'especes', 'prelevement')),
    
    -- Mentions légales
    legal_mentions TEXT,
    
    -- Métadonnées
    direction TEXT NOT NULL DEFAULT 'outgoing' CHECK (direction IN ('outgoing', 'incoming')),
    notes TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Contrainte unicité numéro facture par entreprise
    UNIQUE(company_id, invoice_number)
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_invoices_electronic_company ON public.invoices_electronic(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_electronic_customer ON public.invoices_electronic(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_electronic_status ON public.invoices_electronic(status_pdp);
CREATE INDEX IF NOT EXISTS idx_invoices_electronic_date ON public.invoices_electronic(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_electronic_direction ON public.invoices_electronic(direction);
CREATE INDEX IF NOT EXISTS idx_invoices_electronic_siren ON public.invoices_electronic(siren_client);

-- ============================================================================
-- 2. TABLE: invoice_lines (Lignes de facturation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices_electronic(id) ON DELETE CASCADE,
    
    -- Ligne facture
    line_number INTEGER NOT NULL,
    designation TEXT NOT NULL,
    description TEXT,
    
    -- Quantités et prix
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'unité',
    unit_price_ht DECIMAL(12, 2) NOT NULL,
    
    -- TVA
    tva_rate DECIMAL(5, 2) NOT NULL CHECK (tva_rate IN (0, 5.5, 10, 20)),
    tva_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Totaux
    total_ht DECIMAL(12, 2) NOT NULL,
    total_ttc DECIMAL(12, 2) NOT NULL,
    
    -- Optionnel: référence article catalogue
    catalog_item_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Contrainte ordre lignes
    UNIQUE(invoice_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON public.invoice_lines(invoice_id);

-- ============================================================================
-- 3. TABLE: e_reporting (Déclarations B2C, Export, Intra-UE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.e_reporting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Type opération
    type_operation TEXT NOT NULL CHECK (type_operation IN (
        'B2C',              -- Vente particulier
        'export',           -- Export hors UE
        'intra_ue',         -- Livraison intracommunautaire
        'import',           -- Import
        'exonere_tva'       -- Opération exonérée TVA
    )),
    
    -- Montants
    montant_ht DECIMAL(12, 2) NOT NULL,
    tva_amount DECIMAL(12, 2) DEFAULT 0,
    tva_rate DECIMAL(5, 2),
    
    -- Date opération
    date_operation DATE NOT NULL,
    
    -- Statut PDP
    statut_pdp TEXT NOT NULL DEFAULT 'pending' CHECK (statut_pdp IN ('pending', 'transmitted', 'accepted', 'rejected')),
    pdp_tracking_id TEXT,
    pdp_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Payload JSON pour flexibilité
    payload_json JSONB,
    
    -- Référence facture si applicable
    invoice_id UUID REFERENCES public.invoices_electronic(id) ON DELETE SET NULL,
    
    -- Métadonnées
    notes TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_e_reporting_company ON public.e_reporting(company_id);
CREATE INDEX IF NOT EXISTS idx_e_reporting_type ON public.e_reporting(type_operation);
CREATE INDEX IF NOT EXISTS idx_e_reporting_date ON public.e_reporting(date_operation DESC);
CREATE INDEX IF NOT EXISTS idx_e_reporting_status ON public.e_reporting(statut_pdp);

-- ============================================================================
-- 4. TABLE: invoices_logs (Traçabilité complète)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invoices_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices_electronic(id) ON DELETE CASCADE,
    reporting_id UUID REFERENCES public.e_reporting(id) ON DELETE CASCADE,
    
    -- Action effectuée
    action TEXT NOT NULL CHECK (action IN (
        'created',          -- Facture créée
        'updated',          -- Modifiée
        'sent',             -- Envoyée PDP
        'received',         -- Reçue
        'accepted',         -- Acceptée
        'rejected',         -- Rejetée
        'archived',         -- Archivée
        'deleted',          -- Supprimée
        'pdf_generated',    -- PDF généré
        'xml_generated',    -- XML généré
        'facturx_created',  -- Factur-X créé
        'status_changed',   -- Changement statut
        'error'             -- Erreur
    )),
    
    -- Détails
    details TEXT,
    error_message TEXT,
    
    -- Métadonnées
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ip_address TEXT,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Check: au moins une référence
    CHECK (invoice_id IS NOT NULL OR reporting_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_invoices_logs_invoice ON public.invoices_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_logs_reporting ON public.invoices_logs(reporting_id);
CREATE INDEX IF NOT EXISTS idx_invoices_logs_action ON public.invoices_logs(action);
CREATE INDEX IF NOT EXISTS idx_invoices_logs_timestamp ON public.invoices_logs(timestamp DESC);

-- ============================================================================
-- 5. TRIGGERS: Auto-update timestamps
-- ============================================================================

-- Trigger invoices_electronic
CREATE OR REPLACE FUNCTION update_invoices_electronic_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoices_electronic_timestamp
    BEFORE UPDATE ON public.invoices_electronic
    FOR EACH ROW
    EXECUTE FUNCTION update_invoices_electronic_timestamp();

-- Trigger e_reporting
CREATE OR REPLACE FUNCTION update_e_reporting_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_e_reporting_timestamp
    BEFORE UPDATE ON public.e_reporting
    FOR EACH ROW
    EXECUTE FUNCTION update_e_reporting_timestamp();

-- ============================================================================
-- 6. RLS (Row Level Security)
-- ============================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.invoices_electronic ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_reporting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices_logs ENABLE ROW LEVEL SECURITY;

-- Policies invoices_electronic
CREATE POLICY "Users can view their company invoices"
    ON public.invoices_electronic
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create invoices"
    ON public.invoices_electronic
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their company invoices"
    ON public.invoices_electronic
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Only admins can delete invoices"
    ON public.invoices_electronic
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND company_id = invoices_electronic.company_id
            AND role = 'ADMIN'
        )
    );

-- Policies invoice_lines
CREATE POLICY "Users can view invoice lines"
    ON public.invoice_lines
    FOR SELECT
    USING (
        invoice_id IN (
            SELECT id FROM public.invoices_electronic
            WHERE company_id IN (
                SELECT company_id FROM public.users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage invoice lines"
    ON public.invoice_lines
    FOR ALL
    USING (
        invoice_id IN (
            SELECT id FROM public.invoices_electronic
            WHERE company_id IN (
                SELECT company_id FROM public.users WHERE id = auth.uid()
            )
        )
    );

-- Policies e_reporting
CREATE POLICY "Users can view their company e-reporting"
    ON public.e_reporting
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create e-reporting"
    ON public.e_reporting
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update e-reporting"
    ON public.e_reporting
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Policies invoices_logs (lecture seule pour tous)
CREATE POLICY "Users can view logs"
    ON public.invoices_logs
    FOR SELECT
    USING (
        invoice_id IN (
            SELECT id FROM public.invoices_electronic
            WHERE company_id IN (
                SELECT company_id FROM public.users WHERE id = auth.uid()
            )
        )
        OR
        reporting_id IN (
            SELECT id FROM public.e_reporting
            WHERE company_id IN (
                SELECT company_id FROM public.users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "System can insert logs"
    ON public.invoices_logs
    FOR INSERT
    WITH CHECK (true); -- Logs créés par le backend

-- ============================================================================
-- 7. COMMENTAIRES (Documentation)
-- ============================================================================

COMMENT ON TABLE public.invoices_electronic IS 'Factures électroniques conformes réforme DGFiP 2026-2027';
COMMENT ON COLUMN public.invoices_electronic.siren_client IS 'SIREN client obligatoire (9 chiffres)';
COMMENT ON COLUMN public.invoices_electronic.format IS 'Format: facturx (PDF+XML), ubl (XML), cii (XML), pdf (simple)';
COMMENT ON COLUMN public.invoices_electronic.status_pdp IS 'Statut PDP: draft, pending, transmitted, accepted, rejected, received, archived';
COMMENT ON COLUMN public.invoices_electronic.file_hash_sha256 IS 'Hash SHA256 pour vérification intégrité (archivage 10 ans)';
COMMENT ON COLUMN public.invoices_electronic.direction IS 'Direction: outgoing (émise) ou incoming (reçue)';

COMMENT ON TABLE public.invoice_lines IS 'Lignes de facturation avec détail TVA par ligne';
COMMENT ON COLUMN public.invoice_lines.tva_rate IS 'Taux TVA français: 0, 5.5, 10, 20';

COMMENT ON TABLE public.e_reporting IS 'E-Reporting pour opérations hors facturation électronique (B2C, Export, Intra-UE)';
COMMENT ON COLUMN public.e_reporting.type_operation IS 'Type: B2C, export, intra_ue, import, exonere_tva';

COMMENT ON TABLE public.invoices_logs IS 'Logs traçabilité complète pour conformité légale et audit';

-- ============================================================================
-- 8. VUE: Statistiques factures
-- ============================================================================

CREATE OR REPLACE VIEW public.invoice_statistics AS
SELECT 
    company_id,
    COUNT(*) FILTER (WHERE direction = 'outgoing') as total_emises,
    COUNT(*) FILTER (WHERE direction = 'incoming') as total_recues,
    COUNT(*) FILTER (WHERE status_pdp = 'accepted') as total_acceptees,
    COUNT(*) FILTER (WHERE status_pdp = 'rejected') as total_rejetees,
    SUM(total_ttc) FILTER (WHERE direction = 'outgoing' AND status_pdp = 'accepted') as ca_facture,
    AVG(total_ttc) FILTER (WHERE direction = 'outgoing') as montant_moyen,
    COUNT(*) FILTER (WHERE format = 'facturx') as total_facturx,
    MAX(invoice_date) as derniere_facture
FROM public.invoices_electronic
GROUP BY company_id;

COMMENT ON VIEW public.invoice_statistics IS 'Vue statistiques factures électroniques par entreprise';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
