-- =====================================================
-- MIGRATION: Modules réception, e-reporting et archivage
-- Conforme réforme DGFiP 2026-2027
-- Date: 2025-11-19
-- =====================================================

-- =====================================================
-- 1. MODULE RÉCEPTION FACTURES
-- =====================================================

-- Table des factures reçues
CREATE TABLE IF NOT EXISTS invoices_received (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Identification facture
    invoice_number VARCHAR(100) NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_siren VARCHAR(9), -- SIREN du fournisseur (9 chiffres)
    
    -- Dates
    invoice_date DATE NOT NULL,
    received_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date DATE,
    
    -- Montants
    total_ht DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_tva DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_ttc DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Format et source
    format_type VARCHAR(50) NOT NULL, -- 'factur-x', 'ubl', 'cii', 'pdf-simple'
    reception_method VARCHAR(50) NOT NULL DEFAULT 'manual', -- 'pdp-webhook', 'manual-upload'
    
    -- Statuts
    status VARCHAR(50) NOT NULL DEFAULT 'received', 
    -- Valeurs: 'received', 'processing', 'validated', 'rejected', 'paid'
    
    -- Fichiers
    pdf_file_path TEXT, -- Chemin vers le PDF
    xml_file_path TEXT, -- Chemin vers le XML (Factur-X/UBL/CII)
    
    -- Métadonnées techniques
    file_size_bytes INTEGER,
    xml_hash VARCHAR(64), -- SHA256 du XML pour vérification intégrité
    pdf_hash VARCHAR(64), -- SHA256 du PDF
    
    -- Validation
    validation_errors JSONB, -- Liste des erreurs de validation si rejetée
    validation_date TIMESTAMP WITH TIME ZONE,
    validated_by UUID REFERENCES auth.users(id),
    
    -- Notes et commentaires
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Contraintes
    CONSTRAINT valid_siren_received CHECK (supplier_siren IS NULL OR LENGTH(supplier_siren) = 9),
    CONSTRAINT valid_status_received CHECK (status IN ('received', 'processing', 'validated', 'rejected', 'paid')),
    CONSTRAINT valid_format CHECK (format_type IN ('factur-x', 'ubl', 'cii', 'pdf-simple')),
    CONSTRAINT valid_reception CHECK (reception_method IN ('pdp-webhook', 'manual-upload'))
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_invoices_received_company ON invoices_received(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_received_status ON invoices_received(status);
CREATE INDEX IF NOT EXISTS idx_invoices_received_date ON invoices_received(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_received_supplier ON invoices_received(supplier_siren);

-- RLS (Row Level Security)
ALTER TABLE invoices_received ENABLE ROW LEVEL SECURITY;

-- Politique: lecture pour utilisateurs de la même entreprise
CREATE POLICY "Users can view invoices received of their company"
    ON invoices_received FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Politique: insertion pour utilisateurs de la même entreprise
CREATE POLICY "Users can insert invoices received for their company"
    ON invoices_received FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Politique: mise à jour pour utilisateurs de la même entreprise
CREATE POLICY "Users can update invoices received of their company"
    ON invoices_received FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Politique: suppression pour utilisateurs de la même entreprise
CREATE POLICY "Users can delete invoices received of their company"
    ON invoices_received FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_invoices_received_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoices_received_timestamp
    BEFORE UPDATE ON invoices_received
    FOR EACH ROW
    EXECUTE FUNCTION update_invoices_received_timestamp();

-- =====================================================
-- 2. MODULE E-REPORTING
-- =====================================================

-- Table des déclarations e-reporting (B2C, Export, Intra-UE)
CREATE TABLE IF NOT EXISTS e_reporting_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Type de déclaration
    declaration_type VARCHAR(50) NOT NULL,
    -- Valeurs: 'b2c' (B2C France), 'export' (Export hors UE), 'intra-ue' (Livraison intracommunautaire)
    
    -- Période couverte
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Montants déclarés
    total_ht DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_tva DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_ttc DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Nombre d'opérations
    operations_count INTEGER NOT NULL DEFAULT 0,
    
    -- Statuts
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    -- Valeurs: 'draft', 'transmitted', 'accepted', 'rejected'
    
    -- Transmission PDP
    transmission_date TIMESTAMP WITH TIME ZONE,
    pdp_reference VARCHAR(255), -- Référence PDP après transmission
    pdp_response JSONB, -- Réponse complète du PDP
    
    -- Détails des opérations (structure JSON)
    operations_details JSONB,
    -- Exemple: [{"date": "2025-01-15", "client": "Consommateur final", "montant_ht": 100, "tva": 20}]
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    transmitted_by UUID REFERENCES auth.users(id),
    
    -- Contraintes
    CONSTRAINT valid_declaration_type CHECK (declaration_type IN ('b2c', 'export', 'intra-ue')),
    CONSTRAINT valid_reporting_status CHECK (status IN ('draft', 'transmitted', 'accepted', 'rejected')),
    CONSTRAINT valid_period CHECK (period_end >= period_start),
    CONSTRAINT positive_operations_count CHECK (operations_count >= 0)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_ereporting_company ON e_reporting_declarations(company_id);
CREATE INDEX IF NOT EXISTS idx_ereporting_type ON e_reporting_declarations(declaration_type);
CREATE INDEX IF NOT EXISTS idx_ereporting_period ON e_reporting_declarations(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_ereporting_status ON e_reporting_declarations(status);

-- RLS (Row Level Security)
ALTER TABLE e_reporting_declarations ENABLE ROW LEVEL SECURITY;

-- Politique: lecture pour utilisateurs de la même entreprise
CREATE POLICY "Users can view e-reporting of their company"
    ON e_reporting_declarations FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Politique: insertion pour utilisateurs de la même entreprise
CREATE POLICY "Users can insert e-reporting for their company"
    ON e_reporting_declarations FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Politique: mise à jour pour utilisateurs de la même entreprise
CREATE POLICY "Users can update e-reporting of their company"
    ON e_reporting_declarations FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Politique: suppression pour utilisateurs de la même entreprise
CREATE POLICY "Users can delete e-reporting of their company"
    ON e_reporting_declarations FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_ereporting_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ereporting_timestamp
    BEFORE UPDATE ON e_reporting_declarations
    FOR EACH ROW
    EXECUTE FUNCTION update_ereporting_timestamp();

-- =====================================================
-- 3. MODULE ARCHIVAGE LÉGAL (10 ANS)
-- =====================================================

-- Table d'archivage légal des factures
CREATE TABLE IF NOT EXISTS archives_legal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Type de document archivé
    document_type VARCHAR(50) NOT NULL,
    -- Valeurs: 'invoice-emitted', 'invoice-received', 'e-reporting'
    
    -- Référence au document source
    source_table VARCHAR(100) NOT NULL, -- 'invoices_electronic', 'invoices_received', 'e_reporting_declarations'
    source_id UUID NOT NULL, -- ID du document source
    
    -- Identification document
    document_number VARCHAR(100) NOT NULL,
    document_date DATE NOT NULL,
    
    -- Parties (émetteur/destinataire)
    party_name VARCHAR(255) NOT NULL, -- Nom client ou fournisseur
    party_siren VARCHAR(9), -- SIREN si applicable
    
    -- Montant
    total_ttc DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Fichiers archivés
    pdf_file_path TEXT NOT NULL,
    xml_file_path TEXT, -- NULL si PDF simple
    
    -- Intégrité (hashes SHA256)
    pdf_hash VARCHAR(64) NOT NULL,
    xml_hash VARCHAR(64), -- NULL si pas de XML
    combined_hash VARCHAR(64) NOT NULL, -- Hash du PDF+XML ensemble
    
    -- Métadonnées techniques
    pdf_size_bytes INTEGER,
    xml_size_bytes INTEGER,
    total_size_bytes INTEGER,
    
    -- Durée de conservation légale
    archived_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiration_date TIMESTAMP WITH TIME ZONE NOT NULL, -- archived_date + 10 ans minimum
    
    -- Statut archivage
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    -- Valeurs: 'active', 'verified', 'corrupted', 'expired', 'deleted'
    
    -- Vérifications d'intégrité
    last_integrity_check TIMESTAMP WITH TIME ZONE,
    integrity_check_count INTEGER DEFAULT 0,
    integrity_status VARCHAR(50) DEFAULT 'not-checked',
    -- Valeurs: 'not-checked', 'valid', 'corrupted'
    
    -- Métadonnées JSON (pour flexibilité)
    metadata JSONB,
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Contraintes
    CONSTRAINT valid_document_type CHECK (document_type IN ('invoice-emitted', 'invoice-received', 'e-reporting')),
    CONSTRAINT valid_archive_status CHECK (status IN ('active', 'verified', 'corrupted', 'expired', 'deleted')),
    CONSTRAINT valid_integrity_status CHECK (integrity_status IN ('not-checked', 'valid', 'corrupted')),
    CONSTRAINT valid_siren_archive CHECK (party_siren IS NULL OR LENGTH(party_siren) = 9),
    CONSTRAINT expiration_after_archive CHECK (expiration_date > archived_date)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_archives_company ON archives_legal(company_id);
CREATE INDEX IF NOT EXISTS idx_archives_type ON archives_legal(document_type);
CREATE INDEX IF NOT EXISTS idx_archives_date ON archives_legal(document_date DESC);
CREATE INDEX IF NOT EXISTS idx_archives_status ON archives_legal(status);
CREATE INDEX IF NOT EXISTS idx_archives_expiration ON archives_legal(expiration_date);
CREATE INDEX IF NOT EXISTS idx_archives_source ON archives_legal(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_archives_party ON archives_legal(party_siren);

-- RLS (Row Level Security)
ALTER TABLE archives_legal ENABLE ROW LEVEL SECURITY;

-- Politique: lecture pour utilisateurs de la même entreprise
CREATE POLICY "Users can view archives of their company"
    ON archives_legal FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Politique: insertion pour utilisateurs de la même entreprise
CREATE POLICY "Users can insert archives for their company"
    ON archives_legal FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Politique: mise à jour pour utilisateurs de la même entreprise (seulement vérifications intégrité)
CREATE POLICY "Users can update archives of their company"
    ON archives_legal FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Politique: suppression interdite (archivage légal)
-- Pas de politique DELETE - suppression manuelle admin uniquement

-- =====================================================
-- VUES UTILES
-- =====================================================

-- Vue: statistiques factures reçues par mois
CREATE OR REPLACE VIEW v_invoices_received_monthly_stats AS
SELECT 
    company_id,
    DATE_TRUNC('month', invoice_date) AS month,
    COUNT(*) AS invoice_count,
    SUM(total_ht) AS total_ht,
    SUM(total_tva) AS total_tva,
    SUM(total_ttc) AS total_ttc,
    COUNT(CASE WHEN status = 'validated' THEN 1 END) AS validated_count,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejected_count
FROM invoices_received
GROUP BY company_id, DATE_TRUNC('month', invoice_date);

-- Vue: statistiques e-reporting par type
CREATE OR REPLACE VIEW v_ereporting_stats AS
SELECT 
    company_id,
    declaration_type,
    COUNT(*) AS declaration_count,
    SUM(operations_count) AS total_operations,
    SUM(total_ht) AS total_ht,
    SUM(total_tva) AS total_tva,
    SUM(total_ttc) AS total_ttc,
    COUNT(CASE WHEN status = 'transmitted' THEN 1 END) AS transmitted_count,
    COUNT(CASE WHEN status = 'accepted' THEN 1 END) AS accepted_count
FROM e_reporting_declarations
GROUP BY company_id, declaration_type;

-- Vue: archives à vérifier (intégrité)
CREATE OR REPLACE VIEW v_archives_to_verify AS
SELECT 
    id,
    company_id,
    document_type,
    document_number,
    archived_date,
    last_integrity_check,
    integrity_check_count,
    EXTRACT(DAY FROM NOW() - COALESCE(last_integrity_check, archived_date)) AS days_since_check
FROM archives_legal
WHERE status = 'active'
  AND (last_integrity_check IS NULL OR last_integrity_check < NOW() - INTERVAL '30 days')
ORDER BY days_since_check DESC;

-- Vue: archives expirant bientôt (dans les 6 mois)
CREATE OR REPLACE VIEW v_archives_expiring_soon AS
SELECT 
    id,
    company_id,
    document_type,
    document_number,
    document_date,
    expiration_date,
    EXTRACT(DAY FROM expiration_date - NOW()) AS days_until_expiration
FROM archives_legal
WHERE status = 'active'
  AND expiration_date < NOW() + INTERVAL '6 months'
ORDER BY expiration_date ASC;

-- =====================================================
-- COMMENTAIRES TABLES
-- =====================================================

COMMENT ON TABLE invoices_received IS 'Factures reçues via PDP ou upload manuel - Conforme DGFiP 2026-2027';
COMMENT ON TABLE e_reporting_declarations IS 'Déclarations e-reporting (B2C, Export, Intra-UE) - Conforme DGFiP 2026-2027';
COMMENT ON TABLE archives_legal IS 'Archivage légal 10 ans avec vérification intégrité SHA256 - Conforme DGFiP 2026-2027';

-- =====================================================
-- FIN MIGRATION
-- =====================================================
