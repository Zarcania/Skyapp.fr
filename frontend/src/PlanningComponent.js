// Composant Planning Management - Version Mobile Optimisée
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Calendar, 
  UserPlus, 
  Users, 
  Edit, 
  Trash2, 
  X, 
  Clock,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Mail
} from 'lucide-react';
import TeamManagementDragDrop from './TeamManagementDragDrop';

// Resolve API base URL consistently with App.js to avoid missing "/api" prefix
// Prefer REACT_APP_BACKEND_URL for host; if REACT_APP_API_BASE_URL is set, use it directly
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = process.env.REACT_APP_API_BASE_URL || `${BACKEND_URL}/api`;

// Simple UI Components
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg border ${className}`}>
    {children}
  </div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={`p-4 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children, className = "" }) => (
  <div className={`px-4 pt-4 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children, className = "" }) => (
  <h3 className={`text-lg font-semibold ${className}`}>
    {children}
  </h3>
);

const Button = ({ children, onClick, variant = "default", size = "default", className = "", disabled = false, ...props }) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500",
    ghost: "text-gray-700 hover:bg-gray-100 focus:ring-blue-500"
  };
  
  const sizes = {
    sm: "text-sm px-3 py-1.5",
    default: "text-sm px-4 py-2",
    lg: "text-base px-6 py-3"
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ className = "", ...props }) => (
  <input
    className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
);

const Badge = ({ children, className = "" }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
    {children}
  </span>
);

// Planning Management Component - Complete Team and Schedule Management
const PlanningManagement = () => {
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [worksites, setWorksites] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [acceptedInvites, setAcceptedInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('planning');
  const [showTeamLeaderForm, setShowTeamLeaderForm] = useState(false);
  const [showCollaboratorForm, setShowCollaboratorForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // États pour l'édition
  const [editingCollaborator, setEditingCollaborator] = useState(null);
  const [showEditCollaboratorModal, setShowEditCollaboratorModal] = useState(false);
  const [editCollaboratorData, setEditCollaboratorData] = useState({
    first_name: '',
    last_name: '',
    phone: ''
  });
  
  // Vue temporelle - nouveau
  const [viewMode, setViewMode] = useState('timeline'); // 'day', 'week', 'month', 'timeline'
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // NEW: Enhanced day detail modal state
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [detailedDate, setDetailedDate] = useState(null);

  // Modal détails du créneau
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showScheduleDetail, setShowScheduleDetail] = useState(false);
  
  // Modal d'édition du créneau
  const [showEditScheduleModal, setShowEditScheduleModal] = useState(false);
  const [editScheduleData, setEditScheduleData] = useState({
    start_date: '',
    end_date: '',
    team_leader_id: '',
    collaborator_id: ''
  });

  // Modal de planification de chantier
  const [showPlanningModal, setShowPlanningModal] = useState(false);
  const [selectedWorksiteForPlanning, setSelectedWorksiteForPlanning] = useState(null);
  const [planningData, setPlanningData] = useState({
    team_leader_id: '',
    collaborator_ids: [],
    start_date: '',
    end_date: '',
    notes: '',
    shift_type: 'day' // Nouveau champ pour le type d'intervention
  });
  const [collaboratorSearch, setCollaboratorSearch] = useState('');
  
  // Stocker les collaborateurs par chef d'équipe
  const [teamCollaborators, setTeamCollaborators] = useState({}); // { teamLeaderId: [collaborators] }

  // État pour sélectionner un technicien existant comme chef d'équipe
  const [selectedExistingUser, setSelectedExistingUser] = useState(null);
  
  // Form states
  const [teamLeaderData, setTeamLeaderData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    specialite: '',
    couleur: '#3B82F6'
  });
  
  const [collaboratorData, setCollaboratorData] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    competences: '',
    team_leader_id: ''
  });
  
  const [scheduleData, setScheduleData] = useState({
    intervention_category: 'rdv', // 'rdv', 'worksite', ou 'urgence'
    worksite_id: '',
    client_name: '',
    client_address: '',
    client_contact: '',
    team_leader_id: '',
    collaborator_id: '',
    additional_collaborators: [], // Pour ajouter plusieurs collaborateurs
    date: selectedDate,
    time: '08:00', // Heure de début
    shift: 'day', // day, night, morning, afternoon
    hours: '8',
    description: ''
  });

  const SHIFT_OPTIONS = [
    { value: 'day', label: 'Journée complète (8h)', hours: 8 },
    { value: 'morning', label: 'Matinée (4h)', hours: 4 },
    { value: 'afternoon', label: 'Après-midi (4h)', hours: 4 },
    { value: 'night', label: 'Nuit (8h)', hours: 8 }
  ];

  const SPECIALTIES = [
    'Détection de réseaux',
    'Géolocalisation',
    'Travaux publics',
    'Électricité',
    'Plomberie',
    'Maçonnerie',
    'Supervision'
  ];

  const COLORS = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#F97316', '#EC4899', '#06B6D4'
  ];

  useEffect(() => {
    loadPlanningData();
    
    // Vérifier si on doit ouvrir le modal de planification depuis les params URL
    const urlParams = new URLSearchParams(window.location.search);
    const worksiteId = urlParams.get('worksite');
    const action = urlParams.get('action');
    
    if (action === 'plan' && worksiteId) {
      // Charger le chantier et ouvrir le modal
      loadWorksiteAndOpenModal(worksiteId);
    }
  }, []);

  const loadWorksiteAndOpenModal = async (worksiteId) => {
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      const response = await axios.get(`${API}/worksites/${worksiteId}`, { headers });
      const worksite = response.data;
      
      setSelectedWorksiteForPlanning(worksite);
      setPlanningData({
        team_leader_id: '',
        collaborator_ids: [],
        start_date: worksite.start_date || '',
        end_date: worksite.end_date || '',
        notes: '',
        shift_type: 'day'
      });
      setShowPlanningModal(true);
      
      // Nettoyer l'URL
      window.history.replaceState({}, '', window.location.pathname);
    } catch (error) {
      console.error('Erreur chargement chantier:', error);
    }
  };

  const loadPlanningData = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Charger les chantiers existants
      const worksitesRes = await axios.get(`${API}/worksites`, { headers });
      setWorksites(worksitesRes.data || []);
      
      // Charger les chefs d'équipe depuis la table planning_team_leaders avec noms à jour
      try {
        const leadersRes = await axios.get(`${API}/team-leaders-stats`, { headers });
        // Transformer les données de l'API
        const transformedLeaders = (leadersRes.data || []).map((leader) => {
          return {
            id: leader.id,
            nom: leader.last_name || 'Nom',
            prenom: leader.first_name || 'Prénom',
            email: leader.email || (leader.is_virtual ? '-' : 'Non renseigné'),
            telephone: leader.phone || '-',
            specialite: leader.specialty || 'Chef d\'équipe',
            couleur: leader.color || '#3B82F6',
            created_at: leader.created_at,
            is_virtual: leader.is_virtual,
            user_id: leader.user_id,
            collaborators: leader.collaborators || []  // Ajouter les collaborateurs
          };
        });
        
        setTeamLeaders(transformedLeaders);
        
        // Charger les collaborateurs pour chaque chef d'équipe
        const teamCollabsMap = {};
        for (const leader of transformedLeaders) {
          // Les collaborateurs sont déjà dans leader.collaborators grâce à team-leaders-stats
          teamCollabsMap[leader.id] = leader.collaborators || [];
          console.log(`👥 Collaborateurs pour ${leader.prenom} ${leader.nom}:`, teamCollabsMap[leader.id]);
        }
        setTeamCollaborators(teamCollabsMap);
        console.log('👥 Carte des collaborateurs par chef:', teamCollabsMap);
      } catch (error) {
        console.error('Erreur chargement team-leaders:', error);
        setTeamLeaders([]);
        setTeamCollaborators({});
      }

      // Charger les collaborateurs (tous les utilisateurs sauf FONDATEUR)
      try {
        const usersRes = await axios.get(`${API}/users`, { headers });
        // Filtrer tous les utilisateurs sauf FONDATEUR (inclure BUREAU, TECHNICIEN, ADMIN)
        const collaborateurs = (usersRes.data || []).filter(u => 
          u.role !== 'FONDATEUR'
        );
        console.log('👥 Collaborateurs chargés (tous sauf FONDATEUR):', collaborateurs);
        console.log('👥 Nombre de collaborateurs:', collaborateurs.length);
        setCollaborators(collaborateurs);
      } catch (error) {
        console.warn('Endpoint collaborators non disponible, utilisation de données simulées');
        // Données simulées pour les collaborateurs
        setCollaborators([
          {
            id: '1',
            nom: 'Durand',
            prenom: 'Pierre',
            email: 'pierre.durand@skyapp.fr',
            telephone: '06 11 22 33 44',
            competences: 'Assistant détection, Lecture de plans',
            team_leader_id: '1',
            created_at: '2024-01-22'
          },
          {
            id: '2',
            nom: 'Leroux',
            prenom: 'Sophie',
            email: 'sophie.leroux@skyapp.fr',
            telephone: '06 55 66 77 88',
            competences: 'Topographie, GPS',
            team_leader_id: '2',
            created_at: '2024-01-25'
          }
        ]);
      }

      // Charger les invitations acceptées
      await loadAcceptedInvitations();

      // Charger les plannings
      try {
        const schedulesRes = await axios.get(`${API}/schedules`, { headers });
        console.log('📅 Schedules chargés:', schedulesRes.data);
        if (schedulesRes.data && schedulesRes.data.length > 0) {
          console.log('📋 Total schedules:', schedulesRes.data.length);
          // Grouper par chantier pour debug
          const byWorksite = {};
          schedulesRes.data.forEach(s => {
            const wsId = s.worksite_id || 'sans-chantier';
            if (!byWorksite[wsId]) byWorksite[wsId] = [];
            byWorksite[wsId].push(s);
          });
          console.log('🏗️ Schedules par chantier:', byWorksite);
        }
        setSchedules(schedulesRes.data || []);
      } catch (error) {
        console.warn('Endpoint schedules non disponible, utilisation de données simulées');
        // Données simulées pour les plannings
        setSchedules([
          {
            id: '1',
            worksite_id: '1',
            team_leader_id: '1',
            collaborator_id: '1',
            date: selectedDate,
            time: '09:00',
            shift: 'day',
            hours: 8,
            description: 'Inspection complète du site',
            status: 'scheduled',
            created_at: new Date().toISOString()
          }
        ]);
      }

    } catch (error) {
      console.error('Erreur chargement planning:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAcceptedInvitations = async () => {
    try {
      const token = localStorage.getItem('token');
      
      try {
        const invitationsRes = await axios.get(`${API}/invitations/accepted`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setAcceptedInvites(invitationsRes.data);
      } catch (error) {
        console.error('Erreur chargement invitations acceptées:', error);
        // Sample accepted invitations data
        setAcceptedInvites([
          {
            id: '1',
            firstName: 'Marie',
            lastName: 'Dubois',
            email: 'marie.dubois@example.com',
            phone: '06.12.34.56.78',
            role: 'Technicien BTP',
            skills: 'Maçonnerie, Plomberie',
            accepted_at: '2025-01-10T10:00:00Z',
            usedAsTeamLeader: false,
            usedAsCollaborator: false
          },
          {
            id: '2',
            firstName: 'Pierre',
            lastName: 'Martin',
            email: 'pierre.martin@example.com',
            phone: '06.98.76.54.32',
            role: 'Chef de chantier',
            skills: 'Électricité, Coordination équipe',
            accepted_at: '2025-01-08T14:30:00Z',
            usedAsTeamLeader: false,
            usedAsCollaborator: false
          }
        ]);
      }
      
      // Keep the old invitations data for backward compatibility
      const acceptedInvitations = [
        {
          id: 'inv_manager_bureau',
          email: 'manager@bureau.fr',
          nom: 'Manager',
          prenom: 'Bureau',
          role: 'BUREAU',
          status: 'ACCEPTED',
          specialite: 'Gestion de projet',
          competences: 'Management, Planning, Coordination équipes',
          accepted_at: '2024-01-11T09:15:00Z',
          invited_at: '2024-01-10T14:30:00Z'
        },
        {
          id: 'inv_nouveau_tech',
          email: 'nouveau@technicien.fr',
          nom: 'Nouveau',
          prenom: 'Technicien',
          role: 'TECHNICIEN',
          status: 'ACCEPTED',
          specialite: 'Travaux terrain',
          competences: 'Recherche terrain, Mesures, Diagnostics',
          accepted_at: '2024-01-12T10:45:00Z',
          invited_at: '2024-01-15T10:00:00Z'
        }
      ];
      
      setInvitations(acceptedInvitations.filter(inv => inv.status === 'ACCEPTED'));
      console.log('Invitations acceptées chargées:', acceptedInvitations.length);
    } catch (error) {
      console.error('Erreur chargement invitations:', error);
      setInvitations([]);
      setAcceptedInvites([]);
    }
  };

  // Fonctions utilitaires pour les vues temporelles
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const getWeekDates = (date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Lundi comme premier jour
    startOfWeek.setDate(diff);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);
      weekDates.push(currentDate);
    }
    return weekDates;
  };

  // Grouper les missions multi-jours d'un même chantier pour affichage horizontal étendu
  const getMultiDaySchedulesForMember = (memberSchedules, weekStart) => {
    const grouped = [];
    const processed = new Set();

    memberSchedules.forEach(schedule => {
      if (processed.has(schedule.id)) return;

      // Avec le nouveau système, chaque schedule a start_date et end_date
      const startDate = new Date(schedule.start_date || schedule.date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(schedule.end_date || schedule.date);
      endDate.setHours(0, 0, 0, 0);

      // Calculer la position et la durée du bloc
      const daysDiff = Math.round((startDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
      const daysSpan = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      grouped.push({
        ...schedule,
        columnStart: Math.max(1, Math.min(daysDiff + 1, 7)),
        columnSpan: Math.max(1, Math.min(daysSpan, 8 - (daysDiff + 1))),
        isMultiDay: daysSpan > 1,
        dayCount: daysSpan
      });

      processed.add(schedule.id);
    });

    return grouped;
  };

  const getMonthDates = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Commencer par le lundi de la première semaine
    const startDate = new Date(firstDay);
    const startDay = firstDay.getDay();
    startDate.setDate(firstDay.getDate() - (startDay === 0 ? 6 : startDay - 1));
    
    const monthDates = [];
    const current = new Date(startDate);
    
    while (current <= lastDay || monthDates.length % 7 !== 0) {
      monthDates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return monthDates;
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week' || viewMode === 'timeline') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  // NEW: Enhanced day detail function
  const openDayDetail = (date) => {
    const daySchedules = getSchedulesForDate(date);
    const dayTeams = teamLeaders.filter(leader => {
      // Logic to check if team leader is assigned to this day
      return daySchedules.some(schedule => schedule.team_leader_id === leader.id);
    });
    
    const dayCollaborators = collaborators.filter(collab => {
      // Logic to check if collaborator is assigned to this day
      return daySchedules.some(schedule => schedule.collaborators?.includes(collab.id));
    });

    setSelectedDayData({
      date: date,
      schedules: daySchedules,
      teams: dayTeams,
      collaborators: dayCollaborators,
      totalHours: daySchedules.reduce((sum, schedule) => sum + (parseInt(schedule.hours) || 0), 0),
      availableSlots: 8 - daySchedules.length // Assuming 8 slots per day
    });
    setDetailedDate(date);
    setSelectedDate(date.toISOString().split('T')[0]);
    setShowDayDetail(true);
  };

  const getSchedulesForDate = (date) => {
    // Utiliser les méthodes locales pour éviter les problèmes de timezone
    let dateStr;
    if (typeof date === 'string') {
      dateStr = date;
    } else {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      dateStr = `${year}-${month}-${day}`;
    }
    
    return schedules.filter(schedule => {
      // Avec le nouveau système, vérifier si la date est dans la période
      const startDate = schedule.start_date || schedule.date;
      const endDate = schedule.end_date || schedule.date;
      
      if (!startDate) return false;
      
      // Si pas de end_date, utiliser start_date
      const end = endDate || startDate;
      
      return dateStr >= startDate && dateStr <= end;
    });
  };

  const getDateTitle = () => {
    if (viewMode === 'week' || viewMode === 'timeline') {
      const weekDates = getWeekDates(currentDate);
      const startDate = weekDates[0];
      const endDate = weekDates[6];
      return `Semaine du ${startDate.getDate()}/${startDate.getMonth() + 1} au ${endDate.getDate()}/${endDate.getMonth() + 1}/${endDate.getFullYear()}`;
    } else if (viewMode === 'month') {
      return new Intl.DateTimeFormat('fr-FR', { 
        year: 'numeric', 
        month: 'long' 
      }).format(currentDate);
    }
    return '';
  };

  const addInvitedPersonAsTeamLeader = async (invitation) => {
    const teamLeaderData = {
      nom: invitation.lastName,
      prenom: invitation.firstName,
      email: invitation.email,
      telephone: invitation.phone || '',
      specialite: invitation.skills || 'Généraliste',
      couleur: '#10B981' // Green color for invited persons
    };

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/team-leaders`, teamLeaderData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setTeamLeaders(prev => [...prev, response.data]);
      
      // Mark invitation as used for team leader
      const updatedInvitation = { ...invitation, usedAsTeamLeader: true };
      setAcceptedInvites(prev => prev.map(inv => 
        inv.id === invitation.id ? updatedInvitation : inv
      ));

      alert(`${invitation.firstName} ${invitation.lastName} a été ajouté(e) comme chef d'équipe !`);
    } catch (error) {
      console.error('Erreur ajout chef d\'équipe:', error);
      // Fallback
      const newTeamLeader = {
        id: `invited-${Date.now()}`,
        ...teamLeaderData,
        created_at: new Date().toISOString(),
        fromInvitation: true,
        invitationId: invitation.id
      };

      setTeamLeaders(prev => [...prev, newTeamLeader]);
      
      // Mark invitation as used for team leader
      const updatedInvitation = { ...invitation, usedAsTeamLeader: true };
      setAcceptedInvites(prev => prev.map(inv => 
        inv.id === invitation.id ? updatedInvitation : inv
      ));

      alert(`${invitation.firstName} ${invitation.lastName} a été ajouté(e) comme chef d'équipe !`);
    }
  };

  const addInvitedPersonAsCollaborator = async (invitation) => {
    if (teamLeaders.length === 0) {
      alert('Veuillez d\'abord ajouter un chef d\'équipe avant d\'ajouter des collaborateurs.');
      return;
    }

    const collaboratorData = {
      nom: invitation.lastName,
      prenom: invitation.firstName,
      email: invitation.email,
      telephone: invitation.phone || '',
      competences: invitation.skills || 'Généraliste',
      team_leader_id: teamLeaders[0].id // Assign to first team leader for now
    };

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/collaborators`, collaboratorData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setCollaborators(prev => [...prev, response.data]);
      
      // Mark invitation as used for collaborator
      const updatedInvitation = { ...invitation, usedAsCollaborator: true };
      setAcceptedInvites(prev => prev.map(inv => 
        inv.id === invitation.id ? updatedInvitation : inv
      ));

      alert(`${invitation.firstName} ${invitation.lastName} a été ajouté(e) comme collaborateur !`);
    } catch (error) {
      console.error('Erreur ajout collaborateur:', error);
      // Fallback
      const newCollaborator = {
        id: `invited-collab-${Date.now()}`,
        ...collaboratorData,
        created_at: new Date().toISOString(),
        fromInvitation: true,
        invitationId: invitation.id
      };

      setCollaborators(prev => [...prev, newCollaborator]);
      
      // Mark invitation as used for collaborator
      const updatedInvitation = { ...invitation, usedAsCollaborator: true };
      setAcceptedInvites(prev => prev.map(inv => 
        inv.id === invitation.id ? updatedInvitation : inv
      ));

      alert(`${invitation.firstName} ${invitation.lastName} a été ajouté(e) comme collaborateur !`);
    }
  };

  const addTeamLeader = async () => {
    try {
      if (!teamLeaderData.nom || !teamLeaderData.prenom) {
        alert('Nom et prénom sont obligatoires');
        return;
      }

      const token = localStorage.getItem('token');
      
      // Préparer les données pour l'API
      const apiData = {
        first_name: teamLeaderData.prenom,
        last_name: teamLeaderData.nom,
        phone: teamLeaderData.telephone,
        specialty: teamLeaderData.specialite,
        color: teamLeaderData.couleur
      };
      
      if (selectedExistingUser) {
        // Cas 1: Ajouter un utilisateur existant comme chef d'équipe
        apiData.user_id = selectedExistingUser;
        
        // Récupérer les informations de l'utilisateur sélectionné pour afficher son rôle
        const selectedUser = collaborators.find(c => c.id === selectedExistingUser);
        const userRole = selectedUser?.role || 'utilisateur';
        const roleLabels = {
          'ADMIN': 'administrateur',
          'BUREAU': 'bureau',
          'TECHNICIEN': 'technicien'
        };
        const roleLabel = roleLabels[userRole] || userRole.toLowerCase();
        
        alert(`✅ Membre ajouté comme chef d'équipe dans le planning !\n\nℹ️ Il garde son accès ${roleLabel} et son rôle ${userRole}.`);
      } else {
        // Cas 2: Créer un chef d'équipe fictif
        alert('✅ Chef d\'équipe ajouté au planning avec succès !');
      }
      
      // Envoyer à l'API
      const response = await axios.post(`${API}/team-leaders`, apiData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Réinitialiser le formulaire
      setTeamLeaderData({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        specialite: '',
        couleur: '#3B82F6'
      });
      setSelectedExistingUser(null);
      setShowTeamLeaderForm(false);
      loadPlanningData(); // Recharger les données
    } catch (error) {
      console.error('Erreur ajout chef d\'équipe:', error);
      alert('❌ Erreur lors de l\'ajout du chef d\'équipe: ' + (error.response?.data?.detail || error.message));
    }
  };

  const addCollaborator = async () => {
    console.log('🚀 [Collaborateur] Début création collaborateur');
    console.log('📋 [Collaborateur] Données formulaire:', collaboratorData);
    
    try {
      if (!collaboratorData.nom || !collaboratorData.prenom) {
        console.warn('⚠️ [Collaborateur] Validation échouée: nom ou prénom manquant');
        alert('Nom et prénom sont obligatoires');
        return;
      }

      const token = localStorage.getItem('token');
      console.log('🔑 [Collaborateur] Token récupéré:', token ? 'OK' : 'MANQUANT');
      
      // Créer un utilisateur avec rôle TECHNICIEN (email temporaire généré automatiquement)
      const userData = {
        first_name: collaboratorData.prenom,
        last_name: collaboratorData.nom,
        email: `${collaboratorData.prenom.toLowerCase()}.${collaboratorData.nom.toLowerCase()}@temp-skyapp.local`,
        phone: collaboratorData.telephone || '',
        role: 'TECHNICIEN'
      };
      
      // Ajouter skills seulement si renseigné
      if (collaboratorData.competences && collaboratorData.competences.trim()) {
        userData.skills = collaboratorData.competences.trim();
      }

      console.log('📤 [Collaborateur] Envoi POST /api/users avec:', userData);
      const response = await axios.post(`${API}/users`, userData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const newUser = response.data;
      console.log('✅ [Collaborateur] Utilisateur créé:', newUser);
      
      // Si un chef d'équipe est sélectionné, l'assigner
      if (collaboratorData.team_leader_id) {
        console.log('👔 [Collaborateur] Assignation au chef d\'équipe:', collaboratorData.team_leader_id);
        try {
          const assignData = {
            team_leader_id: collaboratorData.team_leader_id,
            collaborator_id: newUser.id,
            notes: collaboratorData.competences || ''
          };
          console.log('📤 [Collaborateur] Envoi POST /api/team-leaders/assign avec:', assignData);
          await axios.post(`${API}/team-leaders/assign`, assignData, { 
            headers: { 'Authorization': `Bearer ${token}` } 
          });
          console.log('✅ [Collaborateur] Assignation réussie');
        } catch (assignError) {
          console.error('❌ [Collaborateur] Erreur assignation:', assignError);
          console.warn('⚠️ [Collaborateur] Continue malgré l\'erreur d\'assignation');
        }
      } else {
        console.log('ℹ️ [Collaborateur] Pas de chef d\'équipe sélectionné, collaborateur non assigné');
      }

      // Recharger les données
      console.log('🔄 [Collaborateur] Rechargement des données...');
      await loadPlanningData();
      
      setCollaboratorData({
        nom: '',
        prenom: '',
        telephone: '',
        competences: '',
        team_leader_id: ''
      });
      setShowCollaboratorForm(false);
      console.log('🎉 [Collaborateur] Création terminée avec succès !');
      alert('✅ Collaborateur ajouté avec succès !');
    } catch (error) {
      console.error('❌ [Collaborateur] ERREUR lors de la création:', error);
      console.error('❌ [Collaborateur] Status:', error.response?.status);
      console.error('❌ [Collaborateur] Détails:', error.response?.data);
      console.error('❌ [Collaborateur] Message:', error.message);
      const errorMsg = error.response?.data?.detail || error.message || 'Erreur inconnue';
      alert('❌ Erreur: ' + errorMsg);
    }
  };

  const addSchedule = async () => {
    try {
      // Validation selon la catégorie
      if (scheduleData.intervention_category === 'worksite') {
        if (!scheduleData.worksite_id || !scheduleData.team_leader_id || !scheduleData.collaborator_id) {
          alert('Chantier, chef d\'équipe et collaborateur sont obligatoires');
          return;
        }
      } else if (scheduleData.intervention_category === 'urgence') {
        if (!scheduleData.client_name || !scheduleData.team_leader_id || !scheduleData.collaborator_id) {
          alert('Nom du client, chef d\'équipe et collaborateur sont obligatoires pour les urgences');
          return;
        }
      } else if (scheduleData.intervention_category === 'rdv') {
        // Pour les RDV, seul le nom du client est obligatoire
        if (!scheduleData.client_name) {
          alert('Nom du client est obligatoire');
          return;
        }
      }

      const selectedShift = SHIFT_OPTIONS.find(s => s.value === scheduleData.shift);
      
      const scheduleToSend = {
        ...scheduleData,
        hours: selectedShift.hours
      };

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/schedules`, scheduleToSend, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setSchedules(prev => [...prev, response.data]);
      setScheduleData({
        intervention_category: 'rdv',
        worksite_id: '',
        client_name: '',
        client_address: '',
        client_contact: '',
        team_leader_id: '',
        collaborator_id: '',
        additional_collaborators: [],
        date: selectedDate,
        time: '08:00',
        shift: 'day',
        hours: '8',
        description: ''
      });
      setShowScheduleForm(false);
      alert('Planning ajouté avec succès !');
    } catch (error) {
      console.error('Erreur ajout planning:', error);
      
      // Vérifier si c'est une erreur de doublon
      if (error.response?.status === 409) {
        alert('⚠️ Ce planning existe déjà !\n\nUn planning identique est déjà programmé pour ce collaborateur à cette date et heure.\n\nVeuillez vérifier le calendrier ou modifier l\'heure du rendez-vous.');
        return;
      }
      
      // Fallback en cas d'erreur avec l'API
      const selectedShift = SHIFT_OPTIONS.find(s => s.value === scheduleData.shift);
      
      const newSchedule = {
        id: Date.now().toString(),
        ...scheduleData,
        hours: selectedShift.hours,
        status: 'scheduled',
        created_at: new Date().toISOString()
      };

      setSchedules(prev => [...prev, newSchedule]);
      setScheduleData({
        intervention_category: 'rdv',
        worksite_id: '',
        client_name: '',
        client_address: '',
        client_contact: '',
        team_leader_id: '',
        collaborator_id: '',
        date: selectedDate,
        time: '08:00',
        shift: 'day',
        hours: '8',
        description: '',
        intervention_type: 'rdv'
      });
      setShowScheduleForm(false);
      alert('Planning ajouté avec succès !');
    }
  };

  const removeTeamLeader = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce chef d\'équipe ?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API}/team-leaders/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setTeamLeaders(prev => prev.filter(tl => tl.id !== id));
      } catch (error) {
        console.error('Erreur suppression chef d\'équipe:', error);
        // Fallback en cas d'erreur avec l'API
        setTeamLeaders(prev => prev.filter(tl => tl.id !== id));
      }
    }
  };

  const removeCollaborator = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce collaborateur ?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API}/users/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        await loadPlanningData();
        alert('✅ Collaborateur supprimé avec succès');
      } catch (error) {
        console.error('Erreur suppression collaborateur:', error);
        alert('❌ Erreur lors de la suppression: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const deleteSchedule = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce planning ?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API}/schedules/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setSchedules(prev => prev.filter(s => s.id !== id));
        alert('✅ Planning supprimé avec succès');
      } catch (error) {
        console.error('Erreur suppression planning:', error);
        alert('❌ Erreur lors de la suppression: ' + (error.response?.data?.detail || error.message));
      }
    }
  };
  
  const openEditCollaboratorModal = (collaborator) => {
    setEditingCollaborator(collaborator);
    setEditCollaboratorData({
      first_name: collaborator.first_name || '',
      last_name: collaborator.last_name || '',
      phone: collaborator.phone || ''
    });
    setShowEditCollaboratorModal(true);
  };
  
  const handleEditCollaborator = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API}/users/${editingCollaborator.id}`,
        editCollaboratorData,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      await loadPlanningData();
      setShowEditCollaboratorModal(false);
      setEditingCollaborator(null);
      alert('✅ Collaborateur modifié avec succès !');
    } catch (error) {
      console.error('Erreur modification collaborateur:', error);
      alert('❌ Erreur lors de la modification: ' + (error.response?.data?.detail || error.message));
    }
  };

  const removeSchedule = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce planning ?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API}/schedules/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setSchedules(prev => prev.filter(s => s.id !== id));
      } catch (error) {
        console.error('Erreur suppression planning:', error);
        // Fallback en cas d'erreur avec l'API
        setSchedules(prev => prev.filter(s => s.id !== id));
      }
    }
  };

  const getTeamLeaderName = (id) => {
    const leader = teamLeaders.find(tl => tl.id === id);
    return leader ? `${leader.prenom} ${leader.nom}` : 'Inconnu';
  };

  const getCollaboratorName = (id) => {
    const collaborator = collaborators.find(c => c.id === id);
    if (!collaborator) return 'Inconnu';
    
    // Gérer les différents formats de nom possibles
    const prenom = collaborator.prenom || collaborator.first_name || '';
    const nom = collaborator.nom || collaborator.last_name || collaborator.name || '';
    
    if (prenom && nom) {
      return `${prenom} ${nom}`;
    } else if (collaborator.email) {
      return collaborator.email.split('@')[0]; // Utiliser la partie avant @ de l'email
    }
    
    return 'Inconnu';
  };

  const getWorksiteName = (id) => {
    const worksite = worksites.find(w => w.id === id);
    return worksite ? worksite.title : 'Chantier inconnu';
  };

  const getShiftLabel = (shift) => {
    const shiftOption = SHIFT_OPTIONS.find(s => s.value === shift);
    return shiftOption ? shiftOption.label : shift;
  };

  const getTeamMembersDisplay = (teamLeaderId, selectedCollaboratorId) => {
    if (!teamLeaderId) return 'Aucun chef d\'équipe sélectionné';
    
    const leader = teamLeaders.find(tl => tl.id === teamLeaderId);
    if (!leader) return 'Chef d\'équipe introuvable';
    
    const leaderName = `${leader.prenom} ${leader.nom}`;
    
    // Récupérer les collaborateurs de ce chef depuis teamCollaborators (chargés via API)
    const teamMembers = teamCollaborators[teamLeaderId] || [];
    
    console.log(`👥 Affichage équipe pour ${leaderName}:`, teamMembers);
    
    if (teamMembers.length === 0) {
      return `${leaderName} (Chef - aucun collaborateur)`;
    }
    
    // Construire la liste des noms
    const collaboratorNames = teamMembers.map(item => {
      // L'API peut retourner { collaborator: { id, first_name, ... } } ou directement { id, first_name, ... }
      const c = item.collaborator || item;
      const prenom = c.prenom || c.first_name || '';
      const nom = c.nom || c.last_name || c.name || '';
      const displayName = prenom && nom ? `${prenom} ${nom}` : (c.email ? c.email.split('@')[0] : 'Inconnu');
      console.log(`  - Membre: ${displayName}`, c);
      return displayName;
    });
    
    return `${leaderName} (Chef) + ${collaboratorNames.join(', ')}`;
  };

  const getTeamCollaboratorsList = (teamLeaderId) => {
    if (!teamLeaderId) return 'Aucun';
    
    const teamMembers = teamCollaborators[teamLeaderId] || [];
    
    if (teamMembers.length === 0) {
      return 'Aucun collaborateur';
    }
    
    const collaboratorNames = teamMembers.map(item => {
      const c = item.collaborator || item;
      const prenom = c.prenom || c.first_name || '';
      const nom = c.nom || c.last_name || c.name || '';
      return prenom && nom ? `${prenom} ${nom}` : (c.email ? c.email.split('@')[0] : 'Inconnu');
    });
    
    return collaboratorNames.join(', ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du planning...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl border-0 shadow-2xl p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 truncate">Gestion du Planning</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 hidden sm:block">Équipes, collaborateurs et planification des chantiers</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:space-x-3 w-full sm:w-auto">
            <Button
              onClick={() => setShowTeamLeaderForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl sm:rounded-2xl px-3 py-2 text-sm flex-1 sm:flex-initial"
            >
              <UserPlus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">+ Chef d'équipe</span>
              <span className="sm:hidden">+ Chef</span>
            </Button>
            <Button
              onClick={() => setShowCollaboratorForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white rounded-xl sm:rounded-2xl px-3 py-2 text-sm flex-1 sm:flex-initial"
            >
              <Users className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">+ Collaborateur</span>
              <span className="sm:hidden">+ Collab.</span>
            </Button>
            <Button
              onClick={() => setShowScheduleForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl sm:rounded-2xl px-3 py-2 text-sm flex-1 sm:flex-initial"
            >
              <Calendar className="h-4 w-4 mr-1 sm:mr-2" />
              + Planning
            </Button>
          </div>
        </div>

        {/* Tabs améliorés avec badges et icônes */}
        <div className="mt-4 sm:mt-6">
          <div className="flex overflow-x-auto space-x-1 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl p-1.5 shadow-inner border border-gray-200 scrollbar-hide">
            <button
              onClick={() => setActiveTab('planning')}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-200 whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'planning' 
                  ? 'bg-white text-gray-900 shadow-lg transform scale-105' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
            >
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Planning</span>
              <span className={`ml-1 px-2 py-0.5 sm:px-2.5 rounded-full text-xs font-bold ${
                activeTab === 'planning'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {schedules.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-200 whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'teams' 
                  ? 'bg-white text-gray-900 shadow-lg transform scale-105' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
            >
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Équipes</span>
              <span className={`ml-1 px-2 py-0.5 sm:px-2.5 rounded-full text-xs font-bold ${
                activeTab === 'teams'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {teamLeaders.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('collaborators')}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-200 whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'collaborators' 
                  ? 'bg-white text-gray-900 shadow-lg transform scale-105' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
            >
              <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Collaborateurs</span>
              <span className="sm:hidden">Collabs</span>
              <span className={`ml-1 px-2 py-0.5 sm:px-2.5 rounded-full text-xs font-bold ${
                activeTab === 'collaborators'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {collaborators.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('invited')}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-200 whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'invited' 
                  ? 'bg-white text-gray-900 shadow-lg transform scale-105' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
            >
              <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Personnes Invitées</span>
              <span className="sm:hidden">Invités</span>
              <span className={`ml-1 px-2 py-0.5 sm:px-2.5 rounded-full text-xs font-bold ${
                activeTab === 'invited'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {acceptedInvites.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Outils de Visualisation Temporelle - Visible uniquement dans l'onglet Planning */}
      {activeTab === 'planning' && (
        <Card className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
              {/* Sélecteur de Vue amélioré */}
              <div className="w-full lg:w-auto">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                  <CalendarRange className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  <span className="hidden sm:inline">Visualisation du Planning</span>
                  <span className="sm:hidden">Planning</span>
                </h3>
                <div className="flex space-x-2 sm:space-x-3">
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-5 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-200 shadow-sm text-sm sm:text-base ${
                    viewMode === 'timeline' 
                      ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg transform scale-105' 
                      : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Planning Équipe</span>
                  <span className="sm:hidden">Équipe</span>
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-5 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-200 shadow-sm text-sm sm:text-base ${
                    viewMode === 'month' 
                      ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg transform scale-105' 
                      : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <CalendarRange className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Mois</span>
                </button>
              </div>
            </div>

            {/* Navigation Temporelle améliorée */}
            <div className="flex items-center justify-between space-x-2 sm:space-x-4 w-full">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1">
                {/* Bouton Précédent */}
                <button
                  onClick={() => navigateDate(-1)}
                  className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 text-purple-600 hover:text-purple-700 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 flex-shrink-0"
                >
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                
                {/* Date actuelle avec style amélioré */}
                <div className="px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg sm:rounded-xl border-2 border-gray-200 shadow-sm flex-1 min-w-0">
                  <span className="text-xs sm:text-base font-bold text-gray-800 truncate block">{getDateTitle()}</span>
                </div>
                
                {/* Bouton Suivant */}
                <button
                  onClick={() => navigateDate(1)}
                  className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 text-purple-600 hover:text-purple-700 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 flex-shrink-0"
                >
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
              
              {/* Bouton Aujourd'hui avec badge */}
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setCurrentDate(new Date())}
                  className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 text-sm sm:text-base whitespace-nowrap"
                >
                  <CalendarDays className="h-4 w-4" />
                  <span className="hidden sm:inline">Aujourd'hui</span>
                  <span className="sm:hidden">Auj.</span>
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Planning Content */}
      {activeTab === 'planning' && (
        <div className="space-y-6">

          {/* Vue Timeline Hebdomadaire - Par Technicien */}
          {viewMode === 'timeline' && (
            <Card className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
              <CardContent className="p-0">
                {/* Grille Timeline */}
                <div className="overflow-x-auto">
                  <div className="min-w-[900px]">
                    {/* En-tête avec dates */}
                    <div className="grid grid-cols-[150px_repeat(7,1fr)] sm:grid-cols-[200px_repeat(7,1fr)] bg-gray-50 border-b-2 border-gray-200">
                      {/* Colonne Techniciens */}
                      <div className="p-2 sm:p-4 font-bold text-sm sm:text-base text-gray-700 border-r-2 border-gray-200 bg-white">
                        Techniciens
                      </div>
                      {/* Colonnes des jours */}
                      {getWeekDates(currentDate).map((date, index) => {
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        const dayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date);
                        const dayNum = date.getDate();
                        const month = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date);
                        
                        return (
                          <div 
                            key={index}
                            className={`p-2 sm:p-3 text-center border-r border-gray-200 ${
                              isToday 
                                ? 'bg-blue-50 border-blue-300' 
                                : isWeekend 
                                  ? 'bg-gray-100' 
                                  : 'bg-white'
                            }`}
                          >
                            <div className={`text-xs font-semibold uppercase ${
                              isToday ? 'text-blue-600' : 'text-gray-600'
                            }`}>
                              {dayName}
                            </div>
                            <div className={`text-xl sm:text-2xl font-bold mt-1 ${
                              isToday ? 'text-blue-700' : 'text-gray-800'
                            }`}>
                              {dayNum}
                            </div>
                            <div className="text-xs text-gray-500">
                              {month}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Lignes des équipes avec chef + membres */}
                    {(() => {
                      // Créer les groupes d'équipes à partir des team leaders
                      const teamGroups = {};
                      const assignedTechIds = new Set();

                      // D'abord, créer tous les groupes d'équipes
                      teamLeaders.forEach(leader => {
                        teamGroups[leader.id] = {
                          leader: leader,
                          members: [],
                          hasSchedules: false
                        };

                        // Ajouter les membres depuis teamCollaborators (données BDD)
                        const teamMembers = teamCollaborators[leader.id] || [];
                        console.log(`📋 Équipe ${leader.prenom} ${leader.nom} - Membres IDs:`, teamMembers);
                        console.log(`📋 Collaborateurs disponibles:`, collaborators.map(c => ({ id: c.id, user_id: c.user_id, name: `${c.first_name} ${c.last_name}` })));
                        
                        teamMembers.forEach(memberData => {
                          // memberData peut être soit un ID string, soit un objet
                          const memberId = typeof memberData === 'object' ? (memberData.id || memberData.user_id || memberData.collaborator_id) : memberData;
                          console.log(`🔍 Recherche membre ${memberId}:`, memberData);
                          
                          // Chercher par id OU par user_id
                          const tech = collaborators.find(c => c.id === memberId || c.user_id === memberId);
                          console.log(`🔍 Membre trouvé:`, tech);
                          
                          if (tech && !teamGroups[leader.id].members.find(m => m.id === tech.id)) {
                            teamGroups[leader.id].members.push(tech);
                            assignedTechIds.add(tech.id);
                            console.log(`✅ Membre ajouté:`, tech.first_name, tech.last_name);
                          }
                        });

                        console.log(`📊 Total membres pour ${leader.prenom} ${leader.nom}:`, teamGroups[leader.id].members.length);

                        // Vérifier si l'équipe a des schedules actifs
                        // IMPORTANT: Vérifier UNIQUEMENT par team_leader_id
                        const teamSchedules = schedules.filter(s => 
                          s.team_leader_id === leader.id
                        );
                        if (teamSchedules.length > 0) {
                          teamGroups[leader.id].hasSchedules = true;
                        }
                      });

                      // Techniciens non assignés à une équipe
                      const unassignedTechs = collaborators.filter(tech => !assignedTechIds.has(tech.id));

                      // Trier les équipes : actives d'abord, puis inactives
                      const sortedTeamEntries = Object.entries(teamGroups).sort((a, b) => {
                        const [, teamA] = a;
                        const [, teamB] = b;
                        
                        // Équipes actives en premier
                        if (teamA.hasSchedules && !teamB.hasSchedules) return -1;
                        if (!teamA.hasSchedules && teamB.hasSchedules) return 1;
                        
                        // Sinon, ordre alphabétique par nom du chef
                        const nameA = `${teamA.leader?.prenom || ''} ${teamA.leader?.nom || ''}`;
                        const nameB = `${teamB.leader?.prenom || ''} ${teamB.leader?.nom || ''}`;
                        return nameA.localeCompare(nameB);
                      });

                      // Couleurs prédéfinies pour chaque équipe
                      const colors = [
                        { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', hover: 'hover:bg-blue-200', dark: 'bg-blue-200' },
                        { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', hover: 'hover:bg-purple-200', dark: 'bg-purple-200' },
                        { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', hover: 'hover:bg-green-200', dark: 'bg-green-200' },
                        { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', hover: 'hover:bg-orange-200', dark: 'bg-orange-200' },
                        { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300', hover: 'hover:bg-pink-200', dark: 'bg-pink-200' },
                        { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', hover: 'hover:bg-yellow-200', dark: 'bg-yellow-200' },
                        { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300', hover: 'hover:bg-indigo-200', dark: 'bg-indigo-200' },
                        { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', hover: 'hover:bg-red-200', dark: 'bg-red-200' },
                        { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300', hover: 'hover:bg-teal-200', dark: 'bg-teal-200' },
                        { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300', hover: 'hover:bg-cyan-200', dark: 'bg-cyan-200' },
                      ];

                      let teamIndex = 0;

                      return (
                        <>
                          {/* Afficher chaque équipe (triées par activité) */}
                          {sortedTeamEntries.map(([leaderId, teamData]) => {
                            const colorScheme = colors[teamIndex % colors.length];
                            teamIndex++;

                            return (
                              <div 
                                key={leaderId}
                                className={`grid grid-cols-[150px_repeat(7,1fr)] sm:grid-cols-[200px_repeat(7,1fr)] border-b-2 hover:bg-gray-50 transition-colors relative ${
                                  teamData.hasSchedules ? 'border-gray-400 bg-gray-50' : 'border-gray-200'
                                }`}
                                style={{ minHeight: `${100 + (teamData.members.length * 45)}px` }}
                              >
                                {/* Colonne Équipe (Chef + Membres) */}
                                <div className={`p-2 sm:p-3 border-r-2 border-gray-200 ${colorScheme.bg} ${teamData.hasSchedules ? 'border-l-4 border-l-green-500' : ''}`}>
                                  {/* Badge équipe active */}
                                  {teamData.hasSchedules && (
                                    <div className="mb-2 flex items-center justify-center">
                                      <span className="text-xs font-bold bg-green-500 text-white px-3 py-1 rounded-full shadow">
                                        ✓ ÉQUIPE ACTIVE
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Chef d'équipe */}
                                  {teamData.leader && (
                                    <div className="mb-3 pb-3 border-b-2 border-gray-300">
                                      <div className="flex items-center space-x-2 relative group">
                                        <div className={`w-10 h-10 rounded-full ${colorScheme.dark} flex items-center justify-center ${colorScheme.text} font-bold text-sm shadow-md`}>
                                          👤
                                        </div>
                                        <div>
                                          <div className={`font-bold ${colorScheme.text} text-sm`}>
                                            {teamData.leader.prenom} {teamData.leader.nom}
                                          </div>
                                          <div className="text-xs text-gray-600 font-semibold">
                                            👨‍💼 Chef d'équipe
                                          </div>
                                        </div>
                                        
                                        {/* Tooltip au survol */}
                                        <div className="absolute bottom-full left-0 mb-2 z-50 hidden group-hover:block pointer-events-none">
                                          <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl min-w-[250px] border border-gray-700">
                                            <div className="text-xs font-bold text-gray-300 mb-2">👨‍💼 CHEF D'ÉQUIPE</div>
                                            <div className="space-y-1.5">
                                              <div className="flex items-center space-x-2">
                                                <span className="text-xs text-gray-400">👤</span>
                                                <span className="text-sm font-semibold">{teamData.leader.prenom} {teamData.leader.nom}</span>
                                              </div>
                                              {teamData.leader.telephone && (
                                                <div className="flex items-center space-x-2">
                                                  <span className="text-xs text-gray-400">📞</span>
                                                  <span className="text-sm">{teamData.leader.telephone}</span>
                                                </div>
                                              )}
                                              {teamData.leader.email && (
                                                <div className="flex items-center space-x-2">
                                                  <span className="text-xs text-gray-400">✉️</span>
                                                  <span className="text-sm truncate">{teamData.leader.email}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Membres de l'équipe */}
                                  <div className="space-y-2">
                                    {teamData.members.map((member, idx) => (
                                      <div key={member.id} className="flex items-center space-x-2 pl-2 relative group">
                                        <div className={`w-8 h-8 rounded-full ${colorScheme.bg} border-2 ${colorScheme.border} flex items-center justify-center ${colorScheme.text} font-semibold text-xs`}>
                                          {(member.first_name?.[0] || '') + (member.last_name?.[0] || '')}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-semibold text-gray-800 text-xs truncate">
                                            {member.first_name} {member.last_name}
                                          </div>
                                          <div className="text-xs text-gray-500 truncate">
                                            {member.phone || 'N/A'}
                                          </div>
                                        </div>
                                        
                                        {/* Tooltip au survol */}
                                        <div className="absolute bottom-full left-0 mb-2 z-50 hidden group-hover:block pointer-events-none">
                                          <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl min-w-[250px] border border-gray-700">
                                            <div className="text-xs font-bold text-gray-300 mb-2">👤 MEMBRE</div>
                                            <div className="space-y-1.5">
                                              <div className="flex items-center space-x-2">
                                                <span className="text-xs text-gray-400">👤</span>
                                                <span className="text-sm font-semibold">{member.first_name} {member.last_name}</span>
                                              </div>
                                              {member.phone && (
                                                <div className="flex items-center space-x-2">
                                                  <span className="text-xs text-gray-400">📞</span>
                                                  <span className="text-sm">{member.phone}</span>
                                                </div>
                                              )}
                                              {member.email && (
                                                <div className="flex items-center space-x-2">
                                                  <span className="text-xs text-gray-400">✉️</span>
                                                  <span className="text-sm truncate">{member.email}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Compteur de membres */}
                                  <div className="mt-3 pt-2 border-t border-gray-300">
                                    <div className="text-xs font-semibold text-gray-600 text-center">
                                      {teamData.members.length} membre{teamData.members.length > 1 ? 's' : ''}
                                    </div>
                                  </div>
                                </div>

                                {/* Zone de contenu avec missions en blocs horizontaux étendus */}
                                <div className={`absolute top-0 left-[150px] sm:left-[200px] right-0 bottom-0 overflow-visible planning-team-container-${leaderId}`}>
                                  {/* Grille de fond pour chaque jour */}
                                  <div className="grid grid-cols-7 gap-px bg-gray-200 absolute inset-0">
                                    {getWeekDates(currentDate).map((date, dayIndex) => (
                                      <div 
                                        key={dayIndex}
                                        className={`${colorScheme.bg} ${colorScheme.bg === 'bg-yellow-100' ? 'bg-opacity-30' : ''}`}
                                      />
                                    ))}
                                  </div>

                                  {/* Container pour les missions avec positionnement absolu */}
                                  <div className={`absolute inset-0 overflow-visible planning-team-container-${leaderId}`}>
                                    {(() => {
                                      const weekStart = getWeekDates(currentDate)[0];
                                      weekStart.setHours(0, 0, 0, 0);
                                      
                                      // Récupérer tous les schedules de l'équipe
                                      // IMPORTANT: Filtrer par team_leader_id ET par semaine affichée
                                      const teamSchedules = schedules.filter(s => {
                                        // Utiliser start_date et end_date pour vérifier si le schedule chevauche la semaine
                                        const scheduleStart = new Date(s.start_date || s.date);
                                        scheduleStart.setHours(0, 0, 0, 0);
                                        const scheduleEnd = new Date(s.end_date || s.date || s.start_date);
                                        scheduleEnd.setHours(23, 59, 59, 999);
                                        
                                        const weekEnd = new Date(weekStart);
                                        weekEnd.setDate(weekEnd.getDate() + 6);
                                        weekEnd.setHours(23, 59, 59, 999);
                                        
                                        // Filtrer par chef d'équipe ET vérifier si la période du schedule chevauche la semaine
                                        const isCorrectTeam = s.team_leader_id === leaderId;
                                        // Un schedule est visible si sa période chevauche la semaine affichée
                                        const isInWeek = scheduleStart <= weekEnd && scheduleEnd >= weekStart;
                                        
                                        return isCorrectTeam && isInWeek;
                                      });
                                      
                                      console.log(`📋 Équipe ${leaderId} (${teamData.leader?.prenom} ${teamData.leader?.nom}): ${teamSchedules.length} schedule(s)`);
                                      teamSchedules.forEach(s => {
                                        console.log(`  - Schedule ${s.id}: team_leader=${s.team_leader_id}, collaborator=${s.collaborator_id}`);
                                      });

                                      // Grouper par membre
                                      const schedulesByMember = {};
                                      teamSchedules.forEach(schedule => {
                                        const memberId = schedule.collaborator_id || 'unassigned';
                                        if (!schedulesByMember[memberId]) {
                                          schedulesByMember[memberId] = [];
                                        }
                                        schedulesByMember[memberId].push(schedule);
                                      });

                                      let rowIndex = 0;
                                      const allScheduleElements = Object.entries(schedulesByMember).map(([memberId, memberSchedules]) => {
                                        const member = teamData.members.find(m => m.user_id === memberId);
                                        const groupedSchedules = getMultiDaySchedulesForMember(memberSchedules, weekStart);

                                        return groupedSchedules.map((schedule, idx) => {
                                          const startTime = schedule.time || '08:00';
                                          const hours = parseInt(schedule.hours) || 8;
                                          const [startHour, startMin] = startTime.split(':').map(Number);
                                          const endHour = startHour + hours;
                                          // Format simplifié : 8h au lieu de 08:00
                                          const formatSimpleTime = (h, m) => `${h}h${m > 0 ? m.toString().padStart(2, '0') : ''}`;
                                          const startTimeSimple = formatSimpleTime(startHour, startMin);
                                          const endTimeSimple = formatSimpleTime(endHour, startMin);
                                          const totalHours = schedule.isMultiDay ? (schedule.dayCount * hours) : hours;
                                          const topPosition = 10 + (rowIndex * 95);
                                          rowIndex++;

                                          return (
                                            <div
                                              key={`${memberId}-${idx}`}
                                              onClick={() => {
                                                setSelectedSchedule({
                                                  ...schedule,
                                                  member: member,
                                                  teamLeader: teamData.leader,
                                                  startTime: startTimeSimple,
                                                  endTime: endTimeSimple,
                                                  hours: totalHours
                                                });
                                                setShowScheduleDetail(true);
                                              }}
                                              className={`absolute rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden ${
                                                schedule.isMultiDay ? 'border-2 border-blue-500 ring-2 ring-blue-200' : 'border-2 border-gray-200'
                                              }`}
                                              style={{
                                                left: `calc(${(schedule.columnStart - 1) * (100 / 7)}% + 6px)`,
                                                right: `calc(${(7 - schedule.columnStart - schedule.columnSpan + 1) * (100 / 7)}% + 6px)`,
                                                top: `0px`,
                                                bottom: `0px`,
                                                zIndex: 10 + idx,
                                                background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 50%, #f3f4f6 100%)'
                                              }}
                                            >
                                              {/* Barre latérale colorée */}
                                              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${colorScheme.text.replace('text-', 'bg-')} opacity-80 group-hover:opacity-100 transition-opacity`}></div>
                                              
                                              <div className="p-2.5 h-full flex flex-col justify-between pl-3">
                                                {/* Nom du client - Design amélioré */}
                                                <div className="mb-1.5">
                                                  <div className={`text-sm font-bold ${colorScheme.text} truncate leading-snug tracking-tight`}>
                                                    {schedule.worksites?.clients?.name || 
                                                     (schedule.worksites?.clients?.prenom && schedule.worksites?.clients?.nom 
                                                       ? `${schedule.worksites.clients.prenom} ${schedule.worksites.clients.nom}` 
                                                       : (member ? `${member.first_name} ${member.last_name}` : 'Mission'))}
                                                  </div>
                                                </div>

                                                <div className="flex-1 space-y-1.5">
                                                  {/* Horaire avec design moderne */}
                                                  <div className="flex items-center">
                                                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-2.5 py-1 rounded-lg shadow-sm">
                                                      <span className="text-xs font-bold text-white whitespace-nowrap">🕐 {startTimeSimple}-{endTimeSimple}</span>
                                                    </div>
                                                  </div>

                                                  {/* Chantier - Design élégant */}
                                                  {schedule.worksites?.title && (
                                                    <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg px-2 py-1.5 border-2 border-gray-100 shadow-sm">
                                                      <div className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight">
                                                        🏗️ {schedule.worksites.title}
                                                      </div>
                                                      {(schedule.worksites.address || schedule.worksites?.clients?.address) && (
                                                        <div className="text-xs text-gray-600 line-clamp-2 mt-1 leading-tight">
                                                          📍 {schedule.worksites.address || schedule.worksites?.clients?.address}
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}

                                                  {/* Description */}
                                                  {!schedule.worksites?.title && schedule.description && (
                                                    <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg px-2 py-1.5 border-2 border-gray-100 shadow-sm">
                                                      <div className="text-xs font-medium text-gray-700 line-clamp-2 leading-tight">
                                                        {schedule.description.replace(/^Planning pour\s*/i, '')}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>

                                              {/* Effet hover animé */}
                                              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-indigo-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:via-indigo-500/5 group-hover:to-purple-500/5 rounded-xl transition-all duration-300 pointer-events-none"></div>
                                            </div>
                                          );
                                        });
                                      });
                                      
                                      // Calculer la hauteur nécessaire
                                      const totalSchedules = allScheduleElements.flat().length;
                                      const requiredHeight = Math.max(100, totalSchedules * 95 + 15);
                                      
                                      return (
                                        <>
                                          <style>{`
                                            .planning-team-container-${leaderId} {
                                              min-height: ${requiredHeight}px !important;
                                            }
                                          `}</style>
                                          {allScheduleElements}
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Techniciens sans équipe */}
                          {unassignedTechs.length > 0 && (
                            <>
                              <div className="col-span-8 bg-gray-100 p-2 border-y-2 border-gray-400">
                                <div className="text-sm font-bold text-gray-600 text-center">
                                  👤 COLLABORATEURS SANS ÉQUIPE
                                </div>
                              </div>
                              {unassignedTechs.map((tech, techIndex) => {
                                const colorScheme = colors[(teamIndex + techIndex) % colors.length];

                                return (
                                  <div 
                                    key={tech.id}
                                    className="grid grid-cols-[150px_repeat(7,1fr)] sm:grid-cols-[200px_repeat(7,1fr)] border-b border-gray-200 hover:bg-gray-50 transition-colors"
                                  >
                                    <div className="p-2 sm:p-4 border-r-2 border-gray-200 bg-gray-50">
                                      <div className="flex items-center space-x-3 relative group">
                                        <div className={`w-10 h-10 rounded-full ${colorScheme.bg} flex items-center justify-center ${colorScheme.text} font-bold text-sm`}>
                                          {(tech.first_name?.[0] || '') + (tech.last_name?.[0] || '')}
                                        </div>
                                        <div>
                                          <div className="font-semibold text-gray-800">
                                            {tech.first_name} {tech.last_name}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            Sans équipe
                                          </div>
                                        </div>
                                        
                                        {/* Tooltip au survol */}
                                        <div className="absolute bottom-full left-0 mb-2 z-50 hidden group-hover:block pointer-events-none">
                                          <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl min-w-[250px] border border-gray-700">
                                            <div className="text-xs font-bold text-gray-300 mb-2">👤 COLLABORATEUR</div>
                                            <div className="space-y-1.5">
                                              <div className="flex items-center space-x-2">
                                                <span className="text-xs text-gray-400">👤</span>
                                                <span className="text-sm font-semibold">{tech.first_name} {tech.last_name}</span>
                                              </div>
                                              {tech.phone && (
                                                <div className="flex items-center space-x-2">
                                                  <span className="text-xs text-gray-400">📞</span>
                                                  <span className="text-sm">{tech.phone}</span>
                                                </div>
                                              )}
                                              {tech.email && (
                                                <div className="flex items-center space-x-2">
                                                  <span className="text-xs text-gray-400">✉️</span>
                                                  <span className="text-sm truncate">{tech.email}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {getWeekDates(currentDate).map((date, dayIndex) => {
                                      const dateStr = date.toISOString().split('T')[0];
                                      const techSchedules = schedules.filter(s => 
                                        s.date === dateStr && s.collaborator_id === tech.user_id
                                      );
                                      
                                      const totalHours = techSchedules.reduce((sum, s) => sum + (parseInt(s.hours) || 0), 0);

                                      return (
                                        <div 
                                          key={dayIndex}
                                          className="p-2 border-r border-gray-100 min-h-[80px]"
                                        >
                                          {techSchedules.length > 0 ? (
                                            <div className="space-y-2">
                                              {techSchedules.map((schedule, idx) => {
                                                const startTime = schedule.time || '08:00';
                                                const hours = parseInt(schedule.hours) || 8;
                                                const [startHour, startMin] = startTime.split(':').map(Number);
                                                const endHour = startHour + hours;
                                                const endTime = `${endHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;

                                                return (
                                                  <div 
                                                    key={idx}
                                                    className={`p-2 rounded-lg border-2 ${colorScheme.bg} ${colorScheme.border} ${colorScheme.text} ${colorScheme.hover} transition-all cursor-pointer shadow-sm`}
                                                    title={schedule.description || 'Mission'}
                                                  >
                                                    <div className="flex items-center justify-between mb-1">
                                                      <span className="font-bold text-sm">{startTime} - {endTime}</span>
                                                      <span className="text-xs font-semibold px-2 py-0.5 bg-white rounded-full">
                                                        {hours}h
                                                      </span>
                                                    </div>
                                                    {schedule.worksites?.clients?.name && (
                                                      <div className="text-xs font-bold text-gray-900 truncate mb-1">
                                                        👤 {schedule.worksites.clients.name}
                                                      </div>
                                                    )}
                                                    {schedule.worksites?.title && (
                                                      <div className="text-xs font-medium truncate">
                                                        🏗️ {schedule.worksites.title}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                              {totalHours > 0 && (
                                                <div className="text-xs text-center font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                  Total: {totalHours}h
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="h-full flex items-center justify-center text-gray-300">
                                              <div className="w-8 h-1 bg-gray-200 rounded"></div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </>
                      );
                    })()}

                    {/* Message si aucun technicien */}
                    {collaborators.length === 0 && teamLeaders.length === 0 && (
                      <div className="p-12 text-center text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-lg font-semibold">Aucun technicien disponible</p>
                        <p className="text-sm mt-1">Ajoutez des collaborateurs pour commencer la planification</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vue Calendaire */}
          {viewMode === 'week' && (
            <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="grid grid-cols-7 gap-2">
                  {/* En-têtes des jours avec style amélioré */}
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, index) => {
                    const isWeekend = index >= 5;
                    return (
                      <div 
                        key={day} 
                        className={`p-3 text-center font-bold text-sm uppercase tracking-wider border-b-2 ${
                          isWeekend ? 'bg-gray-100 text-gray-600 border-gray-300' : 'bg-white text-gray-700 border-gray-200'
                        }`}
                      >
                        {day}
                      </div>
                    );
                  })}
                  
                  {/* Jours de la semaine avec style amélioré */}
                  {getWeekDates(currentDate).map((date, index) => {
                    const daySchedules = getSchedulesForDate(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    
                    return (
                      <div 
                        key={index} 
                        className={`relative p-3 min-h-[120px] border-2 rounded-xl transition-all duration-200 ${
                          isToday 
                            ? 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-400 shadow-md ring-2 ring-purple-300 ring-opacity-50' 
                            : isWeekend
                              ? 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                              : isCurrentMonth 
                                ? 'bg-white border-gray-200 hover:bg-purple-50 hover:border-purple-200 hover:shadow-sm' 
                                : 'bg-gray-50 border-gray-100 text-gray-400'
                        } cursor-pointer`}
                        onClick={() => openDayDetail(date)}
                      >
                        {/* Badge aujourd'hui */}
                        {isToday && (
                          <div className="absolute top-1 right-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-600 text-white">
                              Aujourd'hui
                            </span>
                          </div>
                        )}
                        
                        {/* Numéro du jour */}
                        <div className={`text-center mb-2 ${
                          isToday 
                            ? 'text-2xl font-bold text-purple-700' 
                            : isCurrentMonth 
                              ? 'text-lg font-semibold text-gray-700' 
                              : 'text-base text-gray-400'
                        }`}>
                          {date.getDate()}
                        </div>
                        
                        {/* Indicateurs de planning */}
                        <div className="space-y-1.5">
                          {daySchedules.slice(0, 2).map((schedule, idx) => (
                            <div 
                              key={idx} 
                              className="group relative text-xs bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 px-2 py-1.5 rounded-lg truncate font-medium shadow-sm hover:shadow-md transition-all border border-purple-300"
                            >
                              <div className="flex items-center space-x-1">
                                <span className="inline-block w-1.5 h-1.5 bg-purple-600 rounded-full"></span>
                                <span>{schedule.time}</span>
                              </div>
                            </div>
                          ))}
                          {daySchedules.length > 2 && (
                            <div className="text-xs text-center font-semibold text-purple-600 bg-purple-50 py-1 rounded-lg border border-purple-200">
                              +{daySchedules.length - 2} autre{daySchedules.length - 2 > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                        
                        {/* Mini-indicateurs colorés si événements */}
                        {daySchedules.length > 0 && (
                          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                            {daySchedules.slice(0, 3).map((_, idx) => (
                              <div key={idx} className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {viewMode === 'month' && (
            <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="grid grid-cols-7 gap-2">
                  {/* En-têtes des jours avec style amélioré */}
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, index) => {
                    const isWeekend = index >= 5;
                    return (
                      <div 
                        key={day} 
                        className={`p-3 text-center font-bold text-sm uppercase tracking-wider border-b-2 ${
                          isWeekend ? 'bg-gray-100 text-gray-600 border-gray-300' : 'bg-white text-gray-700 border-gray-200'
                        }`}
                      >
                        {day}
                      </div>
                    );
                  })}
                  
                  {/* Jours du mois avec améliorations visuelles */}
                  {getMonthDates(currentDate).map((date, index) => {
                    const daySchedules = getSchedulesForDate(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const dayOfWeek = date.getDay();
                    
                    return (
                      <div 
                        key={index} 
                        className={`relative p-3 min-h-[100px] border-2 rounded-xl transition-all duration-200 ${
                          isToday 
                            ? 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-400 shadow-md ring-2 ring-purple-300 ring-opacity-50' 
                            : isWeekend
                              ? 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                              : isCurrentMonth 
                                ? 'bg-white border-gray-200 hover:bg-purple-50 hover:border-purple-200 hover:shadow-sm' 
                                : 'bg-gray-50 border-gray-100 text-gray-400'
                        } cursor-pointer`}
                        onClick={() => openDayDetail(date)}
                      >
                        {/* Badge aujourd'hui */}
                        {isToday && (
                          <div className="absolute top-1 right-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-600 text-white">
                              Aujourd'hui
                            </span>
                          </div>
                        )}
                        
                        {/* Numéro du jour */}
                        <div className={`text-center mb-2 ${
                          isToday 
                            ? 'text-2xl font-bold text-purple-700' 
                            : isCurrentMonth 
                              ? 'text-lg font-semibold text-gray-700' 
                              : 'text-base text-gray-400'
                        }`}>
                          {date.getDate()}
                        </div>
                        
                        {/* Indicateurs de planning */}
                        <div className="space-y-1.5">
                          {daySchedules.slice(0, 2).map((schedule, idx) => (
                            <div 
                              key={idx} 
                              className="group relative text-xs bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 px-2 py-1.5 rounded-lg font-medium shadow-sm hover:shadow-md transition-all border border-purple-300"
                            >
                              <div className="flex flex-col space-y-0.5">
                                <div className="flex items-center space-x-1">
                                  <span className="inline-block w-1.5 h-1.5 bg-purple-600 rounded-full flex-shrink-0"></span>
                                  <span className="font-semibold">{schedule.time}</span>
                                </div>
                                {schedule.worksites?.title && (
                                  <div className="text-xs text-purple-700 truncate pl-2.5">
                                    {schedule.worksites.title}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {daySchedules.length > 2 && (
                            <div className="text-xs text-center font-semibold text-purple-600 bg-purple-50 py-1 rounded-lg border border-purple-200">
                              +{daySchedules.length - 2} autre{daySchedules.length - 2 > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                        
                        {/* Mini-indicateurs colorés si événements */}
                        {daySchedules.length > 0 && (
                          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                            {daySchedules.slice(0, 3).map((_, idx) => (
                              <div key={idx} className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Date Selector pour le détail */}
          <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Détail du jour sélectionné</h3>
                  <p className="text-sm text-gray-600">Planning détaillé pour la date sélectionnée</p>
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 p-3"
                />
              </div>
            </CardContent>
          </Card>

          {/* Schedules for Selected Date - Vue cartes compactes */}
          <div className="grid gap-3">
            {getSchedulesForDate(selectedDate).length === 0 ? (
              <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun planning</h3>
                  <p className="text-gray-500">Aucune intervention programmée pour cette date.</p>
                </CardContent>
              </Card>
            ) : (
              getSchedulesForDate(selectedDate).map((schedule) => {
                const typeColors = {
                  rdv: { bg: 'bg-blue-500', text: 'text-blue-500', light: 'bg-blue-50' },
                  worksite: { bg: 'bg-orange-500', text: 'text-orange-500', light: 'bg-orange-50' },
                  urgence: { bg: 'bg-red-500', text: 'text-red-500', light: 'bg-red-50' }
                };
                const colors = typeColors[schedule.intervention_category] || typeColors.rdv;
                
                return (
                  <div 
                    key={schedule.id}
                    className="group bg-white rounded-xl border-2 border-gray-100 hover:border-gray-300 transition-all duration-200 overflow-hidden hover:shadow-md"
                  >
                    <div className="flex">
                      {/* Bande latérale avec heure */}
                      <div className={`${colors.bg} w-24 flex flex-col items-center justify-center text-white p-4`}>
                        <div className="text-3xl font-bold leading-none">{schedule.time.split(':')[0]}</div>
                        <div className="text-sm opacity-90">:{schedule.time.split(':')[1]}</div>
                        <div className="text-xs opacity-75 mt-2">{schedule.hours}h</div>
                      </div>
                      
                      {/* Contenu principal */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* Type + Titre */}
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 ${colors.light} ${colors.text} text-xs font-bold rounded`}>
                                {schedule.intervention_category === 'rdv' ? 'RDV' :
                                 schedule.intervention_category === 'worksite' ? 'CHANTIER' :
                                 'URGENCE'}
                              </span>
                              {schedule.intervention_category === 'worksite' && (
                                <span className="text-sm text-gray-600">
                                  {getWorksiteName(schedule.worksite_id)}
                                </span>
                              )}
                            </div>
                            
                            {/* Nom principal en GROS */}
                            <div className="mb-2">
                              {schedule.intervention_category === 'worksite' ? (
                                // Pour chantier : nom du chef en GROS
                                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                  <span className="text-xl">👨‍💼</span>
                                  {schedule.team_leader_id ? getTeamLeaderName(schedule.team_leader_id) : 'Chef non assigné'}
                                </h3>
                              ) : (
                                // Pour RDV/Urgence : nom de la personne qui a le RDV en GROS
                                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                  {schedule.team_leader_id ? (
                                    <>
                                      <span className="text-xl">👨‍💼</span>
                                      {getTeamLeaderName(schedule.team_leader_id)}
                                    </>
                                  ) : schedule.collaborator_id ? (
                                    <>
                                      <span className="text-xl">👷</span>
                                      {getCollaboratorName(schedule.collaborator_id)}
                                    </>
                                  ) : (
                                    <span className="text-gray-400">Personne non assignée</span>
                                  )}
                                </h3>
                              )}
                            </div>
                            
                            {/* Informations du RDV/Urgence */}
                            {schedule.intervention_category !== 'worksite' && (
                              <div className="mb-2 space-y-1">
                                {schedule.client_name && (
                                  <div className="text-base font-semibold text-gray-800">
                                    Client: {schedule.client_name}
                                  </div>
                                )}
                                {schedule.client_address && (
                                  <div className="text-sm text-gray-600 flex items-start gap-1.5">
                                    <span className="mt-0.5">📍</span>
                                    <span>{schedule.client_address}</span>
                                  </div>
                                )}
                                {schedule.client_contact && (
                                  <div className="text-sm text-gray-600 flex items-center gap-1.5">
                                    <span>📞</span>
                                    <span>{schedule.client_contact}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Détails en ligne */}
                            <div className="flex flex-wrap items-center gap-4 text-sm mb-2">
                              {schedule.intervention_category === 'worksite' && schedule.collaborator_id && (
                                <div className="flex items-center gap-1.5 text-gray-700">
                                  <span className="font-medium">Technicien:</span>
                                  <span className="text-base font-semibold">{getCollaboratorName(schedule.collaborator_id)}</span>
                                </div>
                              )}
                              {schedule.intervention_category !== 'worksite' && schedule.team_leader_id && schedule.collaborator_id && (
                                <div className="flex items-center gap-1.5 text-gray-700">
                                  <span className="font-medium">+</span>
                                  <span className="text-sm font-semibold">{getCollaboratorName(schedule.collaborator_id)}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 text-gray-500">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{getShiftLabel(schedule.shift)}</span>
                              </div>
                            </div>
                            
                            {/* Description */}
                            {schedule.description && (
                              <div className="mt-2 text-sm text-gray-600 italic">
                                {schedule.description}
                              </div>
                            )}
                          </div>
                          
                          {/* Actions */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-3">
                            <button className="p-2 hover:bg-gray-100 rounded-lg">
                              <Edit className="h-4 w-4 text-gray-600" />
                            </button>
                            <button 
                              onClick={() => deleteSchedule(schedule.id)}
                              className="p-2 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Statut vertical */}
                      <div className={`w-1 ${
                        schedule.status === 'scheduled' ? 'bg-blue-400' :
                        schedule.status === 'in_progress' ? 'bg-orange-400' :
                        'bg-green-400'
                      }`}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Team Leaders Tab - Drag & Drop Simple */}
      {activeTab === 'teams' && (
        <TeamManagementDragDrop activeTab={activeTab} />
      )}

      {/* Team Leaders Tab ANCIEN (désactivé) */}
      {activeTab === 'teams_disabled_old' && (
        <div className="grid gap-4">
          {teamLeaders.length === 0 ? (
            <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <UserPlus className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun chef d'équipe</h3>
                <p className="text-gray-500">Ajoutez votre premier chef d'équipe pour commencer.</p>
              </CardContent>
            </Card>
          ) : (
            teamLeaders.map((leader) => (
              <Card key={leader.id} className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: leader.couleur }}
                      >
                        {leader.prenom.charAt(0)}{leader.nom.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{leader.prenom} {leader.nom}</h3>
                        <p className="text-gray-600">{leader.specialite}</p>
                        <div className="mt-2 space-y-1 text-sm text-gray-500">
                          <p>📧 {leader.email}</p>
                          <p>📱 {leader.telephone}</p>
                          <p>🏷️ Couleur: <span className="inline-block w-4 h-4 rounded ml-1" style={{ backgroundColor: leader.couleur }}></span></p>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Ajouté le {new Date(leader.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="rounded-xl">
                        <Edit className="h-4 w-4 mr-1" />
                        Modifier
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => removeTeamLeader(leader.id)}
                        className="rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Collaborators Tab */}
      {activeTab === 'collaborators' && (
        <div className="grid gap-4">
          {collaborators.length === 0 ? (
            <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun collaborateur</h3>
                <p className="text-gray-500">Ajoutez votre premier collaborateur pour commencer.</p>
              </CardContent>
            </Card>
          ) : (
            collaborators.map((collaborator) => {
              const teamLeader = teamLeaders.find(tl => tl.id === collaborator.team_leader_id);
              return (
                <Card key={collaborator.id} className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex items-start space-x-3 sm:space-x-4 min-w-0 flex-1">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-xl flex-shrink-0 flex items-center justify-center">
                          <Users className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-base sm:text-xl font-bold text-gray-900 truncate">{collaborator.first_name} {collaborator.last_name}</h3>
                            {collaborator.is_invited && (
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                ✓ Invité
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">🔧 {collaborator.role || 'TECHNICIEN'}</p>
                          <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                            {collaborator.email && !collaborator.email.includes('@temp-skyapp.local') && (
                              <p className="truncate">📧 {collaborator.email}</p>
                            )}
                            <p>📱 {collaborator.phone || '-'}</p>
                          </div>
                          <p className="text-xs text-gray-400 mt-2 sm:mt-3">Ajouté le {new Date(collaborator.created_at).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2 sm:flex-shrink-0 ml-13 sm:ml-0">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="rounded-xl text-xs sm:text-sm"
                          onClick={() => openEditCollaboratorModal(collaborator)}
                        >
                          <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                          Modifier
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => removeCollaborator(collaborator.id)}
                          className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-xs sm:text-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Invitations Tab */}
      {activeTab === 'invitations' && (
        <div className="grid gap-4">
          {acceptedInvites.length === 0 ? (
            <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <UserPlus className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune personne invitée</h3>
                <p className="text-gray-500">Les personnes qui ont accepté vos invitations apparaîtront ici et pourront être assignées aux équipes.</p>
              </CardContent>
            </Card>
          ) : (
            acceptedInvites.map((invitation) => (
              <Card key={invitation.id} className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex items-start space-x-3 sm:space-x-4 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-100 to-blue-100 rounded-xl flex-shrink-0 flex items-center justify-center">
                        <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                          {invitation.firstName} {invitation.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">Rôle: {invitation.role}</p>
                        <div className="mt-2 space-y-1 text-xs sm:text-sm text-gray-500">
                          <p className="truncate">📧 {invitation.email}</p>
                          {invitation.phone && <p>📱 {invitation.phone}</p>}
                          <p>🛠️ Compétences: {invitation.skills || 'Généraliste'}</p>
                          <p>✅ Accepté le: {new Date(invitation.accepted_at || invitation.createdAt).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5 sm:space-x-2">
                          {invitation.usedAsTeamLeader && (
                            <Badge className="bg-purple-100 text-purple-700 text-xs">
                              👑 Chef assigné
                            </Badge>
                          )}
                          {invitation.usedAsCollaborator && (
                            <Badge className="bg-blue-100 text-blue-700 text-xs">
                              🤝 Collab. assigné
                            </Badge>
                          )}
                          {!invitation.usedAsTeamLeader && !invitation.usedAsCollaborator && (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              ✅ Disponible
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2 ml-13 sm:ml-0">
                      {!invitation.usedAsTeamLeader && (
                        <Button 
                          size="sm"
                          onClick={() => addInvitedPersonAsTeamLeader(invitation)}
                          className="bg-gray-800 hover:bg-black text-white rounded-xl text-xs px-3 py-2"
                        >
                          👑 Chef
                        </Button>
                      )}
                      {!invitation.usedAsCollaborator && (
                        <Button 
                          size="sm"
                          onClick={() => addInvitedPersonAsCollaborator(invitation)}
                          className="bg-gray-600 hover:bg-gray-700 text-white rounded-xl text-xs px-3 py-2"
                        >
                          🤝 Collab.
                        </Button>
                      )}
                      {(invitation.usedAsTeamLeader || invitation.usedAsCollaborator) && (
                        <div className="text-center">
                          <p className="text-xs text-green-600 font-medium">✅ Assigné</p>
                          <p className="text-xs text-gray-500">Déjà dans l'équipe</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Modals for Forms */}
      
      {/* Team Leader Form Modal */}
      {showTeamLeaderForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full mx-4">
            <CardHeader className="bg-gradient-to-r from-gray-900 to-black text-white rounded-t-3xl pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold mb-1">👥 Nouveau Chef d'équipe</CardTitle>
                  <p className="text-gray-300 text-sm">Sélectionnez un membre invité pour en faire un chef d'équipe</p>
                </div>
                <Button
                  onClick={() => {
                    setShowTeamLeaderForm(false);
                    setSelectedExistingUser(null);
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-xl p-4">
                <p className="text-sm text-blue-800 font-medium">
                  ℹ️ Seuls les membres invités peuvent devenir chefs d'équipe
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Utilisez le bouton "+ Collaborateur" pour inviter de nouveaux membres
                </p>
              </div>

              {/* Liste des utilisateurs disponibles */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  👤 Sélectionnez un membre
                </label>
                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {collaborators
                    .filter(c => !teamLeaders.find(tl => tl.user_id === c.id)) // Exclure ceux déjà chefs d'équipe
                    .filter(c => {
                      // Ne garder que les utilisateurs invités par email (avec un vrai email)
                      // Exclure les utilisateurs créés manuellement avec email temporaire
                      const hasValidEmail = c.email && c.email.includes('@');
                      const isNotTemporaryEmail = !c.email?.includes('@temp-skyapp.local');
                      const isNotVirtual = !c.is_virtual;
                      
                      // Debug: afficher tous les utilisateurs filtrés
                      if (hasValidEmail && !isNotTemporaryEmail) {
                        console.log(`❌ Exclu (email temporaire): ${c.first_name} ${c.last_name} - ${c.email}`);
                      }
                      
                      return hasValidEmail && isNotTemporaryEmail && isNotVirtual;
                    })
                    .map(collab => {
                      const badgeColors = {
                        'ADMIN': 'bg-purple-100 text-purple-800 border-purple-300',
                        'BUREAU': 'bg-blue-100 text-blue-800 border-blue-300',
                        'TECHNICIEN': 'bg-green-100 text-green-800 border-green-300'
                      };
                      const badgeColor = badgeColors[collab.role] || 'bg-gray-100 text-gray-800 border-gray-300';
                      
                      return (
                        <div
                          key={collab.id}
                          onClick={() => {
                            setSelectedExistingUser(collab.id);
                            setTeamLeaderData({
                              nom: collab.last_name || collab.nom || '',
                              prenom: collab.first_name || collab.prenom || '',
                              email: collab.email || '',
                              telephone: collab.phone || collab.telephone || '',
                              specialite: 'Supervision',
                              couleur: '#3B82F6'
                            });
                          }}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                            selectedExistingUser === collab.id
                              ? 'border-black bg-gray-50 shadow-md'
                              : 'border-gray-200 hover:border-gray-400 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                                selectedExistingUser === collab.id ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'
                              }`}>
                                {(collab.first_name || collab.prenom || 'U')[0]}{(collab.last_name || collab.nom || 'U')[0]}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {collab.first_name || collab.prenom} {collab.last_name || collab.nom}
                                </p>
                                <p className="text-sm text-gray-600">{collab.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeColor}`}>
                                {collab.role}
                              </span>
                              {selectedExistingUser === collab.id && (
                                <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                                  <span className="text-white text-lg">✓</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {collaborators.filter(c => !teamLeaders.find(tl => tl.user_id === c.id)).length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <p className="text-gray-500 font-medium">Aucun membre disponible</p>
                  <p className="text-sm text-gray-400 mt-1">Tous les membres ont déjà été assignés comme chefs d'équipe</p>
                </div>
              )}
              
              <div className="flex space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setShowTeamLeaderForm(false);
                  setSelectedExistingUser(null);
                }} className="flex-1 rounded-xl py-3">
                  Annuler
                </Button>
                <Button 
                  onClick={addTeamLeader} 
                  disabled={!selectedExistingUser}
                  className="flex-1 bg-gradient-to-r from-gray-900 to-black hover:from-black hover:to-gray-800 text-white rounded-xl py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Ajouter Chef d'équipe
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Collaborator Form Modal */}
      {showCollaboratorForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold text-gray-900">Nouveau Collaborateur</CardTitle>
                <Button
                  onClick={() => setShowCollaboratorForm(false)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Prénom *"
                  value={collaboratorData.prenom}
                  onChange={(e) => setCollaboratorData(prev => ({...prev, prenom: e.target.value}))}
                  className="rounded-xl border-gray-200"
                />
                <Input
                  placeholder="Nom *"
                  value={collaboratorData.nom}
                  onChange={(e) => setCollaboratorData(prev => ({...prev, nom: e.target.value}))}
                  className="rounded-xl border-gray-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chef d'équipe (optionnel)
                </label>
                <select
                  value={collaboratorData.team_leader_id}
                  onChange={(e) => setCollaboratorData(prev => ({...prev, team_leader_id: e.target.value}))}
                  className="w-full rounded-xl border border-gray-200 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 p-3"
                >
                  <option value="">Non assigné - Je l'assignerai plus tard dans Équipes</option>
                  {teamLeaders.map(leader => (
                    <option key={leader.id} value={leader.id}>
                      {leader.prenom} {leader.nom} - {leader.specialite}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  💡 Vous pourrez assigner ce collaborateur à un chef d'équipe depuis l'onglet Équipes
                </p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs text-blue-700">
                  ℹ️ Ce collaborateur n'aura pas de compte Skyapp. Il sera uniquement visible dans la gestion du planning.
                </p>
              </div>
              
              <Input
                placeholder="Téléphone (optionnel)"
                value={collaboratorData.telephone}
                onChange={(e) => setCollaboratorData(prev => ({...prev, telephone: e.target.value}))}
                className="rounded-xl border-gray-200"
              />
              
              <div className="flex space-x-3 pt-4">
                <Button variant="outline" onClick={() => setShowCollaboratorForm(false)} className="flex-1">
                  Annuler
                </Button>
                <Button onClick={addCollaborator} className="flex-1 bg-gray-700 hover:bg-gray-800 text-white">
                  Ajouter Collaborateur
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Collaborator Modal */}
      {showEditCollaboratorModal && editingCollaborator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold text-gray-900">
                  Modifier le collaborateur
                </CardTitle>
                <Button
                  onClick={() => setShowEditCollaboratorModal(false)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEditCollaborator} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prénom *
                    </label>
                    <Input
                      placeholder="Prénom"
                      value={editCollaboratorData.first_name}
                      onChange={(e) => setEditCollaboratorData(prev => ({...prev, first_name: e.target.value}))}
                      className="rounded-xl border-gray-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom *
                    </label>
                    <Input
                      placeholder="Nom"
                      value={editCollaboratorData.last_name}
                      onChange={(e) => setEditCollaboratorData(prev => ({...prev, last_name: e.target.value}))}
                      className="rounded-xl border-gray-200"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <Input
                    placeholder="Téléphone"
                    value={editCollaboratorData.phone}
                    onChange={(e) => setEditCollaboratorData(prev => ({...prev, phone: e.target.value}))}
                    className="rounded-xl border-gray-200"
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setShowEditCollaboratorModal(false)} 
                    className="flex-1 rounded-xl"
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                  >
                    Enregistrer
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Schedule Form Modal */}
      {showScheduleForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold mb-1">📅 Nouveau Planning</CardTitle>
                  <p className="text-purple-100 text-sm">Créez une nouvelle intervention pour votre équipe</p>
                </div>
                <Button
                  onClick={() => setShowScheduleForm(false)}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Navigation Bar - Type d'intervention */}
              <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-2xl p-2 flex gap-2">
                <button
                  onClick={() => setScheduleData(prev => ({
                    ...prev,
                    intervention_category: 'worksite',
                    client_name: '',
                    client_address: '',
                    client_contact: '',
                    worksite_id: prev.intervention_category !== 'worksite' ? '' : prev.worksite_id
                  }))}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                    scheduleData.intervention_category === 'worksite'
                      ? 'bg-white text-purple-600 shadow-lg scale-105'
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  🏗️ Chantier Existant
                </button>
                <button
                  onClick={() => setScheduleData(prev => ({
                    ...prev,
                    intervention_category: 'rdv',
                    worksite_id: '',
                    client_name: prev.intervention_category !== 'rdv' ? '' : prev.client_name,
                    client_address: prev.intervention_category !== 'rdv' ? '' : prev.client_address,
                    client_contact: prev.intervention_category !== 'rdv' ? '' : prev.client_contact
                  }))}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                    scheduleData.intervention_category === 'rdv'
                      ? 'bg-white text-purple-600 shadow-lg scale-105'
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  📅 Rendez-vous
                </button>
                <button
                  onClick={() => setScheduleData(prev => ({
                    ...prev,
                    intervention_category: 'urgence',
                    worksite_id: '',
                    client_name: prev.intervention_category !== 'urgence' ? '' : prev.client_name,
                    client_address: prev.intervention_category !== 'urgence' ? '' : prev.client_address,
                    client_contact: prev.intervention_category !== 'urgence' ? '' : prev.client_contact
                  }))}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                    scheduleData.intervention_category === 'urgence'
                      ? 'bg-white text-red-600 shadow-lg scale-105'
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  🚨 Urgence
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Chantier existant ou Informations Client */}
              {scheduleData.intervention_category === 'worksite' ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    🏗️ Sélectionnez le Chantier
                  </label>
                  <select
                    value={scheduleData.worksite_id}
                    onChange={(e) => setScheduleData(prev => ({...prev, worksite_id: e.target.value}))}
                    className="w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 p-3 bg-white shadow-sm transition-all"
                  >
                    <option value="">Choisissez un chantier *</option>
                    {worksites.map(worksite => {
                      // Vérifier si ce chantier a déjà des plannings
                      const hasSchedules = schedules.some(s => s.worksite_id === worksite.id);
                      return (
                        <option key={worksite.id} value={worksite.id}>
                          {hasSchedules ? '📅 ' : ''}{worksite.title}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    📅 = Chantier déjà planifié
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      👤 Nom du Client *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Dupont SA"
                      value={scheduleData.client_name}
                      onChange={(e) => setScheduleData(prev => ({...prev, client_name: e.target.value}))}
                      className="w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 p-3 bg-white shadow-sm transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      📍 Adresse d'Intervention *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 123 Rue de la République, 75001 Paris"
                      value={scheduleData.client_address}
                      onChange={(e) => setScheduleData(prev => ({...prev, client_address: e.target.value}))}
                      className="w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 p-3 bg-white shadow-sm transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      📞 Coordonnées du Client
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 06 12 34 56 78 ou contact@client.fr"
                      value={scheduleData.client_contact}
                      onChange={(e) => setScheduleData(prev => ({...prev, client_contact: e.target.value}))}
                      className="w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 p-3 bg-white shadow-sm transition-all"
                    />
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    👤 Chef d'équipe {scheduleData.intervention_category === 'rdv' ? '(optionnel)' : '*'}
                  </label>
                  <select
                    value={scheduleData.team_leader_id}
                    onChange={async (e) => {
                      const teamLeaderId = e.target.value;
                      
                      // Auto-sélectionner le premier collaborateur de cette équipe
                      if (teamLeaderId) {
                        try {
                          const token = localStorage.getItem('token');
                          const headers = { 'Authorization': `Bearer ${token}` };
                          
                          // Récupérer les collaborateurs de ce chef d'équipe via l'API
                          const response = await axios.get(`${API}/team-leaders/${teamLeaderId}/collaborators`, { headers });
                          console.log('📦 [AutoSelect] Réponse API collaborateurs:', response.data);
                          
                          // Extraire le premier collaborateur disponible
                          let firstCollaboratorId = '';
                          if (response.data && response.data.length > 0) {
                            const firstItem = response.data[0];
                            // La réponse peut avoir une structure imbriquée
                            if (firstItem.collaborator && firstItem.collaborator.id) {
                              firstCollaboratorId = firstItem.collaborator.id;
                            } else if (firstItem.collaborator_id) {
                              firstCollaboratorId = firstItem.collaborator_id;
                            } else if (firstItem.id) {
                              firstCollaboratorId = firstItem.id;
                            }
                          }
                          
                          console.log('🎯 [AutoSelect] Premier collaborateur sélectionné:', firstCollaboratorId);
                          
                          setScheduleData(prev => ({
                            ...prev,
                            team_leader_id: teamLeaderId,
                            collaborator_id: firstCollaboratorId
                          }));
                        } catch (error) {
                          console.error('❌ [AutoSelect] Erreur chargement collaborateurs:', error);
                          setScheduleData(prev => ({
                            ...prev,
                            team_leader_id: teamLeaderId,
                            collaborator_id: ''
                          }));
                        }
                      } else {
                        setScheduleData(prev => ({
                          ...prev,
                          team_leader_id: '',
                          collaborator_id: ''
                        }));
                      }
                    }}
                    className="w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 p-3 bg-white shadow-sm transition-all"
                  >
                    <option value="">{scheduleData.intervention_category === 'rdv' ? 'Sélectionner (optionnel)' : 'Sélectionner *'}</option>
                    {teamLeaders.map(leader => (
                      <option key={leader.id} value={leader.id}>
                        {leader.prenom} {leader.nom}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    👥 Collaborateur principal {scheduleData.intervention_category === 'rdv' ? '(optionnel)' : '*'}
                  </label>
                  <select
                    value={scheduleData.collaborator_id}
                    onChange={(e) => setScheduleData(prev => ({...prev, collaborator_id: e.target.value}))}
                    className="w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 p-3 bg-white shadow-sm transition-all"
                  >
                    <option value="">
                      {scheduleData.intervention_category === 'rdv' ? 'Sélectionner (optionnel)' : 'Sélectionner *'}
                    </option>
                    {collaborators.map(collaborator => (
                      <option key={collaborator.id} value={collaborator.id}>
                        {collaborator.first_name || collaborator.prenom} {collaborator.last_name || collaborator.nom}
                      </option>
                    ))}
                  </select>
                  {scheduleData.team_leader_id && scheduleData.intervention_category === 'worksite' && (
                    <p className="text-xs text-gray-500 mt-2">
                      💡 Le premier collaborateur de l'équipe a été sélectionné automatiquement
                    </p>
                  )}
                </div>

                {/* NOUVEAU : Sélection multiple de collaborateurs supplémentaires */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    ➕ Collaborateurs supplémentaires (optionnel)
                  </label>
                  <div className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50 max-h-48 overflow-y-auto">
                    {collaborators.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">Aucun collaborateur disponible</p>
                    ) : (
                      <div className="space-y-2">
                        {collaborators
                          .filter(c => c.id !== scheduleData.collaborator_id) // Exclure le collaborateur principal
                          .map(collaborator => (
                          <label 
                            key={collaborator.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={scheduleData.additional_collaborators.includes(collaborator.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setScheduleData(prev => ({
                                    ...prev,
                                    additional_collaborators: [...prev.additional_collaborators, collaborator.id]
                                  }));
                                } else {
                                  setScheduleData(prev => ({
                                    ...prev,
                                    additional_collaborators: prev.additional_collaborators.filter(id => id !== collaborator.id)
                                  }));
                                }
                              }}
                              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700">
                              {collaborator.first_name || collaborator.prenom} {collaborator.last_name || collaborator.nom}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {scheduleData.additional_collaborators.length > 0 && (
                    <p className="text-xs text-purple-600 mt-2">
                      ✓ {scheduleData.additional_collaborators.length} collaborateur(s) supplémentaire(s) sélectionné(s)
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    📅 Date de l'intervention
                  </label>
                  <input
                    type="date"
                    value={scheduleData.date}
                    onChange={(e) => setScheduleData(prev => ({...prev, date: e.target.value}))}
                    className="w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 p-3 bg-white shadow-sm transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    ⏰ Heure de début
                  </label>
                  <input
                    type="time"
                    value={scheduleData.time}
                    onChange={(e) => setScheduleData(prev => ({...prev, time: e.target.value}))}
                    className="w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 p-3 bg-white shadow-sm transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  🕒 Durée de l'intervention
                </label>
                <select
                  value={scheduleData.shift}
                  onChange={(e) => setScheduleData(prev => ({...prev, shift: e.target.value}))}
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 p-3 bg-white shadow-sm transition-all"
                >
                  {SHIFT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  📝 Description (optionnel)
                </label>
                <textarea
                  placeholder="Détails sur l'intervention prévue..."
                  value={scheduleData.description}
                  onChange={(e) => setScheduleData(prev => ({...prev, description: e.target.value}))}
                  rows={3}
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 p-3 resize-none bg-white shadow-sm transition-all"
                />
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 border-2 border-purple-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">✓</span>
                  </div>
                  <h4 className="font-bold text-purple-900 text-lg">Résumé du planning</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-purple-900 min-w-[110px] flex-shrink-0">🚨 Type :</span>
                    <span className="text-purple-700 flex-1">
                      {scheduleData.intervention_category === 'urgence' ? '🚨 Urgence' : 
                       scheduleData.intervention_category === 'worksite' ? '🏗️ Chantier' : 
                       '📅 Rendez-vous'}
                    </span>
                  </div>
                  {scheduleData.intervention_category === 'worksite' && scheduleData.worksite_id && (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-purple-900 min-w-[110px] flex-shrink-0">🏗️ Chantier :</span>
                      <span className="text-purple-700 flex-1">{getWorksiteName(scheduleData.worksite_id)}</span>
                    </div>
                  )}
                  {scheduleData.intervention_category !== 'worksite' && scheduleData.client_name && (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-purple-900 min-w-[110px] flex-shrink-0">👤 Client :</span>
                      <span className="text-purple-700 flex-1">{scheduleData.client_name}</span>
                    </div>
                  )}
                  {scheduleData.client_address && (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-purple-900 min-w-[110px] flex-shrink-0">📍 Adresse :</span>
                      <span className="text-purple-700 flex-1">{scheduleData.client_address}</span>
                    </div>
                  )}
                  {scheduleData.client_contact && (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-purple-900 min-w-[110px] flex-shrink-0">📞 Contact :</span>
                      <span className="text-purple-700 flex-1">{scheduleData.client_contact}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-purple-900 min-w-[110px] flex-shrink-0">� Équipe :</span>
                    <span className="text-purple-700 flex-1">{getTeamMembersDisplay(scheduleData.team_leader_id, scheduleData.collaborator_id)}</span>
                  </div>
                  {scheduleData.collaborator_id && (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-purple-900 min-w-[110px] flex-shrink-0">👤 Collaborateur :</span>
                      <span className="text-purple-700 flex-1">{getCollaboratorName(scheduleData.collaborator_id)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-purple-900 min-w-[110px]">🕒 Horaire :</span>
                    <span className="text-purple-700">{getShiftLabel(scheduleData.shift)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-purple-900 min-w-[110px]">📅 Date :</span>
                    <span className="text-purple-700">{scheduleData.date ? new Date(scheduleData.date).toLocaleDateString('fr-FR') : 'Non définie'}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-4 pt-6 border-t-2 border-gray-100">
                <Button 
                  variant="outline" 
                  onClick={() => setShowScheduleForm(false)} 
                  className="flex-1 rounded-xl py-3 border-2 hover:bg-gray-50 font-semibold transition-all"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={addSchedule} 
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl py-3 font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  ✨ Créer Planning
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* NEW: Day Detail Modal */}
      {showDayDetail && selectedDayData && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Planning du {selectedDayData.date.toLocaleDateString('fr-FR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Détail complet de la journée • {selectedDayData.totalHours}h programmées • {selectedDayData.availableSlots} créneaux libres
                  </p>
                </div>
                <Button
                  onClick={() => setShowDayDetail(false)}
                  variant="outline"
                  className="rounded-xl px-4 py-2"
                >
                  <X className="h-4 w-4 mr-2" />
                  Fermer
                </Button>
              </div>

              {/* Day Statistics */}
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedDayData.schedules.length}</div>
                  <div className="text-sm text-blue-700">Interventions</div>
                </div>
                <div className="bg-purple-50 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{selectedDayData.teams.length}</div>
                  <div className="text-sm text-purple-700">Équipes</div>
                </div>
                <div className="bg-green-50 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{selectedDayData.collaborators.length}</div>
                  <div className="text-sm text-green-700">Collaborateurs</div>
                </div>
                <div className="bg-orange-50 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{selectedDayData.totalHours}h</div>
                  <div className="text-sm text-orange-700">Total Heures</div>
                </div>
              </div>

              {/* Interventions Details - Grouped by Team */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Interventions Programmées</h3>
                  {selectedDayData.schedules.length === 0 ? (
                    <div className="bg-gray-50 rounded-2xl p-8 text-center">
                      <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-600">Aucune intervention programmée pour cette journée</p>
                      <Button
                        onClick={() => {
                          setShowDayDetail(false);
                          setShowScheduleForm(true);
                        }}
                        className="mt-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-6 py-2"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Programmer une intervention
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Group schedules by team leader */}
                      {(() => {
                        const schedulesByTeam = selectedDayData.schedules.reduce((acc, schedule) => {
                          const teamId = schedule.team_leader_id || 'unassigned';
                          if (!acc[teamId]) acc[teamId] = [];
                          acc[teamId].push(schedule);
                          return acc;
                        }, {});

                        return Object.entries(schedulesByTeam).map(([teamId, teamSchedules]) => {
                          const teamLeader = teamId !== 'unassigned' ? teamLeaders.find(tl => tl.id === teamId) : null;
                          const teamColor = teamLeader?.couleur || '#6B7280';
                          
                          return (
                            <div key={teamId} className="bg-gradient-to-br from-white to-gray-50 border-2 rounded-2xl shadow-lg overflow-hidden">
                              {/* Team Header */}
                              <div 
                                className="p-4 flex items-center space-x-4"
                                style={{ 
                                  background: `linear-gradient(135deg, ${teamColor}20, ${teamColor}10)`,
                                  borderBottom: `3px solid ${teamColor}`
                                }}
                              >
                                <div 
                                  className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
                                  style={{ backgroundColor: teamColor }}
                                >
                                  {teamLeader ? `${teamLeader.prenom?.charAt(0)}${teamLeader.nom?.charAt(0)}` : '?'}
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-lg font-bold text-gray-900">
                                    {teamLeader ? `${teamLeader.prenom} ${teamLeader.nom}` : 
                                     (teamSchedules[0]?.collaborator_id ? getCollaboratorName(teamSchedules[0].collaborator_id) : 'Non assigné')}
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    {teamLeader?.specialite || (teamSchedules[0]?.collaborator_id ? 'Collaborateur' : 'Aucune équipe')} • {teamSchedules.length} intervention{teamSchedules.length > 1 ? 's' : ''}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold" style={{ color: teamColor }}>
                                    {teamSchedules.reduce((sum, s) => sum + (parseInt(s.hours) || 0), 0)}h
                                  </div>
                                  <div className="text-xs text-gray-600">Total</div>
                                </div>
                              </div>

                              {/* Team Schedules */}
                              <div className="p-4 space-y-3">
                                {teamSchedules.map((schedule, idx) => (
                                  <div 
                                    key={schedule.id || idx} 
                                    className="bg-white border-2 rounded-xl p-4 hover:shadow-md transition-all"
                                    style={{ borderLeftWidth: '4px', borderLeftColor: teamColor }}
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        {/* Time and Title */}
                                        <div className="flex items-center space-x-3 mb-3">
                                          <span 
                                            className="text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm"
                                            style={{ backgroundColor: teamColor }}
                                          >
                                            {schedule.time || '08:00'}
                                          </span>
                                          <h5 className="text-base font-bold text-gray-900">
                                            {schedule.intervention_category === 'worksite' && schedule.worksite_id 
                                              ? getWorksiteName(schedule.worksite_id)
                                              : (schedule.client_name || 'Client')
                                            }
                                          </h5>
                                          {schedule.intervention_category && (
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                              schedule.intervention_category === 'urgence' 
                                                ? 'bg-red-100 text-red-700' 
                                                : schedule.intervention_category === 'worksite'
                                                  ? 'bg-indigo-100 text-indigo-700'
                                                  : 'bg-blue-100 text-blue-700'
                                            }`}>
                                              {schedule.intervention_category === 'urgence' ? '🚨 Urgence' : 
                                               schedule.intervention_category === 'worksite' ? '🏗️ Chantier' :
                                               '📅 RDV'}
                                            </span>
                                          )}
                                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                            {getShiftLabel(schedule.shift)} - {schedule.hours}h
                                          </span>
                                        </div>

                                        {/* Details Grid */}
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                          {schedule.client_address && (
                                            <div className="bg-gray-50 rounded-lg p-2 col-span-2">
                                              <p className="text-xs text-gray-500 mb-1">📍 Adresse</p>
                                              <p className="text-sm font-semibold text-gray-900">
                                                {schedule.client_address}
                                              </p>
                                            </div>
                                          )}
                                          {schedule.client_contact && (
                                            <div className="bg-gray-50 rounded-lg p-2">
                                              <p className="text-xs text-gray-500 mb-1">📞 Contact</p>
                                              <p className="text-sm font-semibold text-gray-900">
                                                {schedule.client_contact}
                                              </p>
                                            </div>
                                          )}
                                          <div className="bg-gray-50 rounded-lg p-2">
                                            <p className="text-xs text-gray-500 mb-1">Collaborateur</p>
                                            <p className="text-sm font-semibold text-gray-900">
                                              {getCollaboratorName(schedule.collaborator_id)}
                                            </p>
                                          </div>
                                          <div className="bg-gray-50 rounded-lg p-2">
                                            <p className="text-xs text-gray-500 mb-1">Statut</p>
                                            <p className="text-sm font-semibold">
                                              <span className={
                                                schedule.status === 'completed' ? 'text-green-600' :
                                                schedule.status === 'in_progress' ? 'text-blue-600' :
                                                schedule.status === 'cancelled' ? 'text-red-600' :
                                                'text-orange-600'
                                              }>
                                                {schedule.status === 'completed' ? '✓ Terminé' :
                                                 schedule.status === 'in_progress' ? '⟳ En cours' :
                                                 schedule.status === 'cancelled' ? '✗ Annulé' :
                                                 '○ Planifié'}
                                              </span>
                                            </p>
                                          </div>
                                        </div>

                                        {/* Description */}
                                        {schedule.description && (
                                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                                            <p className="text-xs text-blue-800">
                                              <strong>Note:</strong> {schedule.description}
                                            </p>
                                          </div>
                                        )}
                                      </div>

                                      {/* Actions */}
                                      <div className="flex flex-col space-y-2 ml-4">
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          className="rounded-lg text-xs px-3 py-1.5"
                                          onClick={() => {
                                            setEditingSchedule(schedule);
                                            setScheduleData({
                                              worksite_id: schedule.worksite_id,
                                              team_leader_id: schedule.team_leader_id,
                                              collaborator_id: schedule.collaborator_id,
                                              date: schedule.date,
                                              time: schedule.time,
                                              shift: schedule.shift,
                                              hours: schedule.hours,
                                              description: schedule.description
                                            });
                                            setShowDayDetail(false);
                                            setShowScheduleForm(true);
                                          }}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          className="rounded-lg text-xs border-red-200 text-red-600 hover:bg-red-50 px-3 py-1.5"
                                          onClick={() => deleteSchedule(schedule.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>

                {/* Team Assignment Section */}
                {selectedDayData.teams.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Équipes Assignées</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {selectedDayData.teams.map((team, index) => (
                        <div key={team.id || index} className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-4">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                              style={{ backgroundColor: team.couleur }}
                            >
                              {team.prenom.charAt(0)}{team.nom.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{team.prenom} {team.nom}</h4>
                              <p className="text-sm text-gray-600">{team.specialite}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="bg-gray-50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h3>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => {
                        setShowDayDetail(false);
                        setShowScheduleForm(true);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Nouvelle Intervention
                    </Button>
                    <Button
                      onClick={() => {
                        setShowDayDetail(false);
                        setShowTeamLeaderForm(true);
                      }}
                      variant="outline"
                      className="rounded-xl"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assigner Équipe
                    </Button>
                    <Button variant="outline" className="rounded-xl">
                      <Clock className="h-4 w-4 mr-2" />
                      Gestion Horaires
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Planification de Chantier */}
      {showPlanningModal && selectedWorksiteForPlanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl mx-4 max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-gray-800 to-gray-900 text-white p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">📅 Planifier le Chantier</h2>
                  <p className="text-gray-300 text-sm">{selectedWorksiteForPlanning.title}</p>
                </div>
                <button
                  onClick={() => setShowPlanningModal(false)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Chef d'équipe */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  👤 Chef d'Équipe
                </label>
                <select
                  value={planningData.team_leader_id}
                  onChange={async (e) => {
                    const teamLeaderId = e.target.value;
                    
                    // Auto-sélectionner les collaborateurs de cette équipe
                    if (teamLeaderId) {
                      try {
                        const token = localStorage.getItem('token');
                        const headers = { 'Authorization': `Bearer ${token}` };
                        
                        // Récupérer les collaborateurs de ce chef d'équipe via l'API
                        const response = await axios.get(`${API}/team-leaders/${teamLeaderId}/collaborators`, { headers });
                        console.log('📦 Réponse API collaborateurs:', response.data);
                        
                        // Extraire les IDs des collaborateurs (gérer la structure imbriquée)
                        const teamCollaboratorIds = response.data.map(item => {
                          // La réponse peut avoir une structure imbriquée : item.collaborator.id ou item.collaborator_id
                          if (item.collaborator && item.collaborator.id) {
                            return item.collaborator.id;
                          } else if (item.collaborator_id) {
                            return item.collaborator_id;
                          } else if (item.id) {
                            return item.id;
                          }
                          return null;
                        }).filter(id => id !== null);
                        
                        console.log('🎯 Auto-sélection des collaborateurs pour le chef:', teamLeaderId, teamCollaboratorIds);
                        
                        setPlanningData(prev => ({
                          ...prev,
                          team_leader_id: teamLeaderId,
                          collaborator_ids: teamCollaboratorIds
                        }));
                      } catch (error) {
                        console.error('Erreur chargement collaborateurs équipe:', error);
                        setPlanningData(prev => ({
                          ...prev,
                          team_leader_id: teamLeaderId,
                          collaborator_ids: []
                        }));
                      }
                    } else {
                      setPlanningData(prev => ({
                        ...prev,
                        team_leader_id: '',
                        collaborator_ids: []
                      }));
                    }
                  }}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                  <option value="">Sélectionner un chef d'équipe...</option>
                  {teamLeaders.map(leader => (
                    <option key={leader.id} value={leader.id}>
                      {leader.prenom} {leader.nom} - {leader.specialite}
                    </option>
                  ))}
                </select>
              </div>

              {/* Collaborateurs */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  👥 Collaborateurs (optionnel)
                </label>
                
                {/* Barre de recherche */}
                <div className="mb-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="🔍 Rechercher un collaborateur..."
                      value={collaboratorSearch}
                      onChange={(e) => setCollaboratorSearch(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 pl-10 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      🔍
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 max-h-64 overflow-y-auto border-2 border-gray-200">
                  {collaborators.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Aucun collaborateur disponible</p>
                  ) : (
                    <>
                      {/* Debug: afficher les données brutes */}
                      {console.log('🔍 Collaborateurs à afficher:', collaborators)}
                      {collaborators
                        .filter(collab => {
                          const searchLower = collaboratorSearch.toLowerCase();
                          // Gérer les différents formats de nom possibles
                          const prenom = collab.prenom || collab.first_name || '';
                          const nom = collab.nom || collab.last_name || collab.name || '';
                          const email = collab.email || '';
                          const fullName = `${prenom} ${nom}`.toLowerCase();
                          const competences = (collab.competences || collab.skills || '').toLowerCase();
                          return fullName.includes(searchLower) || competences.includes(searchLower) || email.includes(searchLower);
                        })
                        .map(collab => {
                          // Gérer les différents formats de nom
                          const prenom = collab.prenom || collab.first_name || '';
                          const nom = collab.nom || collab.last_name || collab.name || '';
                          const displayName = prenom && nom ? `${prenom} ${nom}` : (collab.email || 'Utilisateur');
                          const competences = collab.competences || collab.skills || '';
                          
                          return (
                            <label key={collab.id} className="flex items-center space-x-3 p-3 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-300">
                              <input
                                type="checkbox"
                                checked={planningData.collaborator_ids.includes(collab.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setPlanningData(prev => ({
                                      ...prev,
                                      collaborator_ids: [...prev.collaborator_ids, collab.id]
                                    }));
                                  } else {
                                    setPlanningData(prev => ({
                                      ...prev,
                                      collaborator_ids: prev.collaborator_ids.filter(id => id !== collab.id)
                                    }));
                                  }
                                }}
                                className="w-5 h-5 text-gray-800 rounded focus:ring-gray-500"
                              />
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-gray-900">{displayName}</div>
                                <div className="text-xs text-gray-500">{collab.email}</div>
                                {competences && (
                                  <div className="text-xs text-gray-600">{competences}</div>
                                )}
                              </div>
                            </label>
                          );
                        })
                      }
                    </>
                  )}
                </div>
              </div>

              {/* Type d'intervention */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  ⏰ Type d'intervention
                </label>
                <select
                  value={planningData.shift_type}
                  onChange={(e) => setPlanningData(prev => ({...prev, shift_type: e.target.value}))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm"
                >
                  {SHIFT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📅 Date de début
                  </label>
                  <input
                    type="date"
                    value={planningData.start_date}
                    onChange={(e) => setPlanningData(prev => ({...prev, start_date: e.target.value}))}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📅 Date de fin
                  </label>
                  <input
                    type="date"
                    value={planningData.end_date}
                    onChange={(e) => setPlanningData(prev => ({...prev, end_date: e.target.value}))}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📝 Notes (optionnel)
                </label>
                <textarea
                  value={planningData.notes}
                  onChange={(e) => setPlanningData(prev => ({...prev, notes: e.target.value}))}
                  placeholder="Ajouter des notes pour l'équipe..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none"
                  rows="3"
                />
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4 border-t">
                <Button
                  onClick={() => setShowPlanningModal(false)}
                  variant="outline"
                  className="flex-1 rounded-xl py-3"
                >
                  Annuler
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      if (!planningData.team_leader_id) {
                        alert('⚠️ Veuillez sélectionner un chef d\'équipe');
                        return;
                      }
                      
                      if (!planningData.start_date) {
                        alert('⚠️ Veuillez sélectionner une date de début');
                        return;
                      }
                      
                      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
                      
                      console.log('📋 Données de planification:', planningData);
                      console.log('👥 Collaborateurs sélectionnés:', planningData.collaborator_ids);
                      
                      // Récupérer le chef d'équipe sélectionné
                      const selectedLeader = teamLeaders.find(tl => tl.id === planningData.team_leader_id);
                      
                      console.log('👤 Chef d\'équipe:', selectedLeader);
                      console.log('👤 Is virtual:', selectedLeader?.is_virtual);
                      
                      if (selectedLeader?.is_virtual) {
                        alert('⚠️ Ce chef d\'équipe est virtuel et n\'a pas été invité.\n\nVous devez d\'abord :\n1. Supprimer ce chef d\'équipe virtuel\n2. Inviter la personne en tant qu\'utilisateur\n3. Le recréer comme chef d\'équipe à partir du compte utilisateur');
                        return;
                      }
                      
                      // Si aucun collaborateur n'est sélectionné, vérifier qu'on a au moins le user_id du chef
                      const teamLeaderUserId = selectedLeader?.user_id;
                      const collaboratorsToSchedule = planningData.collaborator_ids.length > 0 
                        ? planningData.collaborator_ids 
                        : (teamLeaderUserId ? [teamLeaderUserId] : []); // Utiliser le user_id du chef comme collaborateur si disponible
                      
                      if (collaboratorsToSchedule.length === 0) {
                        alert('⚠️ Veuillez sélectionner au moins un collaborateur');
                        return;
                      }
                      
                      console.log('📅 Collaborateurs à planifier:', collaboratorsToSchedule);
                      
                      // Créer un schedule pour chaque collaborateur sélectionné ET pour chaque jour entre start_date et end_date
                      const selectedShiftOption = SHIFT_OPTIONS.find(s => s.value === planningData.shift_type) || SHIFT_OPTIONS[0];
                      
                      // Générer toutes les dates entre start_date et end_date
                      const startDate = new Date(planningData.start_date);
                      const endDate = planningData.end_date ? new Date(planningData.end_date) : startDate;
                      const allDates = [];
                      
                      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                        allDates.push(new Date(date).toISOString().split('T')[0]);
                      }
                      
                      console.log(`📅 Création de schedules pour ${allDates.length} jour(s):`, allDates);
                      
                      // Créer un schedule pour chaque combinaison (collaborateur x date)
                      const schedulePromises = [];
                      
                      for (const collabId of collaboratorsToSchedule) {
                        for (const dateStr of allDates) {
                          const scheduleData = {
                            worksite_id: selectedWorksiteForPlanning.id,
                            team_leader_id: planningData.team_leader_id,
                            collaborator_id: collabId,
                            date: dateStr,
                            time: planningData.shift_type === 'night' ? '20:00' : planningData.shift_type === 'afternoon' ? '14:00' : '08:00',
                            shift: planningData.shift_type,
                            hours: selectedShiftOption.hours,
                            description: planningData.notes || ''
                          };
                          
                          schedulePromises.push(axios.post(`${API}/schedules`, scheduleData, { headers }));
                        }
                      }
                      
                      // Attendre que tous les schedules soient créés
                      const results = await Promise.allSettled(schedulePromises);
                      
                      // Vérifier les échecs
                      const failed = results.filter(r => r.status === 'rejected');
                      const succeeded = results.filter(r => r.status === 'fulfilled');
                      
                      // Vérifier si des doublons ont été détectés
                      const duplicates = failed.filter(f => f.reason?.response?.status === 409);
                      
                      if (duplicates.length > 0 && succeeded.length === 0) {
                        alert('⚠️ Tous les plannings existent déjà !\n\nLes plannings pour ces dates sont déjà créés. Veuillez vérifier le calendrier.');
                        throw new Error('Tous les plannings existent déjà');
                      } else if (duplicates.length > 0) {
                        alert(`⚠️ Attention : ${duplicates.length} planning(s) existaient déjà et n'ont pas été créés.\n\n${succeeded.length} nouveau(x) planning(s) créé(s) avec succès.`);
                      }
                      
                      console.log('✅ Schedules créés:', succeeded.map(r => r.value.data));
                      
                      // Mettre à jour le chantier
                      await axios.put(`${API}/worksites/${selectedWorksiteForPlanning.id}`, {
                        team_leader_id: planningData.team_leader_id,
                        start_date: planningData.start_date,
                        end_date: planningData.end_date,
                        notes: planningData.notes,
                        status: 'IN_PROGRESS'
                      }, { headers });
                      
                      // Recharger toutes les données pour rafraîchir le calendrier
                      await loadPlanningData();
                      
                      alert(`✅ Chantier planifié avec succès ! ${results.length} intervention(s) créée(s)`);
                      setShowPlanningModal(false);
                      setPlanningData({
                        team_leader_id: '',
                        collaborator_ids: [],
                        start_date: '',
                        end_date: '',
                        notes: '',
                        shift_type: 'day'
                      });
                    } catch (error) {
                      console.error('Erreur planification:', error);
                      alert('❌ Erreur lors de la planification: ' + (error.response?.data?.detail || error.message));
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-black hover:to-gray-800 text-white rounded-xl py-3 font-semibold"
                >
                  Planifier
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détails du Créneau */}
      {showScheduleDetail && selectedSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* En-tête */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Détails de la Mission
                  </h2>
                  <p className="text-sm text-gray-500">
                    {new Date(selectedSchedule.date).toLocaleDateString('fr-FR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setShowScheduleDetail(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>

              {/* Informations principales */}
              <div className="space-y-4">
                {/* Client */}
                {(selectedSchedule.worksites?.clients?.prenom || selectedSchedule.worksites?.clients?.nom || selectedSchedule.worksites?.clients?.name) && (
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                        {selectedSchedule.worksites?.clients?.prenom?.[0] || selectedSchedule.worksites?.clients?.name?.[0] || '👤'}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-indigo-600 font-semibold mb-1">CLIENT</div>
                        <div className="font-bold text-gray-900 text-lg">
                          {selectedSchedule.worksites?.clients?.name || 
                           (selectedSchedule.worksites?.clients?.prenom && selectedSchedule.worksites?.clients?.nom 
                             ? `${selectedSchedule.worksites.clients.prenom} ${selectedSchedule.worksites.clients.nom}` 
                             : 'Client')}
                        </div>
                        {selectedSchedule.worksites?.clients?.email && (
                          <p className="text-sm text-gray-600 mt-1">
                            ✉️ {selectedSchedule.worksites.clients.email}
                          </p>
                        )}
                        {selectedSchedule.worksites?.clients?.phone && (
                          <p className="text-sm text-gray-600">
                            📞 {selectedSchedule.worksites.clients.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Chantier */}
                {selectedSchedule.worksites?.title && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">🏗️</span>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg mb-1">
                          {selectedSchedule.worksites.title}
                        </h3>
                        {(selectedSchedule.worksites.address || selectedSchedule.worksites.clients?.address) && (
                          <p className="text-sm text-gray-600 flex items-start space-x-1 mt-2">
                            <span className="flex-shrink-0">📍</span>
                            <span>{selectedSchedule.worksites.address || selectedSchedule.worksites.clients?.address}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Horaires */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs text-gray-500 font-semibold mb-1">HORAIRES</div>
                    <div className="text-lg font-bold text-gray-900">
                      {selectedSchedule.startTime} - {selectedSchedule.endTime}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs text-gray-500 font-semibold mb-1">DURÉE</div>
                    <div className="text-lg font-bold text-gray-900">
                      {selectedSchedule.hours}h
                    </div>
                  </div>
                </div>

                {/* Équipe */}
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center space-x-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    <span>Équipe assignée</span>
                  </h3>
                  <div className="space-y-3">
                    {/* Chef d'équipe */}
                    {selectedSchedule.teamLeader && (
                      <div className="flex items-center space-x-3 bg-white rounded-lg p-3">
                        <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center font-bold text-purple-800">
                          👤
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {selectedSchedule.teamLeader.prenom} {selectedSchedule.teamLeader.nom}
                          </div>
                          <div className="text-xs text-gray-500">
                            👨‍💼 Chef d'équipe
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Membre assigné */}
                    {selectedSchedule.member && (
                      <div className="flex items-center space-x-3 bg-white rounded-lg p-3">
                        <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center font-bold text-blue-800">
                          {(selectedSchedule.member.first_name?.[0] || '') + (selectedSchedule.member.last_name?.[0] || '')}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {selectedSchedule.member.first_name} {selectedSchedule.member.last_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {selectedSchedule.member.phone || 'Téléphone non renseigné'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description (titre du chantier/devis) */}
                {selectedSchedule.worksites?.title && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-bold text-gray-900 mb-2">Description</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {selectedSchedule.worksites.title}
                    </p>
                  </div>
                )}

                {/* Notes du chantier */}
                {selectedSchedule.worksites?.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center space-x-2">
                      <span>📝</span>
                      <span>Notes</span>
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {selectedSchedule.worksites.notes}
                    </p>
                  </div>
                )}

                {/* Notes du schedule */}
                {selectedSchedule.description && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-bold text-gray-900 mb-2">Notes additionnelles</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {selectedSchedule.description.replace(/^Planning pour\s*/i, '')}
                    </p>
                  </div>
                )}

                {/* Statut */}
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                  <span className="text-sm font-semibold text-gray-700">Statut</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedSchedule.status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : selectedSchedule.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedSchedule.status === 'completed' 
                      ? '✓ Terminé' 
                      : selectedSchedule.status === 'cancelled'
                        ? '✗ Annulé'
                        : '📅 Planifié'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col space-y-3 mt-6 pt-6 border-t">
                {/* Bouton Voir le devis/chantier */}
                {selectedSchedule.worksites && (
                  <Button
                    onClick={() => {
                      // Si le chantier a un quote_id, ouvrir le devis, sinon ouvrir la page chantier
                      if (selectedSchedule.worksites.quote_id) {
                        window.open(`/devis/${selectedSchedule.worksites.quote_id}`, '_blank');
                      } else if (selectedSchedule.worksites.id) {
                        // Naviguer vers la page des chantiers
                        alert(`Chantier: ${selectedSchedule.worksites.title}\nID: ${selectedSchedule.worksites.id}\n\n${selectedSchedule.worksites.quote_id ? 'Devis associé: ' + selectedSchedule.worksites.quote_id : 'Aucun devis associé'}`);
                      }
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 flex items-center justify-center space-x-2"
                  >
                    <span>📄</span>
                    <span>{selectedSchedule.worksites.quote_id ? 'Voir le Devis' : 'Infos Chantier'}</span>
                  </Button>
                )}
                
                <div className="flex space-x-3">
                  <Button
                    onClick={() => setShowScheduleDetail(false)}
                    variant="outline"
                    className="flex-1 rounded-xl py-3"
                  >
                    Fermer
                  </Button>
                  <Button
                    onClick={() => {
                      // Récupérer les dates de début et fin depuis le worksite ou utiliser la date du schedule
                      const startDate = selectedSchedule.worksites?.start_date || selectedSchedule.date;
                      const endDate = selectedSchedule.worksites?.end_date || selectedSchedule.date;
                      
                      setEditScheduleData({
                        start_date: startDate,
                        end_date: endDate,
                        team_leader_id: selectedSchedule.team_leader_id,
                        collaborator_id: selectedSchedule.collaborator_id
                      });
                      setShowEditScheduleModal(true);
                      setShowScheduleDetail(false);
                    }}
                    className="flex-1 bg-black hover:bg-gray-800 text-white rounded-xl py-3"
                  >
                    Modifier
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'édition du schedule */}
      {showEditScheduleModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900">Modifier la Mission</h2>
              <button
                onClick={() => setShowEditScheduleModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Date de début */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📅 Date de début
                </label>
                <Input
                  type="date"
                  value={editScheduleData.start_date}
                  onChange={(e) => setEditScheduleData({ ...editScheduleData, start_date: e.target.value })}
                  className="w-full"
                />
              </div>

              {/* Date de fin */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📅 Date de fin
                </label>
                <Input
                  type="date"
                  value={editScheduleData.end_date}
                  onChange={(e) => setEditScheduleData({ ...editScheduleData, end_date: e.target.value })}
                  className="w-full"
                />
              </div>

              {/* Chef d'équipe */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  👨‍💼 Chef d'équipe
                </label>
                <select
                  value={editScheduleData.team_leader_id}
                  onChange={(e) => setEditScheduleData({ ...editScheduleData, team_leader_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner un chef d'équipe</option>
                  {teamLeaders.map(leader => (
                    <option key={leader.id} value={leader.id}>
                      {leader.prenom} {leader.nom}
                    </option>
                  ))}
                </select>
              </div>

              {/* Collaborateur */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  👤 Collaborateur
                </label>
                <select
                  value={editScheduleData.collaborator_id}
                  onChange={(e) => setEditScheduleData({ ...editScheduleData, collaborator_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner un collaborateur</option>
                  {collaborators.map(collab => (
                    <option key={collab.id} value={collab.id}>
                      {collab.first_name} {collab.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Boutons d'action */}
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={() => setShowEditScheduleModal(false)}
                  variant="outline"
                  className="flex-1 rounded-xl py-3"
                >
                  Annuler
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token');
                      const headers = { 'Authorization': `Bearer ${token}` };
                      
                      // Si la mission a un worksite associé, on modifie le worksite
                      if (selectedSchedule.worksite_id) {
                        // Modifier les dates du worksite
                        await axios.put(`${API}/worksites/${selectedSchedule.worksite_id}`, {
                          start_date: editScheduleData.start_date,
                          end_date: editScheduleData.end_date
                        }, { headers });
                      }
                      
                      // Modifier le schedule (chef d'équipe et collaborateur)
                      await axios.put(`${API}/schedules/${selectedSchedule.id}`, {
                        team_leader_id: editScheduleData.team_leader_id,
                        collaborator_id: editScheduleData.collaborator_id
                      }, { headers });
                      
                      await loadPlanningData();
                      setShowEditScheduleModal(false);
                      alert('✅ Mission modifiée avec succès !');
                    } catch (error) {
                      console.error('Erreur modification schedule:', error);
                      alert('❌ Erreur lors de la modification');
                    }
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3"
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningManagement;