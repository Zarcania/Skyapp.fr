"""
Script pour créer la table catalog_products dans Supabase
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.environ['SUPABASE_URL']
supabase_service_key = os.environ.get('SUPABASE_SERVICE_KEY')

if not supabase_service_key:
    print("❌ SUPABASE_SERVICE_KEY manquante")
    exit(1)

supabase: Client = create_client(supabase_url, supabase_service_key)

# SQL pour créer la table catalog_products
create_table_sql = """
CREATE TABLE IF NOT EXISTS catalog_products (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Autre',
    price DECIMAL(10, 2) DEFAULT 0,
    unit TEXT DEFAULT 'unité',
    reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_catalog_products_company ON catalog_products(company_id);
CREATE INDEX IF NOT EXISTS idx_catalog_products_category ON catalog_products(category);

-- RLS (Row Level Security)
ALTER TABLE catalog_products ENABLE ROW LEVEL SECURITY;

-- Politique : Les utilisateurs voient les produits de leur entreprise
CREATE POLICY IF NOT EXISTS "Users can view products from their company" 
ON catalog_products FOR SELECT 
USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Politique : Les utilisateurs peuvent créer des produits pour leur entreprise
CREATE POLICY IF NOT EXISTS "Users can create products for their company" 
ON catalog_products FOR INSERT 
WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Politique : Les utilisateurs peuvent modifier les produits de leur entreprise
CREATE POLICY IF NOT EXISTS "Users can update products from their company" 
ON catalog_products FOR UPDATE 
USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Politique : Les utilisateurs peuvent supprimer les produits de leur entreprise
CREATE POLICY IF NOT EXISTS "Users can delete products from their company" 
ON catalog_products FOR DELETE 
USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));
"""

try:
    print("🚀 Création de la table catalog_products...")
    
    # Note: Supabase n'a pas de méthode directe pour exécuter du SQL
    # Il faut utiliser le dashboard Supabase ou une fonction RPC
    # Pour l'instant, affichons juste le SQL à exécuter
    
    print("\n" + "="*80)
    print("📋 SQL À EXÉCUTER DANS LE DASHBOARD SUPABASE (SQL Editor):")
    print("="*80)
    print(create_table_sql)
    print("="*80)
    print("\n✅ Copiez ce SQL et exécutez-le dans le SQL Editor de Supabase")
    print("   Dashboard → SQL Editor → New Query → Coller le SQL → Run\n")
    
except Exception as e:
    print(f"❌ Erreur: {e}")
