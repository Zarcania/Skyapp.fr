#!/usr/bin/env python3
"""Test de mise à jour du statut d'un devis"""

from server_supabase import supabase_service
import traceback

quote_id = "2853e83f-b8c9-4f5f-9419-542a16309c57"

print(f"Test de mise à jour du devis {quote_id}\n")

try:
    # Récupérer le devis actuel
    print("1. Récupération du devis actuel...")
    existing = supabase_service.table("quotes").select("*").eq("id", quote_id).execute()
    if existing.data:
        print(f"   ✅ Devis trouvé: {existing.data[0].get('title', 'Sans titre')} - Status: {existing.data[0].get('status')}")
    else:
        print("   ❌ Devis non trouvé")
        exit(1)
    
    # Essayer de mettre à jour le statut
    print("\n2. Mise à jour du statut à CONVERTED_TO_WORKSITE...")
    update_data = {'status': 'CONVERTED_TO_WORKSITE'}
    response = supabase_service.table("quotes").update(update_data).eq("id", quote_id).execute()
    
    print(f"   Response data: {response.data}")
    print(f"   Response count: {response.count if hasattr(response, 'count') else 'N/A'}")
    
    if response.data and len(response.data) > 0:
        print(f"   ✅ Mise à jour réussie - Nouveau statut: {response.data[0].get('status')}")
    else:
        print("   ⚠️ Mise à jour effectuée mais pas de données retournées")
        # Vérifier la mise à jour
        updated = supabase_service.table("quotes").select("*").eq("id", quote_id).execute()
        if updated.data:
            print(f"   ✅ Statut vérifié: {updated.data[0].get('status')}")
        else:
            print("   ❌ Impossible de vérifier le statut")
    
except Exception as e:
    print(f"\n❌ ERREUR: {e}")
    print(f"\nTraceback complet:")
    traceback.print_exc()
