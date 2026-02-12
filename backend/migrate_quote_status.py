#!/usr/bin/env python3
"""Ajouter le statut CONVERTED_TO_WORKSITE à l'enum quote_status via connexion PostgreSQL"""

import psycopg2
import traceback

print("=== Ajout du statut CONVERTED_TO_WORKSITE ===\n")

# Configuration de connexion Supabase locale
conn_params = {
    'host': 'localhost',
    'port': 54322,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'postgres'
}

try:
    print("1. Connexion à la base de données...")
    conn = psycopg2.connect(**conn_params)
    conn.autocommit = True
    cursor = conn.cursor()
    print("   ✅ Connecté\n")
    
    # Vérifier les valeurs actuelles de l'enum
    print("2. Vérification des valeurs actuelles de l'enum...")
    cursor.execute("""
        SELECT enumlabel 
        FROM pg_enum 
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE pg_type.typname = 'quote_status'
        ORDER BY enumsortorder
    """)
    current_values = [row[0] for row in cursor.fetchall()]
    print(f"   Valeurs actuelles: {', '.join(current_values)}\n")
    
    # Ajouter la nouvelle valeur si elle n'existe pas
    if 'CONVERTED_TO_WORKSITE' in current_values:
        print("   ⚠️ La valeur CONVERTED_TO_WORKSITE existe déjà\n")
    else:
        print("3. Ajout de la valeur CONVERTED_TO_WORKSITE...")
        cursor.execute("ALTER TYPE public.quote_status ADD VALUE 'CONVERTED_TO_WORKSITE'")
        print("   ✅ Valeur ajoutée avec succès!\n")
    
    # Vérifier à nouveau
    print("4. Vérification finale...")
    cursor.execute("""
        SELECT enumlabel 
        FROM pg_enum 
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE pg_type.typname = 'quote_status'
        ORDER BY enumsortorder
    """)
    final_values = [row[0] for row in cursor.fetchall()]
    print(f"   Valeurs finales: {', '.join(final_values)}\n")
    
    cursor.close()
    conn.close()
    
    print("✅ Migration terminée avec succès!")
    
except Exception as e:
    print(f"\n❌ ERREUR: {e}")
    traceback.print_exc()
