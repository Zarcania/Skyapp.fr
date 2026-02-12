# ⚠️ ACTION REQUISE : Exécuter la migration SQL

## 🚨 Erreur actuelle
```
GET http://localhost:8001/api/projects? 500 (Internal Server Error)
```

Cette erreur indique que les tables `projects` et `project_notes` **n'existent pas encore** dans votre base de données Supabase.

## ✅ Solution : Exécuter la migration SQL

### **Étape 1 : Ouvrir Supabase Dashboard**
1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet **ubggnkcbkjcjqjdyuodh**
3. Cliquez sur **SQL Editor** dans le menu de gauche

### **Étape 2 : Copier la migration**
1. Ouvrez le fichier `supabase/migrations/add_projects_hub.sql`
2. **OU** copiez le SQL ci-dessous :

```sql
-- =====================================================
-- MIGRATION: Système "Mon Entreprise" - Hub Central
-- =====================================================

-- Table PROJECTS
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    search_id UUID REFERENCES searches(id) ON DELETE SET NULL,
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    worksite_id UUID REFERENCES worksites(id) ON DELETE SET NULL,
    report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'RECHERCHE' NOT NULL,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    estimated_value DECIMAL(15,2),
    final_value DECIMAL(15,2),
    start_date DATE,
    end_date DATE,
    expected_duration_days INTEGER,
    tags TEXT[] DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    archived_at TIMESTAMP,
    archived_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_number ON projects(project_number);
CREATE INDEX idx_projects_dates ON projects(start_date, end_date);
CREATE INDEX idx_projects_priority ON projects(priority);
CREATE INDEX idx_projects_search ON projects(search_id);
CREATE INDEX idx_projects_quote ON projects(quote_id);
CREATE INDEX idx_projects_worksite ON projects(worksite_id);
CREATE INDEX idx_projects_created ON projects(created_at DESC);

-- Séquence et fonction pour numérotation automatique
CREATE SEQUENCE IF NOT EXISTS project_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.project_number IS NULL OR NEW.project_number = '' THEN
        NEW.project_number := 'PRJ-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
                              LPAD(nextval('project_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_project_number
    BEFORE INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION generate_project_number();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Table PROJECT_NOTES
CREATE TABLE IF NOT EXISTS project_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'COMMENT' CHECK (note_type IN ('COMMENT', 'STATUS_CHANGE', 'MILESTONE', 'WARNING')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_project_notes_project ON project_notes(project_id);
CREATE INDEX idx_project_notes_created ON project_notes(created_at DESC);

-- RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;

-- Policies PROJECTS
CREATE POLICY projects_select ON projects FOR SELECT
    USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY projects_insert ON projects FOR INSERT
    WITH CHECK (
        company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'BUREAU'))
    );

CREATE POLICY projects_update ON projects FOR UPDATE
    USING (
        company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'BUREAU'))
    );

CREATE POLICY projects_delete ON projects FOR DELETE
    USING (
        company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- Policies PROJECT_NOTES
CREATE POLICY project_notes_select ON project_notes FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY project_notes_insert ON project_notes FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT id FROM projects 
            WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY project_notes_update ON project_notes FOR UPDATE
    USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'BUREAU'))
    );

CREATE POLICY project_notes_delete ON project_notes FOR DELETE
    USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
    );
```

### **Étape 3 : Exécuter**
1. Collez le SQL dans le SQL Editor
2. Cliquez sur **"Run"** (bouton en bas à droite)
3. Attendez le message de succès ✅

### **Étape 4 : Vérifier**
Dans le SQL Editor, exécutez :
```sql
SELECT * FROM projects LIMIT 1;
SELECT * FROM project_notes LIMIT 1;
```

Si ça fonctionne, les tables sont créées ! 🎉

### **Étape 5 : Rafraîchir l'application**
1. Rechargez http://localhost:3002 (F5)
2. L'erreur devrait disparaître
3. "Mon Entreprise" devrait fonctionner

---

## 📝 Note importante
**Sans cette migration, l'application ne peut pas fonctionner !**
Les endpoints `/api/projects` essaient d'accéder à des tables qui n'existent pas encore.
