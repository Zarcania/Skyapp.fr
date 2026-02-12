// Composant Gestion des Équipes - Drag & Drop Simple - Mobile Optimisé
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserMinus, AlertCircle, Trash2 } from 'lucide-react';

const API = process.env.REACT_APP_API_BASE_URL || `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'}/api`;

const TeamManagementDragDrop = ({ activeTab }) => {
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [unassignedCollaborators, setUnassignedCollaborators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draggedCollaborator, setDraggedCollaborator] = useState(null);
  const [selectedCollaborator, setSelectedCollaborator] = useState(null);
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  // Recharger automatiquement quand l'onglet devient actif
  useEffect(() => {
    if (activeTab === 'teams') {
      loadData();
    }
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 [TeamManagementDragDrop] Chargement des données...');
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Charger chefs d'équipe avec stats + tous les utilisateurs
      console.log('📡 [TeamManagementDragDrop] Appel API team-leaders-stats + users');
      const [leadersRes, usersRes] = await Promise.all([
        axios.get(`${API}/team-leaders-stats`, { headers }),
        axios.get(`${API}/users`, { headers }).catch(() => ({ data: [] }))
      ]);

      const leaders = leadersRes.data || [];
      console.log('👥 [TeamManagementDragDrop] Chefs d\'équipe reçus:', leaders.length, leaders);
      setTeamLeaders(leaders);
      
      // Filtrer collaborateurs (TECHNICIEN, BUREAU et ADMIN avec company_id)
      // Exclure le compte fondateur (sans company_id)
      const technicians = (usersRes.data || []).filter(u => 
        (u.role === 'TECHNICIEN' || u.role === 'ADMIN' || u.role === 'BUREAU') && u.company_id
      );
      console.log('🔧 [TeamManagementDragDrop] Collaborateurs totaux (TECHNICIEN + BUREAU + ADMIN):', technicians.length, technicians);
      
      const allAssignedIds = leaders.flatMap(tl => 
        (tl.collaborators || []).map(c => c.id)
      );
      console.log('📌 [TeamManagementDragDrop] IDs déjà assignés:', allAssignedIds);
      
      const unassigned = technicians.filter(t => !allAssignedIds.includes(t.id));
      console.log('✅ [TeamManagementDragDrop] Techniciens NON assignés:', unassigned.length, unassigned);
      setUnassignedCollaborators(unassigned);
      
      setLoading(false);
    } catch (error) {
      console.error('❌ [TeamManagementDragDrop] Erreur chargement:', error);
      setLoading(false);
    }
  };

  const handleDragStart = (e, collaborator) => {
    console.log('🖱️ [TeamManagementDragDrop] Début drag:', collaborator);
    setDraggedCollaborator(collaborator);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, teamLeader) => {
    e.preventDefault();
    console.log('📥 [TeamManagementDragDrop] Drop sur chef:', teamLeader.name || teamLeader.first_name);
    console.log('📥 [TeamManagementDragDrop] Collaborateur:', draggedCollaborator);
    
    if (!draggedCollaborator) {
      console.warn('⚠️ [TeamManagementDragDrop] Aucun collaborateur en drag');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      console.log('📤 [TeamManagementDragDrop] Envoi assignation:', {
        team_leader_id: teamLeader.id,
        collaborator_id: draggedCollaborator.id
      });

      const response = await axios.post(`${API}/team-leaders/assign`, {
        team_leader_id: teamLeader.id,
        collaborator_id: draggedCollaborator.id,
        notes: ''
      }, { headers });

      console.log('✅ [TeamManagementDragDrop] Assignation réussie:', response.data);
      
      // Mise à jour optimiste de l'état local au lieu de recharger
      setTeamLeaders(prevLeaders => 
        prevLeaders.map(leader => {
          if (leader.id === teamLeader.id) {
            return {
              ...leader,
              collaborators: [...(leader.collaborators || []), draggedCollaborator],
              stats: {
                ...leader.stats,
                active_members: (leader.stats?.active_members || 0) + 1,
                total_members: (leader.stats?.total_members || 0) + 1
              }
            };
          }
          return leader;
        })
      );
      
      setUnassignedCollaborators(prev => 
        prev.filter(c => c.id !== draggedCollaborator.id)
      );
      
      setDraggedCollaborator(null);
    } catch (error) {
      console.error('❌ [TeamManagementDragDrop] Erreur assignation:', error);
      console.error('❌ [TeamManagementDragDrop] Détails:', error.response?.data);
      if (error.response?.status === 400 && error.response?.data?.detail?.includes('Maximum 10')) {
        alert('⚠️ Maximum 10 collaborateurs par chef d\'équipe atteint');
      } else {
        alert('❌ Erreur lors de l\'assignation: ' + (error.response?.data?.detail || error.message));
      }
      setDraggedCollaborator(null);
    }
  };

  const handleRemoveCollaborator = async (teamLeaderId, collaboratorId) => {
    console.log('🗑️ [TeamManagementDragDrop] Demande suppression:', { teamLeaderId, collaboratorId });
    if (!window.confirm('Retirer ce collaborateur de l\'équipe?')) return;

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      console.log('📤 [TeamManagementDragDrop] Envoi DELETE');
      await axios.delete(`${API}/team-leaders/${teamLeaderId}/collaborators/${collaboratorId}`, { headers });
      console.log('✅ [TeamManagementDragDrop] Suppression réussie');
      
      // Récupérer le collaborateur à retirer pour le remettre dans les non assignés
      const teamLeader = teamLeaders.find(tl => tl.id === teamLeaderId);
      const removedCollaborator = teamLeader?.collaborators?.find(c => c.id === collaboratorId);
      
      // Mise à jour optimiste de l'état local
      setTeamLeaders(prevLeaders => 
        prevLeaders.map(leader => {
          if (leader.id === teamLeaderId) {
            return {
              ...leader,
              collaborators: (leader.collaborators || []).filter(c => c.id !== collaboratorId),
              stats: {
                ...leader.stats,
                active_members: Math.max(0, (leader.stats?.active_members || 0) - 1),
                total_members: Math.max(0, (leader.stats?.total_members || 0) - 1)
              }
            };
          }
          return leader;
        })
      );
      
      // Remettre le collaborateur dans la liste des non assignés
      if (removedCollaborator) {
        setUnassignedCollaborators(prev => [...prev, removedCollaborator]);
      }
    } catch (error) {
      console.error('❌ [TeamManagementDragDrop] Erreur suppression:', error);
      alert('❌ Erreur lors de la suppression: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleLongPressStart = (collaborator) => {
    const timer = setTimeout(() => {
      // Vibration si supportée
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      setSelectedCollaborator(collaborator);
      setShowTeamSelector(true);
    }, 500); // 500ms de long press
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleQuickAssign = (collaborator) => {
    // Sur mobile, clic simple ouvre le sélecteur
    setSelectedCollaborator(collaborator);
    setShowTeamSelector(true);
  };

  const handleAssignToTeam = async (teamLeader) => {
    if (!selectedCollaborator) return;

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`${API}/team-leaders/assign`, {
        team_leader_id: teamLeader.id,
        collaborator_id: selectedCollaborator.id,
        notes: ''
      }, { headers });

      // Mise à jour optimiste
      setTeamLeaders(prevLeaders => 
        prevLeaders.map(leader => {
          if (leader.id === teamLeader.id) {
            return {
              ...leader,
              collaborators: [...(leader.collaborators || []), selectedCollaborator],
              stats: {
                ...leader.stats,
                active_members: (leader.stats?.active_members || 0) + 1,
                total_members: (leader.stats?.total_members || 0) + 1
              }
            };
          }
          return leader;
        })
      );
      
      setUnassignedCollaborators(prev => 
        prev.filter(c => c.id !== selectedCollaborator.id)
      );
      
      setShowTeamSelector(false);
      setSelectedCollaborator(null);
      
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
    } catch (error) {
      console.error('❌ Erreur assignation:', error);
      if (error.response?.status === 400 && error.response?.data?.detail?.includes('Maximum 10')) {
        alert('⚠️ Maximum 10 collaborateurs par chef d\'équipe atteint');
      } else {
        alert('❌ Erreur lors de l\'assignation');
      }
    }
  };

  const handleDeleteTeamLeader = async (teamLeaderId) => {
    console.log('🗑️ [TeamManagementDragDrop] Supprimer chef d\'équipe:', teamLeaderId);
    
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce chef d\'équipe ? Tous ses collaborateurs seront désassignés.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      console.log('📤 [TeamManagementDragDrop] DELETE /team-leaders/' + teamLeaderId);
      await axios.delete(`${API}/team-leaders/${teamLeaderId}`, { headers });
      
      console.log('✅ [TeamManagementDragDrop] Chef d\'équipe supprimé avec succès');
      
      // Récupérer les collaborateurs du chef supprimé pour les remettre en non assignés
      const deletedLeader = teamLeaders.find(tl => tl.id === teamLeaderId);
      const collaboratorsToUnassign = deletedLeader?.collaborators || [];
      
      // Mise à jour optimiste de l'état local
      setTeamLeaders(prevLeaders => prevLeaders.filter(leader => leader.id !== teamLeaderId));
      setUnassignedCollaborators(prev => [...prev, ...collaboratorsToUnassign]);
      
      alert('✅ Chef d\'équipe supprimé avec succès');
    } catch (error) {
      console.error('❌ [TeamManagementDragDrop] Erreur lors de la suppression:', error);
      alert('❌ Erreur lors de la suppression du chef d\'équipe: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-black border-r-gray-600 animate-spin"></div>
          </div>
          <p className="text-lg font-bold text-gray-900">
            Chargement des équipes...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6 lg:mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-black rounded-xl sm:rounded-2xl shadow-lg mb-3 sm:mb-4">
          <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </div>
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-2">
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
            Gestion des Équipes
          </h1>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 sm:p-2 rounded-lg bg-white hover:bg-gray-100 border border-gray-300 shadow-sm transition-all disabled:opacity-50"
            title="Rafraîchir les données"
          >
            <svg className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-700 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base lg:text-lg hidden sm:block">Glissez-déposez les collaborateurs vers les chefs d'équipe</p>
        <p className="text-gray-600 mt-1 text-xs sm:hidden">Gérez vos équipes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 max-w-7xl mx-auto">
        {/* GAUCHE: Chefs d'équipe */}
        <div className="lg:col-span-8 space-y-3 sm:space-y-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border-2 border-gray-200">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-900 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Users className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="flex-1">Chefs d'Équipe</span>
              <span className="text-xs sm:text-sm font-normal bg-gray-100 text-gray-800 px-2 sm:px-3 py-1 rounded-full border border-gray-300">
                {teamLeaders.length} équipe{teamLeaders.length !== 1 ? 's' : ''}
              </span>
            </h2>

            {teamLeaders.length === 0 ? (
              <div className="text-center py-12 sm:py-16">
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 border-2 border-gray-300">
                  <Users className="w-8 h-8 sm:w-12 sm:h-12 text-gray-500" />
                </div>
                <p className="text-gray-700 text-base sm:text-lg font-semibold">Aucun chef d'équipe</p>
                <p className="text-gray-500 text-xs sm:text-sm mt-1">Créez des chefs d'équipe pour commencer</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {teamLeaders.map(leader => {
                  const count = leader.collaborators_count || 0;
                  const isMax = count >= 10;
                  const fillPercentage = Math.min((count / 10) * 100, 100);

                  return (
                    <div
                      key={leader.id}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, leader)}
                      className={`relative overflow-hidden border-2 border-dashed rounded-xl sm:rounded-2xl p-3 sm:p-5 transition-all duration-300 shadow-sm hover:shadow-lg ${
                        isMax 
                          ? 'bg-gray-100 border-gray-400 hover:border-gray-600' 
                          : 'bg-white border-gray-300 hover:border-gray-900 hover:scale-[1.01]'
                      }`}
                    >
                      {/* Barre de progression en arrière-plan */}
                      <div 
                        className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                          isMax ? 'bg-gray-300/30' : 'bg-gray-200/30'
                        }`}
                        style={{ width: `${fillPercentage}%` }}
                      />

                      {/* En-tête chef */}
                      <div className="relative flex items-center justify-between mb-3 sm:mb-4">
                        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                          <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-bold text-sm sm:text-lg shadow-md flex-shrink-0 ${
                            isMax ? 'bg-gray-600' : 'bg-black'
                          }`}>
                            {leader.first_name?.[0]}{leader.last_name?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-sm sm:text-lg truncate">
                              {`${leader.first_name || ''} ${leader.last_name || ''}`.trim() || leader.name || "Chef d'équipe"}
                            </h3>
                            <div className="flex items-center gap-2 sm:gap-3 mt-1">
                              <p className="text-xs sm:text-sm text-gray-600 font-medium whitespace-nowrap">
                                {count} / 10
                              </p>
                              {/* Barre de progression mini */}
                              <div className="w-16 sm:w-24 h-1.5 sm:h-2 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                                <div 
                                  className={`h-full transition-all duration-500 ${
                                    isMax ? 'bg-gray-600' : 'bg-black'
                                  }`}
                                  style={{ width: `${fillPercentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          {isMax && (
                            <div className="flex items-center gap-1 sm:gap-2 bg-gray-200 text-gray-900 text-xs sm:text-sm font-bold px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl border-2 border-gray-400">
                              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                              <span className="hidden sm:inline">Complet</span>
                            </div>
                          )}
                          <button
                            onClick={() => handleDeleteTeamLeader(leader.id)}
                            className="p-1.5 sm:p-2 hover:bg-red-100 rounded-lg text-red-600 transition-all duration-200"
                            title="Supprimer ce chef d'équipe"
                          >
                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Liste collaborateurs */}
                      {(leader.collaborators || []).length > 0 && (
                        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                          {leader.collaborators.map(collab => (
                            <div
                              key={collab.id}
                              className="group flex items-center justify-between bg-white p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 border-gray-300 hover:border-black shadow-sm hover:shadow-md transition-all duration-200"
                            >
                              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-800 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                                  {collab.first_name?.[0]}{collab.last_name?.[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                                    {collab.first_name} {collab.last_name}
                                  </p>
                                  {collab.role === 'ADMIN' && (
                                    <span className="inline-block text-xs bg-gray-200 text-gray-900 px-1.5 sm:px-2 py-0.5 rounded-full font-bold border border-gray-400 mt-0.5">
                                      ADMIN
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveCollaborator(leader.id, collab.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 sm:p-2 hover:bg-gray-200 rounded-lg text-gray-900 transition-all duration-200 transform group-hover:scale-110 flex-shrink-0"
                                title="Retirer de l'équipe"
                              >
                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Zone de drop vide */}
                      {(leader.collaborators || []).length === 0 && (
                        <div className="relative text-center py-6 sm:py-8">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-3 border-2 border-gray-300">
                            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" />
                          </div>
                          <p className="text-gray-500 text-xs sm:text-sm font-medium">Glissez un collaborateur ici</p>
                          <p className="text-gray-400 text-xs mt-1 hidden sm:block">Drag & Drop pour assigner</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* DROITE: Collaborateurs non assignés */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:sticky lg:top-6 border-2 border-gray-200">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-900 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Users className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <h2 className="text-base sm:text-xl font-bold text-gray-900">
                Non Assignés
              </h2>
            </div>

            {unassignedCollaborators.length === 0 ? (
              <div className="text-center py-12 sm:py-16">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 border-2 border-gray-300">
                  <span className="text-3xl sm:text-4xl">✅</span>
                </div>
                <p className="text-gray-700 text-sm sm:text-base font-semibold">Tout est assigné !</p>
                <p className="text-gray-500 text-xs sm:text-sm mt-1">Tous les collaborateurs ont une équipe</p>
              </div>
            ) : (
              <div>
                <div className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3 bg-gray-100 border-2 border-gray-400 p-2.5 sm:p-3 rounded-lg sm:rounded-xl">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-900 font-bold text-xs sm:text-sm">
                      {unassignedCollaborators.length} collaborateur{unassignedCollaborators.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-gray-600 text-xs">À assigner à une équipe</p>
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3 max-h-[400px] sm:max-h-[500px] overflow-y-auto pr-2 pt-2 custom-scrollbar">
                  {unassignedCollaborators.map(collab => (
                    <div
                      key={collab.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, collab)}
                      onClick={() => handleQuickAssign(collab)}
                      onTouchStart={() => handleLongPressStart(collab)}
                      onTouchEnd={handleLongPressEnd}
                      onTouchCancel={handleLongPressEnd}
                      className="group relative p-3 sm:p-4 bg-white border-2 border-gray-400 rounded-lg sm:rounded-xl cursor-pointer hover:bg-gray-50 hover:border-black hover:shadow-xl hover:-translate-y-1 transition-all duration-200 active:scale-95"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-800 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {collab.first_name?.[0]}{collab.last_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm sm:text-base text-gray-900 truncate">
                            {collab.first_name} {collab.last_name}
                          </p>
                          {/* Afficher téléphone si c'est un utilisateur normal, sinon email */}
                          {collab.email && collab.email.includes('@temp-skyapp.local') ? (
                            <p className="text-xs text-gray-600 truncate">{collab.phone || 'Pas de téléphone'}</p>
                          ) : (
                            <p className="text-xs text-gray-600 truncate">{collab.email}</p>
                          )}
                          {collab.role === 'ADMIN' && (
                            <span className="inline-block text-xs bg-gray-200 text-gray-900 px-1.5 sm:px-2 py-0.5 rounded-full font-bold border border-gray-400 mt-1">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <div className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 sm:mt-5 p-3 sm:p-4 bg-gray-100 rounded-lg sm:rounded-xl border-2 border-gray-300">
                  <div className="flex gap-2 sm:gap-3">
                    <span className="text-xl sm:text-2xl">💡</span>
                    <div className="flex-1">
                      <p className="text-gray-900 font-bold text-xs sm:text-sm">Astuce</p>
                      <p className="text-gray-700 text-xs mt-1 hidden sm:block">
                        Glissez et déposez un collaborateur sur une carte d'équipe à gauche
                      </p>
                      <p className="text-gray-700 text-xs mt-1 sm:hidden">
                        Cliquez pour assigner à une équipe
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de sélection d'équipe */}
      {showTeamSelector && selectedCollaborator && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
          <div 
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-gray-800 to-gray-900 text-white p-4 sm:p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold">Assigner à une équipe</h3>
                    <p className="text-xs sm:text-sm text-gray-300 mt-0.5">
                      {selectedCollaborator.first_name} {selectedCollaborator.last_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowTeamSelector(false);
                    setSelectedCollaborator(null);
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Liste des équipes */}
            <div className="p-4 sm:p-6 space-y-3">
              {teamLeaders.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-600 font-medium">Aucune équipe disponible</p>
                  <p className="text-gray-500 text-sm mt-1">Créez d'abord un chef d'équipe</p>
                </div>
              ) : (
                teamLeaders.map(leader => {
                  const count = leader.collaborators_count || 0;
                  const isMax = count >= 10;
                  
                  return (
                    <button
                      key={leader.id}
                      onClick={() => handleAssignToTeam(leader)}
                      disabled={isMax}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        isMax
                          ? 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed'
                          : 'bg-white border-gray-300 hover:border-black hover:shadow-lg active:scale-95'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-md ${
                          isMax ? 'bg-gray-600' : 'bg-black'
                        }`}>
                          {leader.first_name?.[0]}{leader.last_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 truncate">
                            {`${leader.first_name || ''} ${leader.last_name || ''}`.trim() || leader.name || "Chef d'équipe"}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-gray-600">
                              {count} / 10 collaborateurs
                            </p>
                            {isMax && (
                              <span className="text-xs bg-gray-200 text-gray-900 px-2 py-0.5 rounded-full font-bold">
                                Complet
                              </span>
                            )}
                          </div>
                        </div>
                        {!isMax && (
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowTeamSelector(false);
                  setSelectedCollaborator(null);
                }}
                className="w-full py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-xl transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default TeamManagementDragDrop;
