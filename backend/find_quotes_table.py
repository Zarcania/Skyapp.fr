#!/usr/bin/env python3
"""Vérifier si quotes est une vue et trouver la table sous-jacente"""

import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=54322,
    database='postgres',
    user='postgres',
    password='postgres'
)
cursor = conn.cursor()

print("=== Recherche de quotes ===\n")

# Chercher dans les vues
print("1. Vérification des vues...")
cursor.execute("""
    SELECT table_schema, table_name, view_definition
    FROM information_schema.views 
    WHERE table_name = 'quotes'
""")
views = cursor.fetchall()
if views:
    for schema, name, definition in views:
        print(f"Vue trouvée: {schema}.{name}")
        print(f"Définition: {definition[:200]}...\n")

# Chercher toutes les tables qui ressemblent à quotes
print("2. Recherche de tables similaires...")
cursor.execute("""
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_name LIKE '%quote%'
    AND table_type = 'BASE TABLE'
""")
tables = cursor.fetchall()
if tables:
    for schema, table in tables:
        print(f"Table: {schema}.{table}")
        
        # Info sur la colonne status
        cursor.execute(f"""
            SELECT column_name, data_type, udt_name
            FROM information_schema.columns 
            WHERE table_schema = '{schema}' 
            AND table_name = '{table}' 
            AND column_name = 'status'
        """)
        status_col = cursor.fetchall()
        if status_col:
            print(f"  - Colonne status: {status_col[0]}")
            
            # Chercher les CHECK constraints
            cursor.execute(f"""
                SELECT con.conname, pg_get_constraintdef(con.oid) 
                FROM pg_constraint con
                JOIN pg_class rel ON rel.oid = con.conrelid
                JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                WHERE nsp.nspname = '{schema}'
                AND rel.relname = '{table}'
                AND con.contype = 'c'
                AND pg_get_constraintdef(con.oid) LIKE '%status%'
            """)
            checks = cursor.fetchall()
            if checks:
                for name, definition in checks:
                    print(f"  - CHECK: {definition}")
        print()

cursor.close()
conn.close()
