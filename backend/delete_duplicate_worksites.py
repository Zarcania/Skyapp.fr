#!/usr/bin/env python3
"""Script pour supprimer les chantiers en double"""

from server_supabase import supabase_service

# Rechercher les chantiers "Chantier sans titre"
result = supabase_service.table('worksites').select('id, title, client_name, amount, created_at').eq('title', 'Chantier sans titre').order('created_at', desc=False).execute()

print(f"\n=== Chantiers trouvés: {len(result.data)} ===\n")

if result.data:
    for i, worksite in enumerate(result.data, 1):
        print(f"{i}. ID: {worksite['id']}")
        print(f"   Titre: {worksite.get('title', 'N/A')}")
        print(f"   Client: {worksite.get('client_name', 'N/A')}")
        print(f"   Montant: {worksite.get('amount', 0)}€")
        print(f"   Créé: {worksite.get('created_at', 'N/A')}")
        print()
    
    # Supprimer tous les chantiers "Chantier sans titre"
    confirmation = input(f"\nVoulez-vous supprimer ces {len(result.data)} chantier(s)? (oui/non): ")
    
    if confirmation.lower() in ['oui', 'o', 'yes', 'y']:
        for worksite in result.data:
            try:
                supabase_service.table('worksites').delete().eq('id', worksite['id']).execute()
                print(f"✅ Supprimé: {worksite['id']} - {worksite.get('title', 'N/A')}")
            except Exception as e:
                print(f"❌ Erreur lors de la suppression de {worksite['id']}: {e}")
        
        print(f"\n✅ {len(result.data)} chantier(s) supprimé(s) avec succès!")
    else:
        print("\n❌ Suppression annulée.")
else:
    print("Aucun chantier 'Chantier sans titre' trouvé.")
