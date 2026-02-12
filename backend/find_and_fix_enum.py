#!/usr/bin/env python3
"""Trouver le bon schéma et ajouter le statut"""

import psycopg2
import traceback

conn = psycopg2.connect(
    host='localhost',
    port=54322,
    database='postgres',
    user='postgres',
    password='postgres'
)
conn.autocommit = True
cursor = conn.cursor()

# Chercher l'enum dans tous les schémas
print("Recherche de l'enum quote_status...\n")
cursor.execute("""
    SELECT n.nspname, t.typname
    FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typname = 'quote_status'
""")
results = cursor.fetchall()
if results:
    for schema, typename in results:
        print(f"Trouvé: {schema}.{typename}")
        
        # Vérifier les valeurs actuelles
        cursor.execute(f"""
            SELECT enumlabel 
            FROM pg_enum 
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
            WHERE pg_type.typname = 'quote_status'
            ORDER BY enumsortorder
        """)
        current_values = [row[0] for row in cursor.fetchall()]
        print(f"Valeurs actuelles: {current_values}\n")
        
        if 'CONVERTED_TO_WORKSITE' not in current_values:
            print(f"Ajout de CONVERTED_TO_WORKSITE à {schema}.{typename}...")
            cursor.execute(f"ALTER TYPE {schema}.{typename} ADD VALUE 'CONVERTED_TO_WORKSITE'")
            print("✅ Ajouté avec succès!\n")
        else:
            print("⚠️ Valeur déjà existante\n")
else:
    print("❌ Enum quote_status non trouvé")

cursor.close()
conn.close()
