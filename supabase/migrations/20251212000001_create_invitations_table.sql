-- Migration: Create invitations table for team member invitation system
-- This table stores invitations sent to potential team members
-- Used in PlanningComponent.js for managing team invitations

CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('team_leader', 'collaborator', 'admin', 'user')),
    invited_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    invited_by_name TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED')),
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_invitations_company_id ON public.invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON public.invitations(expires_at);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invitations_updated_at
    BEFORE UPDATE ON public.invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_invitations_updated_at();

-- Enable Row Level Security
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Policies RLS
-- Les utilisateurs ne peuvent voir que les invitations de leur entreprise
CREATE POLICY "Users can view invitations from their company"
    ON public.invitations
    FOR SELECT
    USING (company_id = get_current_company_id());

-- Les utilisateurs peuvent créer des invitations pour leur entreprise
CREATE POLICY "Users can create invitations for their company"
    ON public.invitations
    FOR INSERT
    WITH CHECK (company_id = get_current_company_id());

-- Les utilisateurs peuvent mettre à jour les invitations de leur entreprise
CREATE POLICY "Users can update invitations from their company"
    ON public.invitations
    FOR UPDATE
    USING (company_id = get_current_company_id())
    WITH CHECK (company_id = get_current_company_id());

-- Les utilisateurs peuvent supprimer les invitations de leur entreprise
CREATE POLICY "Users can delete invitations from their company"
    ON public.invitations
    FOR DELETE
    USING (company_id = get_current_company_id());

-- Grant permissions
GRANT ALL ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;

-- Commentaires pour documentation
COMMENT ON TABLE public.invitations IS 'Table for managing team member invitations';
COMMENT ON COLUMN public.invitations.id IS 'Unique identifier for the invitation';
COMMENT ON COLUMN public.invitations.company_id IS 'Company the invitation belongs to';
COMMENT ON COLUMN public.invitations.email IS 'Email address of the invited person';
COMMENT ON COLUMN public.invitations.role IS 'Role assigned to the invited person (team_leader, collaborator, admin, user)';
COMMENT ON COLUMN public.invitations.invited_by IS 'User who sent the invitation';
COMMENT ON COLUMN public.invitations.invited_by_name IS 'Name of the user who sent the invitation';
COMMENT ON COLUMN public.invitations.status IS 'Status of the invitation (PENDING, ACCEPTED, DECLINED, EXPIRED)';
COMMENT ON COLUMN public.invitations.token IS 'Unique token for invitation verification';
COMMENT ON COLUMN public.invitations.expires_at IS 'Expiration date of the invitation';
