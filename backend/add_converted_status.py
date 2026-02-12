#!/usr/bin/env python3
"""Ajouter le statut CONVERTED_TO_WORKSITE à l'enum quote_status"""

from server_supabase import supabase_service
import traceback

print("Ajout du statut CONVERTED_TO_WORKSITE à l'enum quote_status\n")

try:
    # Utiliser une requête SQL directe via Supabase
    sql = "ALTER TYPE public.quote_status ADD VALUE IF NOT EXISTS 'CONVERTED_TO_WORKSITE'"
    
    print(f"Exécution de la requête SQL:\n{sql}\n")
    
    # Note: Supabase ne permet pas toujours d'exécuter des ALTER TYPE via l'API
    # On va donc essayer via une connexion PostgreSQL directe si nécessaire
    
    # Alternative: utiliser psql ou une connexion directe
    print("⚠️ Cette migration doit être exécutée directement dans Supabase Studio ou via psql")
    print("\n📋 Instructions:")
    print("1. Ouvrez Supabase Studio (http://localhost:54323)")
    print("2. Allez dans SQL Editor")
    print("3. Exécutez cette requête:")
    print(f"\n   {sql}\n")
    print("4. Redémarrez l'application")
    
except Exception as e:
    print(f"\n❌ ERREUR: {e}")
    traceback.print_exc()
