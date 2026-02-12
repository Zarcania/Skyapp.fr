#!/usr/bin/env python3
"""Vérifier la structure de la table quotes"""

import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=54322,
    database='postgres',
    user='postgres',
    password='postgres'
)
cursor = conn.cursor()

print("=== Structure de la table quotes ===\n")

# Trouver dans quel schéma se trouve la table quotes
cursor.execute("""
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_name = 'quotes'
""")
tables = cursor.fetchall()
print(f"Tables trouvées: {tables}\n")

for schema, table in tables:
    print(f"\n--- {schema}.{table} ---")
    
    # Informations sur la colonne status
    cursor.execute(f"""
        SELECT column_name, data_type, udt_name, column_default
        FROM information_schema.columns 
        WHERE table_schema = '{schema}' 
        AND table_name = '{table}' 
        AND column_name = 'status'
    """)
    col_info = cursor.fetchall()
    if col_info:
        print(f"Colonne status: {col_info}")
        
        # Chercher les contraintes CHECK
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
            print(f"\nContraintes CHECK sur status:")
            for name, definition in checks:
                print(f"  {name}: {definition}")

cursor.close()
conn.close()
