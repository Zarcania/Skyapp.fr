// Composant Bureau - Calendrier Planning avec Drag & Drop
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, ChevronLeft, ChevronRight, Users, MapPin, Clock, Plus, Edit, Trash2, X, AlertCircle } from 'lucide-react';

const API = process.env.REACT_APP_API_BASE_URL || `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'}/api`;

const BureauPlanningComponent = () => {
  // Composant optimisé pour mobile - v2
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'day'
  const [schedules, setSchedules] = useState([]);
  const [worksites, setWorksites] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedWorksite, setSelectedWorksite] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    worksite_id: '',
    collaborator_id: '',
    team_leader_id: '',
    date: '',
    time: '08:00',
    end_time: '17:00',
    hours: 8,
    description: '',
    status: 'scheduled',
  });
  const [editingSchedule, setEditingSchedule] = useState(null);

  useEffect(() => {
    loadData();
  }, [currentDate, viewMode]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Calculer plage de dates
      const { from, to } = getDateRange();

      // Charger en parallèle
      const [schedulesRes, worksitesRes, usersRes, leadersRes] = await Promise.all([
        axios.get(`${API}/schedules?from=${from}&to=${to}`, { headers }),
        axios.get(`${API}/worksites/validated`, { headers }),
        axios.get(`${API}/users`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/team-leaders`, { headers }).catch(() => ({ data: [] })),
      ]);

      setSchedules(schedulesRes.data || []);
      setWorksites(worksitesRes.data || []);
      setTechnicians((usersRes.data || []).filter(u => u.role === 'TECHNICIEN'));
      setTeamLeaders(leadersRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement:', error);
      setLoading(false);
    }
  };

  const getDateRange = () => {
    if (viewMode === 'day') {
      const day = currentDate.toISOString().split('T')[0];
      return { from: day, to: day };
    } else {
      // Semaine
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay() + 1); // Lundi
      const end = new Date(start);
      end.setDate(start.getDate() + 6); // Dimanche
      return {
        from: start.toISOString().split('T')[0],
        to: end.toISOString().split('T')[0],
      };
    }
  };

  const handleCreateSchedule = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (editingSchedule) {
        await axios.patch(`${API}/schedules/${editingSchedule.id}`, scheduleForm, { headers });
      } else {
        await axios.post(`${API}/schedules`, scheduleForm, { headers });
      }

      setShowScheduleModal(false);
      setEditingSchedule(null);
      resetForm();
      loadData();
    } catch (error) {
      if (error.response?.status === 409) {
        alert('⚠️ Conflit de planning: ce technicien a déjà une mission sur ce créneau');
      } else {
        console.error('Erreur création planning:', error);
        alert('Erreur lors de la création du planning');
      }
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce planning?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/schedules/${scheduleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadData();
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const resetForm = () => {
    setScheduleForm({
      worksite_id: '',
      collaborator_id: '',
      team_leader_id: '',
      date: '',
      time: '08:00',
      end_time: '17:00',
      hours: 8,
      description: '',
      status: 'scheduled',
    });
  };

  const openScheduleModal = (worksite = null, date = null) => {
    if (worksite) {
      setScheduleForm(prev => ({
        ...prev,
        worksite_id: worksite.id,
        date: date || new Date().toISOString().split('T')[0],
      }));
      setSelectedWorksite(worksite);
    }
    setShowScheduleModal(true);
  };

  const openEditModal = (schedule) => {
    setEditingSchedule(schedule);
    setScheduleForm({
      worksite_id: schedule.worksite_id,
      collaborator_id: schedule.collaborator_id,
      team_leader_id: schedule.team_leader_id || '',
      date: schedule.date,
      time: schedule.time,
      end_time: schedule.end_time || '',
      hours: schedule.hours || 8,
      description: schedule.description || '',
      status: schedule.status,
    });
    setShowScheduleModal(true);
  };

  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getSchedulesForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return schedules.filter(s => s.date === dateStr);
  };

  const handleDragStart = (e, worksite) => {
    e.dataTransfer.setData('worksite', JSON.stringify(worksite));
  };

  const handleDrop = (e, date) => {
    e.preventDefault();
    const worksite = JSON.parse(e.dataTransfer.getData('worksite'));
    openScheduleModal(worksite, date.toISOString().split('T')[0]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="mb-4 lg:mb-6">
        <div className="bg-white p-3 lg:p-4 rounded-lg shadow mb-3 lg:mb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Planning Bureau</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 hidden sm:block">Gérez les missions et assignez les techniciens</p>
            </div>
            <div className="flex gap-2 ml-3">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-sm lg:text-base ${viewMode === 'day' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}
              >
                Jour
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-sm lg:text-base ${viewMode === 'week' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}
              >
                <span className="hidden sm:inline">Semaine</span>
                <span className="sm:hidden">Sem.</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation date */}
      <div className="bg-white p-3 lg:p-4 rounded-lg shadow mb-4 lg:mb-6 flex items-center justify-between">
        <button
          onClick={() => {
            const newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() - (viewMode === 'week' ? 7 : 1));
            setCurrentDate(newDate);
          }}
          className="p-1.5 lg:p-2 hover:bg-gray-100 rounded flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-sm lg:text-lg font-semibold text-center px-2">
          {viewMode === 'week'
            ? `Semaine du ${getWeekDays()[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${getWeekDays()[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
            : currentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <button
          onClick={() => {
            const newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() + (viewMode === 'week' ? 7 : 1));
            setCurrentDate(newDate);
          }}
          className="p-1.5 lg:p-2 hover:bg-gray-100 rounded flex-shrink-0"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* Chantiers disponibles */}
        <div className="lg:col-span-3 bg-white p-3 lg:p-4 rounded-lg shadow">
          <h2 className="font-semibold text-base lg:text-lg mb-3 lg:mb-4">Chantiers à planifier</h2>
          <div className="space-y-2 max-h-[300px] lg:max-h-[600px] overflow-y-auto">
            {worksites.map(worksite => (
              <div
                key={worksite.id}
                draggable
                onDragStart={(e) => handleDragStart(e, worksite)}
                className="p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-move hover:bg-blue-100 transition"
              >
                <div className="font-medium text-sm text-gray-900">{worksite.title}</div>
                {worksite.clients && (
                  <div className="text-xs text-gray-600 mt-1">{worksite.clients.name}</div>
                )}
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                  <MapPin className="w-3 h-3" />
                  {worksite.address || 'Adresse non renseignée'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendrier */}
        <div className="lg:col-span-9">
          {viewMode === 'week' ? (
            <div className="bg-white p-3 lg:p-4 rounded-lg shadow overflow-x-auto">
              <div className="grid grid-cols-7 gap-2 min-w-[700px]">
                {getWeekDays().map((day, idx) => {
                  const daySchedules = getSchedulesForDate(day);
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={idx}
                      className={`min-h-[350px] lg:min-h-[400px] border rounded-lg p-2 ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-gray-50'}`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, day)}
                    >
                      <div className="font-semibold text-center mb-2 text-xs lg:text-sm">
                        {day.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
                      </div>
                      <div className="space-y-2">
                        {daySchedules.map(schedule => (
                          <div
                            key={schedule.id}
                            className="bg-white p-2 rounded border border-gray-200 shadow-sm hover:shadow-md transition text-xs"
                          >
                            <div className="font-medium text-gray-900 mb-1">
                              {schedule.worksites?.title || 'Chantier'}
                            </div>
                            <div className="flex items-center gap-1 text-gray-600 mb-1">
                              <Clock className="w-3 h-3" />
                              {schedule.time} - {schedule.end_time || `${schedule.hours}h`}
                            </div>
                            {schedule.users && (
                              <div className="flex items-center gap-1 text-gray-600 mb-2">
                                <Users className="w-3 h-3" />
                                {schedule.users.first_name} {schedule.users.last_name}
                              </div>
                            )}
                            <div className="flex gap-1">
                              <button
                                onClick={() => openEditModal(schedule)}
                                className="flex-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-700"
                              >
                                <Edit className="w-3 h-3 mx-auto" />
                              </button>
                              <button
                                onClick={() => handleDeleteSchedule(schedule.id)}
                                className="flex-1 px-2 py-1 bg-red-100 hover:bg-red-200 rounded text-red-700"
                              >
                                <Trash2 className="w-3 h-3 mx-auto" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
              <h2 className="font-semibold text-base lg:text-lg mb-3 lg:mb-4">
                {currentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              <div className="space-y-3">
                {getSchedulesForDate(currentDate).map(schedule => (
                  <div key={schedule.id} className="p-4 border rounded-lg hover:shadow-md transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{schedule.worksites?.title || 'Chantier'}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {schedule.time} - {schedule.end_time || `${schedule.hours}h`}
                          </div>
                          {schedule.users && (
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {schedule.users.first_name} {schedule.users.last_name}
                            </div>
                          )}
                        </div>
                        {schedule.description && (
                          <p className="text-sm text-gray-600 mt-2">{schedule.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(schedule)}
                          className="p-2 bg-blue-100 hover:bg-blue-200 rounded text-blue-700"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="p-2 bg-red-100 hover:bg-red-200 rounded text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal création/édition planning */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{editingSchedule ? 'Modifier' : 'Créer'} un planning</h2>
              <button onClick={() => { setShowScheduleModal(false); setEditingSchedule(null); resetForm(); }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Chantier</label>
                <select
                  value={scheduleForm.worksite_id}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, worksite_id: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un chantier</option>
                  {worksites.map(w => (
                    <option key={w.id} value={w.id}>{w.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Technicien</label>
                <select
                  value={scheduleForm.collaborator_id}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, collaborator_id: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un technicien</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Chef d'équipe (optionnel)</label>
                <select
                  value={scheduleForm.team_leader_id}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, team_leader_id: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Aucun</option>
                  {teamLeaders.map(tl => (
                    <option key={tl.id} value={tl.id}>{tl.name || `${tl.first_name} ${tl.last_name}`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={scheduleForm.date}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Heure début</label>
                  <input
                    type="time"
                    value={scheduleForm.time}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Heure fin</label>
                  <input
                    type="time"
                    value={scheduleForm.end_time}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Heures</label>
                  <input
                    type="number"
                    value={scheduleForm.hours}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, hours: parseInt(e.target.value) }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={scheduleForm.description}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Instructions pour le technicien..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setShowScheduleModal(false); setEditingSchedule(null); resetForm(); }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateSchedule}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingSchedule ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BureauPlanningComponent;
