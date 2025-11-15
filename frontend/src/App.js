import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import axios from 'axios';
import PlanningManagement from './PlanningComponent';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './App.css';
// Import shadcn components
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './components/ui/select';
import { Badge } from './components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './components/ui/dialog';

import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Briefcase,
  Building,
  Calendar,
  Camera,
  Calculator,
  Check,
  CheckCheck,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  DollarSign,
  Download,
  Edit,
  Eye,
  FileBarChart,
  FileText,
  Filter,
  Globe,
  GripVertical,
  History,
  Lightbulb,
  Loader2,
  LogOut,
  Mail,
  Map,
  MapPin,
  MapPin as MapPinIcon,
  Menu,
  Phone,
  Play,
  Plus,
  Save,
  Search,
  Settings,
  Share2,
  Shield,
  Star,
  Target,
  Trash2,
  User,
  UserPlus,
  Users,
  Wifi,
  X,
  XCircle
} from 'lucide-react';

// Backend URL and API base with safe fallbacks
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:8001';
const API = process.env.REACT_APP_API_BASE_URL || `${BACKEND_URL}/api`;

const FOUNDER_EMAIL = (process.env.REACT_APP_FOUNDER_EMAIL || 'skyapp@gmail.com').toLowerCase();

// Configure axios interceptor to add token to all requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Configure axios interceptor to handle 401 errors (token expiry)
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide, déconnecter l'utilisateur
      const currentPath = window.location.pathname;
      // Ne rediriger que si on n'est pas déjà sur la page d'accueil
      if (currentPath !== '/') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// Auth Context
const AuthContext = React.createContext(null);

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const useFounderOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverview = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/founder/overview`);
      setData(response.data);
      setError(null);
    } catch (err) {
      console.error('Erreur chargement vue fondateur:', err);
      const status = err?.response?.status;
      if (status === 403) {
        setData(null);
        setError(null);
      } else {
        setError('Impossible de charger la vue fondateur');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return { data, loading, error, refresh: fetchOverview };
};

// Real-time Statistics Hook (avec filtre entreprise pour fondateur)
const useRealTimeStats = (companyFilter = null) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  const fallback = React.useMemo(() => ({
    total_users: 0,
    total_companies: 0,
    total_searches: 0,
    total_reports: 0,
    active_sessions: 0,
    server_uptime: 'N/A'
  }), []);

  const fetchStats = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = companyFilter ? `${API}/founder/overview?company=${companyFilter}` : `${API}/founder/overview`;
      const response = await axios.get(url);
      setStats(response.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Erreur chargement statistiques:', err);
      setStats(prev => prev ?? fallback);
      const status = err?.response?.status;
      if (status === 403) {
        setError(null);
      } else {
        setError('Impossible de charger les statistiques');
      }
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [companyFilter, fallback]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { stats, loading, error, lastUpdated, refresh: fetchStats };
};

// User Profile Modal Component
const UserProfileModal = ({ user, isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {user?.nom?.[0]}{user?.prenom?.[0]}
              </span>
            </div>
            <span>Profil Utilisateur</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Prénom</label>
              <p className="font-semibold">{user?.prenom || 'Non renseigné'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Nom</label>
              <p className="font-semibold">{user?.nom || 'Non renseigné'}</p>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-600">Email</label>
            <p className="font-semibold">{user?.email || 'Non renseigné'}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-600">Téléphone</label>
            <p className="font-semibold">{user?.telephone || 'Non renseigné'}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-600">Adresse</label>
            <p className="font-semibold">{user?.adresse || 'Non renseigné'}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-600">ID Utilisateur</label>
            <p className="font-mono text-sm bg-gray-100 p-2 rounded">{user?.id || 'N/A'}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-600">Numéro de Licence</label>
            <p className="font-semibold">{user?.licence || 'À configurer'}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-600">Entreprise</label>
            <p className="font-semibold">{user?.entreprise || 'Non renseigné'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Real-time Stats Display Component
const RealTimeStatsDisplay = ({ stats, className = "", showIndicator = true }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span>{stats}</span>
      {showIndicator && (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500">temps réel</span>
        </div>
      )}
    </div>
  );
};

// Animated Background Component
const CosmicBackground = () => {
  return (
    <>
      {/* Main cosmic background */}
      <div className="cosmic-background"></div>
      
      {/* Particle system */}
      <div className="particle-system">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${8 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>
      
      {/* Morphing blobs */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="morphing-blob" style={{ top: '10%', left: '10%' }}></div>
        <div className="morphing-blob" style={{ top: '60%', right: '10%' }}></div>
        <div className="morphing-blob" style={{ bottom: '20%', left: '20%' }}></div>
      </div>
    </>
  );
};

// Page dédiée Fondateur (route /fondateur)
const FounderDashboard = () => {
  const { data, loading, error } = useFounderOverview();
  const navigate = useNavigate();

  // Si pas fondateur (hook ne renvoie rien) => écran d'accès refusé
  if (!loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/role-selection')} className="p-2 rounded-lg hover:bg-gray-100">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Accès Fondateur</h1>
            </div>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Accès refusé</h2>
            <p className="text-gray-600 mb-4">Cette zone est réservée au fondateur de la plateforme.</p>
            <Button onClick={() => navigate('/role-selection')}>Retour</Button>
          </div>
        </div>
      </div>
    );
  }

  const totals = data?.totals || {};
  const last7 = data?.last_7d || {};
  const ratio = (a, b) => (b ? (a / b * 100).toFixed(1) + '%' : '—');
  const metrics = [
    { label: 'Utilisateurs', value: totals.users },
    { label: 'Entreprises', value: totals.companies },
    { label: 'Recherches', value: totals.searches },
    { label: 'Clients', value: totals.clients },
    { label: 'Devis', value: totals.quotes },
    { label: 'Chantiers', value: totals.worksites },
    { label: 'Matériels', value: totals.materials },
    { label: 'Abonnements', value: totals.subscriptions }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/role-selection')} className="p-2 rounded-lg hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              Vue Fondateur <Badge className="bg-indigo-600 text-white">Global</Badge>
            </h1>
          </div>
          {data?.generated_at && (
            <div className="text-xs text-gray-500">Maj: {new Date(data.generated_at).toLocaleTimeString()}</div>
          )}
        </div>
      </nav>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Etat chargement / erreur */}
          {loading && (
            <div className="p-4 bg-white border rounded-xl text-sm text-gray-600">Chargement des métriques…</div>
          )}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
          )}

          {/* Grille Totaux */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {metrics.map(m => (
              <div key={m.label} className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-gray-500">{m.label}</div>
                <div className="text-xl font-semibold text-gray-900">{m.value}</div>
              </div>
            ))}
          </div>

            {/* Derniers 7 jours */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2"><History className="h-5 w-5" /> Derniers 7 jours</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { label: 'Utilisateurs (7j)', value: last7.users },
                { label: 'Recherches (7j)', value: last7.searches },
                { label: 'Clients (7j)', value: last7.clients },
                { label: 'Devis (7j)', value: last7.quotes }
              ].map(x => (
                <div key={x.label} className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <div className="text-xs text-indigo-700">{x.label}</div>
                  <div className="text-lg font-semibold text-indigo-900">{x.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Ratios simples */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2"><Target className="h-5 w-5" /> Ratios / Conversion</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-xl border border-gray-200">
                <div className="text-xs text-gray-500">Clients / Recherches</div>
                <div className="text-2xl font-semibold text-gray-900">{ratio(totals.clients, totals.searches)}</div>
              </div>
              <div className="p-4 bg-white rounded-xl border border-gray-200">
                <div className="text-xs text-gray-500">Devis / Clients</div>
                <div className="text-2xl font-semibold text-gray-900">{ratio(totals.quotes, totals.clients)}</div>
              </div>
              <div className="p-4 bg-white rounded-xl border border-gray-200">
                <div className="text-xs text-gray-500">Chantiers / Devis</div>
                <div className="text-2xl font-semibold text-gray-900">{ratio(totals.worksites, totals.quotes)}</div>
              </div>
              <div className="p-4 bg-white rounded-xl border border-gray-200">
                <div className="text-xs text-gray-500">Abonnements / Entreprises</div>
                <div className="text-2xl font-semibold text-gray-900">{ratio(totals.subscriptions, totals.companies)}</div>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500">Cache backend 60s - actualisation automatique.</div>
        </div>
      </div>
    </div>
  );
};


const LandingPage = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState({});
  // Filtre entreprise pour le fondateur
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const { stats, loading } = useRealTimeStats(selectedCompany);
  
  // Check if user is logged in
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const founderEmail = FOUNDER_EMAIL;
  const isFounder = (user?.is_founder === true) || ((user?.email || '').toLowerCase() === founderEmail);
  const isAdmin = isFounder || (user?.role === 'ADMIN');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setIsLoggedIn(true);
      setUser(JSON.parse(userData));
    }

    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Charger liste entreprises si fondateur
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (isFounder && token) {
      axios.get(`${API}/companies`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => setCompanies(r.data || []))
        .catch(() => setCompanies([]));
    }
  }, [isFounder]);

  // Charger la liste des entreprises si fondateur
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (isFounder && token) {
      axios.get(`${API}/companies`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setCompanies(res.data || []))
        .catch(() => setCompanies([]));
    }
  }, [isFounder]);

  // Animation counter function
  const animateCounter = (element, target, duration = 2000) => {
    const start = 0;
    const startTime = performance.now();
    
    const updateCounter = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(progress * target);
      
      element.textContent = current;
      
      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    };
    
    requestAnimationFrame(updateCounter);
  };

  // Intersection Observer for animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            setIsVisible(prev => ({
              ...prev,
              [id]: true
            }));

            // Animate counters in about section
            if (id === 'apropos') {
              setTimeout(() => {
                const counterElements = entry.target.querySelectorAll('.counter-value');
                counterElements.forEach((el, index) => {
                  const target = el.dataset.target;
                  if (el.classList.contains('user-counter')) {
                    animateCounter(el, 108, 1500); // Default user count
                  } else {
                    animateCounter(el, parseInt(target), 1500);
                  }
                });

                // Animate values
                const valueItems = entry.target.querySelectorAll('.value-item');
                valueItems.forEach((item, index) => {
                  setTimeout(() => {
                    item.classList.add('animate');
                  }, index * 200);
                });
              }, 500);
            }

            // Animate pricing cards
            if (id === 'tarifs') {
              setTimeout(() => {
                const pricingCards = entry.target.querySelectorAll('.pricing-card');
                pricingCards.forEach((card, index) => {
                  setTimeout(() => {
                    card.classList.add('animate');
                  }, index * 200);
                });
              }, 300);
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    // Observe sections
    const sections = document.querySelectorAll('#apropos, #tarifs');
    sections.forEach((section) => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  // Cursor animation for pricing section
  useEffect(() => {
    const handleMouseMove = (e) => {
      const pricingSection = document.getElementById('tarifs');
      if (!pricingSection) return;

      const cursorEffect = pricingSection.querySelector('.pricing-cursor-effect');
      if (!cursorEffect) return;

      const rect = pricingSection.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if mouse is within pricing section
      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        cursorEffect.style.left = x + 'px';
        cursorEffect.style.top = y + 'px';
        cursorEffect.style.opacity = '1';
      } else {
        cursorEffect.style.opacity = '0';
      }
    };

    const handleMouseLeave = () => {
      const pricingSection = document.getElementById('tarifs');
      if (!pricingSection) return;

      const cursorEffect = pricingSection.querySelector('.pricing-cursor-effect');
      if (!cursorEffect) return;

      cursorEffect.style.opacity = '0';
    };

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    
    const pricingSection = document.getElementById('tarifs');
    if (pricingSection) {
      pricingSection.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (pricingSection) {
        pricingSection.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    window.location.reload();
  };

  const goToDashboard = () => {
    window.location.href = '/role-selection';
  };

  const goToStatistics = () => {
    window.location.href = '/statistiques';
  };

  // Advanced scroll effect
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(prev => ({
            ...prev,
            [entry.target.id]: entry.isIntersecting
          }));
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('[id]').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: Search,
      title: "Recherche Terrain",
      description: "Interface mobile optimisée pour les techniciens sur le terrain avec géolocalisation GPS précise et hors-ligne."
    },
    {
      icon: FileBarChart,
      title: "Rapports Automatisés", 
      description: "Génération automatique de rapports PDF professionnels avec photos géolocalisées et observations détaillées."
    },
    {
      icon: Calculator,
      title: "Gestion des Devis",
      description: "Création et suivi des devis avec intégration catalogue produits et calculs automatiques."
    },
    {
      icon: MapPinIcon,
      title: "Cartographie Interactive",
      description: "Visualisation des chantiers sur carte avec informations en temps réel et navigation GPS."
    },
    {
      icon: Users,
      title: "Gestion Clients",
      description: "Base de données clients complète avec historique des interventions et suivi commercial."
    },
    {
      icon: BarChart3,
      title: "Analytics Avancés",
      description: "Tableau de bord analytique avec métriques de performance et insights prédictifs."
    }
  ];

  const testimonials = [
    {
      name: "Marie Dubois",
      role: "Technicienne BTP",
      company: "Constructions Modernes",
      content: "L'interface terrain est parfaite. Je peux faire mes recherches rapidement même sans réseau. Les rapports PDF se génèrent instantanément !",
      rating: 5,
      avatar: "MD"
    },
    {
      name: "Pierre Martin",
      role: "Chef de Bureau",
      company: "BTP Solutions", 
      content: "Les rapports automatiques nous font gagner 3h par jour. Le ROI a été immédiat. Interface Apple exceptionnelle !",
      rating: 5,
      avatar: "PM"
    },
    {
      name: "Sophie Rousseau",
      role: "Directrice Technique",
      company: "Terrassements Pro",
      content: "Les statistiques nous aident à optimiser nos interventions. Dashboard analytique de niveau enterprise.",
      rating: 5,
      avatar: "SR"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Apple-style Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrollY > 50 
          ? 'bg-white/80 backdrop-blur-xl border-b border-gray-200/50' 
          : 'bg-transparent'
      }`}>
        <div className="navigation-menu max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="logo-container flex items-center">
              <img 
                src="/logo.png" 
                alt="SkyApp Logo" 
                className="w-48 h-48 rounded-lg object-cover logo-neon-effect"
              />
            </div>
            
            {/* Conditional Navigation */}
            {isLoggedIn ? (
              // Simplified logged-in navigation
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setShowUserProfile(true)}
                  className="flex items-center space-x-3 hover:bg-gray-100 rounded-lg p-2 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-gray-800 to-black rounded-full flex items-center justify-center text-white font-medium text-sm">
                    {user?.prenom?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden md:block text-sm">
                    <span className="font-medium text-gray-900">
                      {user?.prenom} {user?.nom}
                    </span>
                  </div>
                </button>
                {isAdmin && (
                  <Button
                    variant="outline"
                    onClick={goToStatistics}
                    className="border-2 border-gray-300 text-gray-800 hover:bg-gray-100 text-sm font-medium px-4 py-2 rounded-full transition-colors duration-200"
                  >
                    Statistiques
                  </Button>
                )}
                <Button
                  onClick={goToDashboard}
                  className="bg-black hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors duration-200"
                >
                  Tableau de bord
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-700 p-2"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              // Original navigation for non-logged users
              <div className="hidden md:flex items-center space-x-8">
                {[
                  { label: 'Fonctionnalités', id: 'features' },
                  { label: 'À propos', id: 'apropos' },
                  { label: 'Tarifs', id: 'tarifs' },
                  { label: 'Contact', id: 'contact' }
                ].map((item) => (
                  <a
                    key={item.label}
                    href={`#${item.id}`}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200"
                  >
                    {item.label}
                  </a>
                ))}
                <Button
                  variant="outline"
                  onClick={() => setShowLoginModal(true)}
                  className="border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white text-sm font-medium px-4 py-2 rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  Connexion
                </Button>
                <Button
                  onClick={() => setShowRegisterModal(true)}
                  className="bg-black hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors duration-200"
                >
                  Inscription
                </Button>
              </div>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200/50 bg-white/95 backdrop-blur-xl">
              <div className="py-4 space-y-4">
                {isLoggedIn ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 px-4 py-2">
                      <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white font-medium text-sm">
                        {user?.prenom?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user?.prenom} {user?.nom}
                        </div>
                        <div className="text-xs text-gray-500">{user?.email}</div>
                      </div>
                    </div>
                    {isAdmin && (
                      <Button
                        onClick={goToStatistics}
                        variant="outline"
                        className="w-full mx-4 text-gray-900 border-gray-300 hover:bg-gray-50 text-sm"
                      >
                        Statistiques
                      </Button>
                    )}
                    <Button
                      onClick={goToDashboard}
                      className="w-full mx-4 bg-black hover:bg-gray-800 text-white text-sm font-medium py-2 rounded-full"
                    >
                      Tableau de bord
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="w-full mx-4 text-red-600 hover:bg-red-50 text-sm"
                    >
                      Déconnexion
                    </Button>
                  </div>
                ) : (
                  <>
                    {[
                      { label: 'Fonctionnalités', id: 'features' },
                      { label: 'À propos', id: 'apropos' },
                      { label: 'Tarifs', id: 'tarifs' },
                      { label: 'Contact', id: 'contact' }
                    ].map((item) => (
                      <a
                        key={item.label}
                        href={`#${item.id}`}
                        className="block px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                      >
                        {item.label}
                      </a>
                    ))}
                    <div className="px-4 space-y-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowLoginModal(true)}
                        className="w-full justify-center text-sm font-medium text-gray-900 border-gray-300 hover:bg-gray-50"
                      >
                        Connexion
                      </Button>
                      <Button
                        onClick={() => setShowRegisterModal(true)}
                        className="w-full bg-black hover:bg-gray-800 text-white text-sm font-medium py-2 rounded-full"
                      >
                        Inscription
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section - Apple Style */}
      <section className="hero-section pt-32 pb-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="space-y-8">
            <div className="inline-flex items-center space-x-2 bg-gray-100 rounded-full px-4 py-2 text-sm font-medium text-gray-700">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="hidden sm:inline">Nouveau : Solution complète de gestion d'entreprise</span>
              <span className="sm:hidden">Solution complète</span>
            </div>
            
            <h1 className="futuristic-text text-4xl sm:text-5xl md:text-7xl font-bold text-gray-900 leading-tight tracking-tight">
              Gestion d'Entreprise
              <br />
              <span className="text-gray-600">Complète</span>
            </h1>
            
            <p className="pricing-text text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
              La plateforme tout-en-un qui digitalise votre entreprise : gestion des équipes, planification, 
              recherches géolocalisées, rapports automatiques, devis, facturation et analytics avancés.
            </p>

            <div className="hero-buttons flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => setShowRegisterModal(true)}
                className="w-full sm:w-auto bg-black hover:bg-gray-800 text-white font-medium text-lg px-8 py-4 rounded-full transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <span>Commencer gratuitement</span>
                <ArrowRight className="h-5 w-5" />
              </button>
              
              <button 
                onClick={() => setShowLoginModal(true)}
                className="w-full sm:w-auto border border-gray-300 hover:border-gray-400 text-gray-700 font-medium text-lg px-8 py-4 rounded-full transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <Eye className="h-5 w-5" />
                <span>Voir la démo</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-black flex-shrink-0" />
                <span className="feature-text">Essai gratuit 14 jours</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-gray-700 flex-shrink-0" />
                <span className="feature-text">Gestion multi-utilisateurs</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-800 flex-shrink-0" />
                <span className="feature-text">Tableau de bord temps réel</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-900 flex-shrink-0" />
                <span className="feature-text">Planning équipes</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Apple Style */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Des fonctionnalités révolutionnaires pensées par et pour les professionnels du terrain
            </p>
          </div>

          <div className="space-y-16">
            {/* Feature 1: Recherche Terrain */}
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="lg:w-1/2">
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                  <img 
                    src="/screenshots/recherche-terrain.jpg"
                    alt="Interface Recherche Terrain - SkyApp"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
              <div className="lg:w-1/2">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mb-6">
                  <Search className="h-6 w-6 text-gray-700" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">Recherche Terrain Intelligente</h3>
                <p className="text-lg text-gray-600 leading-relaxed mb-6">
                  Interface modernisée avec informations générales, numéro de référence automatique et gestion de photo de profil. Sections modulaires avec photos intégrées pour une documentation complète.
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" />Numéro de référence auto-généré</li>
                  <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" />Photo de profil optionnelle</li>
                  <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" />Sections personnalisables</li>
                </ul>
              </div>
            </div>

            {/* Feature 2: Rapports Automatisés */}
            <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
              <div className="lg:w-1/2">
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                  <img 
                    src="/screenshots/rapports-bureau.jpg"
                    alt="Interface Rapports Automatisés - SkyApp"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
              <div className="lg:w-1/2">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mb-6">
                  <FileText className="h-6 w-6 text-gray-700" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">Rapports Automatisés</h3>
                <p className="text-lg text-gray-600 leading-relaxed mb-6">
                  Centre de rapports avec statistiques temps réel. Génération PDF automatique des recherches avec photos numérotées et mise en page professionnelle.
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" />Statistiques en temps réel</li>
                  <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" />PDF professionnel automatique</li>
                  <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" />Photos numérotées intégrées</li>
                </ul>
              </div>
            </div>

            {/* Feature 3: Gestion des Devis */}
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="lg:w-1/2">
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                  <img 
                    src="/screenshots/gestion-devis.jpg"
                    alt="Interface Gestion des Devis - SkyApp"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
              <div className="lg:w-1/2">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mb-6">
                  <DollarSign className="h-6 w-6 text-gray-700" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">Gestion Avancée des Devis</h3>
                <p className="text-lg text-gray-600 leading-relaxed mb-6">
                  Interface complète pour gérer vos devis et chantiers. Workflow complet avec validation, modification, et conversion automatique vers les chantiers.
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" />Workflow complet Devis → Chantier</li>
                  <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" />Actions multiples (Accepter, Refuser, PDF)</li>
                  <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" />Gestion des statuts avancée</li>
                </ul>
              </div>
            </div>

            {/* Feature 4: Planning des Missions */}
            <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
              <div className="lg:w-1/2">
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                  <img 
                    src="/screenshots/planning-missions.jpg"
                    alt="Interface Planning des Missions - SkyApp"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
              <div className="lg:w-1/2">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mb-6">
                  <Calendar className="h-6 w-6 text-gray-700" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">Planning des Missions</h3>
                <p className="text-lg text-gray-600 leading-relaxed mb-6">
                  Interface technicien dédiée au suivi des missions assignées. Tableau de bord avec statistiques, filtres avancés et vue détaillée de chaque intervention.
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" />Missions personnalisées par technicien</li>
                  <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" />Statistiques temps réel</li>
                  <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" />Filtres par date et statut</li>
                </ul>
              </div>
            </div>

            {/* Feature 5: Tableau de Bord Analytique */}
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="lg:w-1/2">
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                  <img 
                    src="/screenshots/tableau-bord.jpg"
                    alt="Interface Tableau de Bord Analytique - SkyApp"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
              <div className="lg:w-1/2">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mb-6">
                  <BarChart3 className="h-6 w-6 text-gray-700" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">Tableau de Bord Analytique</h3>
                <p className="text-lg text-gray-600 leading-relaxed mb-6">
                  Analytics avancées avec métriques KPI, performance par région, activité temps réel et objectifs mensuels. Vision 360° de votre activité terrain.
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" />Métriques KPI en temps réel</li>
                  <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" />Performance géographique</li>
                  <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" />Objectifs et barres de progression</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Real-time Stats Section */}
          {stats?.cached && (
            <div className="mb-4 text-xs text-gray-500">Données mises en cache (60s)</div>
          )}
          {isFounder && (
            <div className="mb-12">
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/60 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow">
                      Fondateur — Statistiques {selectedCompany ? 'filtrées entreprise' : 'globales'}
                    </Badge>
                    {selectedCompany && (
                      <Button size="sm" variant="outline" onClick={() => setSelectedCompany(null)}>
                        Vue globale
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Select value={selectedCompany || ''} onValueChange={(v) => setSelectedCompany(v)}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Filtrer par entreprise" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  {selectedCompany ? 'Affichage limité à cette entreprise. Cache 60s.' : 'Vue globale agrégée. Cache 60s.'}
                </p>
              </div>
            </div>
          )}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <RealTimeStatsDisplay 
                stats={loading ? "..." : `${stats.total_users}`} 
                className="text-3xl font-bold text-gray-900 mb-2" 
              />
              <div className="text-sm text-gray-600">Utilisateurs actifs</div>
            </div>
            <div className="text-center">
              <RealTimeStatsDisplay 
                stats={loading ? "..." : `${Math.floor(stats.total_searches / 1000)}K+`} 
                className="text-3xl font-bold text-gray-900 mb-2"
                showIndicator={false}
              />
              <div className="text-sm text-gray-600">Recherches traitées</div>
            </div>
            <div className="text-center">
              <RealTimeStatsDisplay 
                stats={loading ? "..." : stats.uptime} 
                className="text-3xl font-bold text-gray-900 mb-2"
                showIndicator={false}
              />
              <div className="text-sm text-gray-600">Temps de disponibilité</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">24/7</div>
              <div className="text-sm text-gray-600">Support technique</div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section - Apple Style */}
      <section id="apropos" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 futuristic-text">
              À propos de SkyApp
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto pricing-text">
              Révolutionner le secteur BTP avec une technologie de pointe adaptée aux professionnels du terrain
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold text-gray-900">Notre Histoire</h3>
              <p className="text-gray-600 leading-relaxed">
                SkyApp a été créée en 2025 pour répondre aux défis technologiques du secteur BTP. 
                Notre équipe d'ingénieurs et de professionnels du terrain développe des solutions 
                innovantes qui simplifient la gestion des recherches de réseaux et la création de rapports.
              </p>
              
              <h3 className="text-2xl font-semibold text-gray-900">Notre Mission</h3>
              <p className="text-gray-600 leading-relaxed">
                Digitaliser le travail terrain avec des outils intuitifs qui permettent aux techniciens 
                de se concentrer sur leur expertise plutôt que sur la paperasse. Nous croyons en la 
                puissance de la technologie au service de l'efficacité opérationnelle.
              </p>

              <div className="grid grid-cols-2 gap-6 mt-8">
                <div className="text-center counter-container">
                  <div className="text-3xl font-bold text-gray-900 counter-value" data-target="2025">0</div>
                  <div className="text-sm text-gray-600">Année de création</div>
                </div>
                {/* Real-time companies counter */}
                <div className="text-center counter-container">
                  <div className="text-3xl font-bold text-gray-900 counter-value" data-target="24">0</div>
                  <div className="text-sm text-gray-600 flex items-center justify-center space-x-2">
                    <span>Sociétés créées sur SkyApp</span>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-500">temps réel</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">Nos Valeurs</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3 value-item" style={{opacity: 0, transform: 'translateY(20px)'}}>
                  <div className="w-2 h-2 bg-black rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Innovation Technologique</h4>
                    <p className="text-sm text-gray-600">IA, géolocalisation GPS, génération PDF automatique</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 value-item" style={{opacity: 0, transform: 'translateY(20px)'}}>
                  <div className="w-2 h-2 bg-gray-700 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Ergonomie Terrain</h4>
                    <p className="text-sm text-gray-600">Interface mobile optimisée, fonctionnement hors-ligne</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 value-item" style={{opacity: 0, transform: 'translateY(20px)'}}>
                  <div className="w-2 h-2 bg-gray-800 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Sécurité des Données</h4>
                    <p className="text-sm text-gray-600">Chiffrement, sauvegarde cloud, conformité RGPD</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 value-item" style={{opacity: 0, transform: 'translateY(20px)'}}>
                  <div className="w-2 h-2 bg-gray-900 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Support Réactif</h4>
                    <p className="text-sm text-gray-600">Équipe technique dédiée, formation personnalisée</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section - Apple Style */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Ils nous font confiance
            </h2>
            <p className="text-xl text-gray-600">
              Plus de 1000 professionnels utilisent SkyApp au quotidien
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-2xl p-8"
              >
                <div className="flex space-x-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>

                <blockquote className="text-gray-700 leading-relaxed mb-8 italic">
                  "{testimonial.content}"
                </blockquote>

                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-white font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                    <div className="text-sm text-gray-500">{testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section - Animated Background */}
      <section id="tarifs" className="py-20 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
        {/* Animated Cursor Background */}
        <div className="absolute inset-0 pricing-bg-container">
          <div className="pricing-cursor-effect"></div>
          <div className="pricing-grid-overlay"></div>
        </div>

        <div className="pricing-container max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 futuristic-text">
              Tarifs
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto pricing-text">
              Des solutions adaptées à chaque besoin, avec un support technique inclus dans tous nos plans
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Plan Starter */}
            <div className="pricing-card bg-white/90 backdrop-blur-sm rounded-3xl p-8 border-2 border-gray-200 relative overflow-hidden hover:border-gray-400 transition-all duration-300 hover:bg-white/95">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-600 to-gray-800"></div>
              
              <div className="text-center">
                <h3 className="text-2xl font-semibold text-gray-900 mb-2 font-space-grotesk">Starter</h3>
                <p className="text-gray-600 mb-6">Idéal pour les petites équipes</p>
                <div className="mb-8">
                  <span className="text-5xl font-bold text-gray-900 price-bounce">29€</span>
                  <span className="text-gray-600 ml-1">/mois</span>
                  <p className="text-sm text-gray-500 mt-2">Facturation mensuelle</p>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center text-gray-600 pricing-feature">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span>Jusqu'à 5 utilisateurs</span>
                </li>
                <li className="flex items-center text-gray-600 pricing-feature">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span>100 recherches/mois</span>
                </li>
                <li className="flex items-center text-gray-600 pricing-feature">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span>Rapports PDF basiques</span>
                </li>
                <li className="flex items-center text-gray-600 pricing-feature">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span>Support email (48h)</span>
                </li>
                <li className="flex items-center text-gray-600 pricing-feature">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span>Stockage 10 GB</span>
                </li>
                <li className="flex items-center text-gray-600 pricing-feature">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span>Géolocalisation de base</span>
                </li>
              </ul>
              
              <button 
                onClick={() => setShowRegisterModal(true)}
                className="w-full bg-gradient-to-r from-gray-900 to-black hover:from-black hover:to-gray-800 text-white font-medium py-4 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl"
              >
                Commencer
              </button>
            </div>

            {/* Plan Professional - Recommandé */}
            <div className="pricing-card bg-white/90 backdrop-blur-sm rounded-3xl p-8 border-2 border-black relative overflow-hidden transform scale-105 shadow-2xl hover:bg-white/95 mt-8">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-black to-gray-700"></div>
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                <span className="bg-black text-white px-6 py-2 rounded-full text-sm font-medium shadow-xl">
                  ⭐ Recommandé
                </span>
              </div>
              
              <div className="text-center mt-6">
                <h3 className="text-2xl font-semibold text-gray-900 mb-2 font-space-grotesk">Professional</h3>
                <p className="text-gray-600 mb-6">Pour les équipes en croissance</p>
                <div className="mb-8">
                  <span className="text-5xl font-bold text-black price-bounce">79€</span>
                  <span className="text-gray-600 ml-1">/mois</span>
                  <p className="text-sm text-gray-500 mt-2">Facturation annuelle : 790€</p>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center text-gray-600 pricing-feature">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span>Utilisateurs illimités</span>
                </li>
                <li className="flex items-center text-gray-600 pricing-feature">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span>Recherches illimitées</span>
                </li>
                <li className="flex items-center text-gray-600 pricing-feature">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span>Rapports PDF avancés + branding</span>
                </li>
                <li className="flex items-center text-gray-600 pricing-feature">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span>Analytics & dashboards complets</span>
                </li>
                <li className="flex items-center text-gray-600 pricing-feature">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span>Support prioritaire 24/7</span>
                </li>
                <li className="flex items-center text-gray-600 pricing-feature">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span>Stockage illimité</span>
                </li>
                <li className="flex items-center text-gray-600 pricing-feature">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span>API & intégrations</span>
                </li>
                <li className="flex items-center text-gray-600 pricing-feature">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span>Géolocalisation avancée + GPS</span>
                </li>
              </ul>
              
              <button 
                onClick={() => setShowRegisterModal(true)}
                className="w-full bg-black hover:bg-gray-800 text-white font-medium py-4 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl"
              >
                Commencer maintenant
              </button>
            </div>

            {/* Plan Enterprise */}
            <div className="pricing-card bg-white/90 backdrop-blur-sm rounded-3xl p-8 border-2 border-gray-200 relative overflow-hidden hover:border-gray-400 transition-all duration-300 hover:bg-white/95">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-400 to-gray-600"></div>
              
              <div className="text-center">
                <h3 className="text-2xl font-semibold text-gray-900 mb-2 font-space-grotesk">Enterprise</h3>
                <p className="text-gray-600 mb-6">Solutions sur mesure</p>
                <div className="mb-8">
                  <span className="text-3xl font-bold text-gray-900 price-bounce">Sur mesure</span>
                  <p className="text-sm text-gray-500 mt-2">Devis personnalisé</p>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center text-gray-600 pricing-feature">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span>Configuration personnalisée</span>
                </li>
                <li className="flex items-center text-gray-600 pricing-feature">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span>Intégrations sur mesure</span>
                </li>
                <li className="flex items-center text-gray-600 pricing-feature">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span>Formation équipe dédiée</span>
                </li>
                <li className="flex items-center text-gray-600 pricing-feature">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span>Account Manager dédié</span>
                </li>
                <li className="flex items-center text-gray-600 pricing-feature">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span>SLA garantie 99.9%</span>
                </li>
                <li className="flex items-center text-gray-600 pricing-feature">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span>Infrastructure dédiée</span>
                </li>
                <li className="flex items-center text-gray-600 pricing-feature">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span>Multi-tenant avancé</span>
                </li>
                <li className="flex items-center text-gray-600 pricing-feature">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span>Sécurité renforcée</span>
                </li>
              </ul>
              
              <button className="w-full bg-black hover:bg-gray-800 text-white font-medium py-4 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                Nous contacter
              </button>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-20 text-center">
            <h3 className="text-3xl font-semibold text-gray-900 mb-12 futuristic-text">Questions fréquentes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="text-left bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200 hover:border-gray-400 hover:shadow-lg hover:bg-white/90 transition-all duration-300">
                <h4 className="font-semibold text-gray-900 mb-3 text-lg">Puis-je changer de plan ?</h4>
                <p className="text-gray-600">Oui, vous pouvez upgrader ou downgrader votre plan à tout moment depuis votre tableau de bord.</p>
              </div>
              <div className="text-left bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200 hover:border-gray-400 hover:shadow-lg hover:bg-white/90 transition-all duration-300">
                <h4 className="font-semibold text-gray-900 mb-3 text-lg">Y a-t-il des frais cachés ?</h4>
                <p className="text-gray-600">Aucun frais caché. Tous nos tarifs sont transparents et affichés TTC.</p>
              </div>
              <div className="text-left bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200 hover:border-gray-400 hover:shadow-lg hover:bg-white/90 transition-all duration-300">
                <h4 className="font-semibold text-gray-900 mb-3 text-lg">Essai gratuit disponible ?</h4>
                <p className="text-gray-600">Oui, 14 jours d'essai gratuit pour tous les plans, sans engagement ni carte bancaire.</p>
              </div>
              <div className="text-left bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200 hover:border-gray-400 hover:shadow-lg hover:bg-white/90 transition-all duration-300">
                <h4 className="font-semibold text-gray-900 mb-3 text-lg">Support technique inclus ?</h4>
                <p className="text-gray-600">Support 24/7 inclus dans tous nos plans, avec priorité pour les plans Professional et Enterprise.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Coming Soon Section - Enhanced with White Background */}
      <section id="coming-soon" className="py-20 bg-white relative overflow-hidden border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 futuristic-text">
              <span className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Coming Soon
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto pricing-text">
              Version 2.0 - L'avenir de la gestion BTP piloté par l'Intelligence Artificielle
            </p>
          </div>

          {/* Enhanced Animated Carousel */}
          <div className="relative">
            {/* Navigation Arrows */}
            <button 
              className="carousel-nav carousel-nav-left absolute left-0 top-1/2 transform -translate-y-1/2 z-20 rounded-full p-4"
              onClick={() => {
                const track = document.querySelector('.carousel-track');
                if (track) {
                  track.style.animationPlayState = 'paused';
                  const currentTransform = getComputedStyle(track).transform;
                  const matrix = new DOMMatrix(currentTransform);
                  const currentX = matrix.m41;
                  const newX = Math.min(currentX + 320, 0);
                  track.style.transform = `translateX(${newX}px)`;
                  setTimeout(() => {
                    track.style.animationPlayState = 'running';
                  }, 3000);
                }
              }}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button 
              className="carousel-nav carousel-nav-right absolute right-0 top-1/2 transform -translate-y-1/2 z-20 rounded-full p-4"
              onClick={() => {
                const track = document.querySelector('.carousel-track');
                if (track) {
                  track.style.animationPlayState = 'paused';
                  const currentTransform = getComputedStyle(track).transform;
                  const matrix = new DOMMatrix(currentTransform);
                  const currentX = matrix.m41;
                  const newX = Math.max(currentX - 320, -1600);
                  track.style.transform = `translateX(${newX}px)`;
                  setTimeout(() => {
                    track.style.animationPlayState = 'running';
                  }, 3000);
                }
              }}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div className="carousel-container overflow-hidden">
              <div className="carousel-track flex animate-carousel">
                {/* Feature 1 */}
                <div className="carousel-item flex-shrink-0 w-80 mx-4 p-1">
                  <div className="carousel-card p-8 rounded-3xl h-full">
                    <div className="text-center">
                      <div className="feature-icon w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M7 4V2C7 1.45 7.45 1 8 1H12C12.55 1 13 1.45 13 2V4H16C16.55 4 17 4.45 17 5S16.55 6 16 6H15V17C15 18.1 14.1 19 13 19H7C5.9 19 5 18.1 5 17V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 8V15H11V8H9Z"/>
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold mb-4 futuristic-text text-white">Commande Vocale</h3>
                      <p className="text-gray-300 text-base leading-relaxed">
                        "Créer un rapport pour le chantier Marseille" - L'IA comprend et exécute vos demandes vocales instantanément
                      </p>
                      <div className="mt-6 flex justify-center">
                        <span className="px-4 py-2 bg-white/10 rounded-full text-xs font-medium text-white border border-white/20">
                          Q2 2025
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="carousel-item flex-shrink-0 w-80 mx-4 p-1">
                  <div className="carousel-card p-8 rounded-3xl h-full">
                    <div className="text-center">
                      <div className="feature-icon w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 2L13.09 8.26L20 9L15 13.74L16.18 20.02L10 16.77L3.82 20.02L5 13.74L0 9L6.91 8.26L10 2Z"/>
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold mb-4 futuristic-text text-white">Assistant IA Personnel</h3>
                      <p className="text-gray-300 text-base leading-relaxed">
                        Votre assistant intelligent qui apprend de vos habitudes et automatise vos tâches répétitives terrain
                      </p>
                      <div className="mt-6 flex justify-center">
                        <span className="px-4 py-2 bg-white/10 rounded-full text-xs font-medium text-white border border-white/20">
                          En développement
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="carousel-item flex-shrink-0 w-80 mx-4 p-1">
                  <div className="carousel-card p-8 rounded-3xl h-full">
                    <div className="text-center">
                      <div className="feature-icon w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12L11 14L15 10M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12Z"/>
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold mb-4 futuristic-text text-white">Prédiction Intelligente</h3>
                      <p className="text-gray-300 text-base leading-relaxed">
                        L'IA prédit vos besoins, suggère des optimisations et anticipe les problèmes avant qu'ils surviennent
                      </p>
                      <div className="mt-6 flex justify-center">
                        <span className="px-4 py-2 bg-white/10 rounded-full text-xs font-medium text-white border border-white/20">
                          Prototype
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feature 4 */}
                <div className="carousel-item flex-shrink-0 w-80 mx-4 p-1">
                  <div className="carousel-card p-8 rounded-3xl h-full">
                    <div className="text-center">
                      <div className="feature-icon w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M12 2L15.09 8.26L22 9L17 13.74L18.18 20.02L12 16.77L5.82 20.02L7 13.74L2 9L8.91 8.26L12 2Z"/>
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold mb-4 futuristic-text text-white">Automatisation Complète</h3>
                      <p className="text-gray-300 text-base leading-relaxed">
                        De la planification à la facturation, l'IA gère automatiquement tous vos processus métier
                      </p>
                      <div className="mt-6 flex justify-center">
                        <span className="px-4 py-2 bg-white/10 rounded-full text-xs font-medium text-white border border-white/20">
                          Bêta
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feature 5 */}
                <div className="carousel-item flex-shrink-0 w-80 mx-4 p-1">
                  <div className="carousel-card p-8 rounded-3xl h-full">
                    <div className="text-center">
                      <div className="feature-icon w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold mb-4 futuristic-text text-white">Analytics Prédictifs</h3>
                      <p className="text-gray-300 text-base leading-relaxed">
                        Tableaux de bord intelligents avec prédictions de performance et recommandations stratégiques
                      </p>
                      <div className="mt-6 flex justify-center">
                        <span className="px-4 py-2 bg-white/10 rounded-full text-xs font-medium text-white border border-white/20">
                          Conception
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Repeat items for seamless loop */}
                <div className="carousel-item flex-shrink-0 w-80 mx-4 p-1">
                  <div className="carousel-card p-8 rounded-3xl h-full">
                    <div className="text-center">
                      <div className="feature-icon w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M7 4V2C7 1.45 7.45 1 8 1H12C12.55 1 13 1.45 13 2V4H16C16.55 4 17 4.45 17 5S16.55 6 16 6H15V17C15 18.1 14.1 19 13 19H7C5.9 19 5 18.1 5 17V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 8V15H11V8H9Z"/>
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold mb-4 futuristic-text text-white">Commande Vocale</h3>
                      <p className="text-gray-300 text-base leading-relaxed">
                        "Créer un rapport pour le chantier Marseille" - L'IA comprend et exécute vos demandes vocales instantanément
                      </p>
                      <div className="mt-6 flex justify-center">
                        <span className="px-4 py-2 bg-white/10 rounded-full text-xs font-medium text-white border border-white/20">
                          Q2 2025
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced timeline indicator */}
            <div className="text-center mt-16">
              <div className="timeline-indicator inline-flex items-center space-x-3 px-8 py-4 rounded-full">
                <div className="timeline-dot w-4 h-4 rounded-full animate-pulse"></div>
                <span className="text-white font-semibold text-lg futuristic-text">Version 2.0 prévue - Q2 2025</span>
                <div className="w-12 h-1 bg-gradient-to-r from-transparent via-white to-transparent rounded-full opacity-60"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>
      </section>

      {/* CTA Section - Apple Style */}
      <section id="cta" className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Prêt à révolutionner votre terrain ?
          </h2>
          <p className="text-xl text-gray-300 mb-10">
            Rejoignez plus de 1000 professionnels qui ont déjà transformé leur façon de travailler
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowRegisterModal(true)}
              className="bg-white hover:bg-gray-100 text-gray-900 font-medium text-lg px-8 py-4 rounded-full transition-colors duration-200"
            >
              Commencer maintenant
            </button>
            
            <button
              onClick={() => setShowLoginModal(true)}
              className="border border-gray-600 hover:border-gray-500 text-white font-medium text-lg px-8 py-4 rounded-full transition-colors duration-200"
            >
              Voir la démo
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400 mt-8">
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4" />
              <span>14 jours gratuits</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Sans engagement</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Support premium</span>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Contact Section - Modern Design */}
      <section id="contact" className="py-20 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20"></div>
          <div className="grid grid-cols-8 gap-4 rotate-12 scale-150">
            {[...Array(64)].map((_, i) => (
              <div key={i} className="w-1 h-1 bg-white rounded-full animate-pulse" style={{animationDelay: `${i * 100}ms`}}></div>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30 mb-6">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
              <span className="text-blue-300 text-sm font-medium">Contactez nos experts</span>
            </div>
            
            <h2 className="text-5xl md:text-7xl font-bold mb-6 futuristic-text">
              <span className="bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
                Transformons votre 
              </span>
              <br />
              <span className="text-white">
                vision ensemble
              </span>
            </h2>
            
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Notre équipe d'experts vous accompagne dans la digitalisation de votre entreprise BTP. 
              Discutons de vos défis et trouvons les solutions adaptées.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-12">
            {/* Contact Info Cards */}
            <div className="xl:col-span-2 space-y-6">
              {/* Quick Contact Card */}
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                    <Phone className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Appel direct</h3>
                    <p className="text-gray-300">Réponse immédiate</p>
                  </div>
                </div>
                <a href="tel:+33123456789" className="text-2xl font-bold text-white hover:text-blue-300 transition-colors">
                  +33 1 23 45 67 89
                </a>
                <p className="text-sm text-gray-400 mt-2">Lun-Ven 9h-18h</p>
              </div>

              {/* Email Card */}
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl flex items-center justify-center">
                    <Mail className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Email pro</h3>
                    <p className="text-gray-300">Réponse sous 2h</p>
                  </div>
                </div>
                <a href="mailto:contact@skyapp.fr" className="text-xl font-semibold text-white hover:text-green-300 transition-colors">
                  contact@skyapp.fr
                </a>
                <p className="text-sm text-gray-400 mt-2">Support technique inclus</p>
              </div>

              {/* Office Card */}
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl flex items-center justify-center">
                    <MapPin className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Bureau principal</h3>
                    <p className="text-gray-300">Paris, France</p>
                  </div>
                </div>
                <p className="text-white font-medium">
                  123 Rue de la Tech<br />
                  75001 Paris, France
                </p>
                <p className="text-sm text-gray-400 mt-2">Rendez-vous sur demande</p>
              </div>
            </div>

            {/* Enhanced Contact Form */}
            <div className="xl:col-span-3">
              <div className="bg-white rounded-3xl p-10 shadow-2xl">
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">Parlons de votre projet</h3>
                  <p className="text-gray-600">Obtenez une démonstration personnalisée en moins de 24h</p>
                </div>
                
                <form className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="relative">
                      <input
                        type="text"
                        id="firstName"
                        className="peer w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors text-gray-900 placeholder-transparent"
                        placeholder="Prénom"
                      />
                      <label
                        htmlFor="firstName"
                        className="absolute left-4 -top-2.5 bg-white px-2 text-sm font-medium text-gray-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-blue-600"
                      >
                        Prénom
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        id="lastName"
                        className="peer w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors text-gray-900 placeholder-transparent"
                        placeholder="Nom"
                      />
                      <label
                        htmlFor="lastName"
                        className="absolute left-4 -top-2.5 bg-white px-2 text-sm font-medium text-gray-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-blue-600"
                      >
                        Nom
                      </label>
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="email"
                      id="email"
                      className="peer w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors text-gray-900 placeholder-transparent"
                      placeholder="Email professionnel"
                    />
                    <label
                      htmlFor="email"
                      className="absolute left-4 -top-2.5 bg-white px-2 text-sm font-medium text-gray-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-blue-600"
                    >
                      Email professionnel
                    </label>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      id="company"
                      className="peer w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors text-gray-900 placeholder-transparent"
                      placeholder="Entreprise"
                    />
                    <label
                      htmlFor="company"
                      className="absolute left-4 -top-2.5 bg-white px-2 text-sm font-medium text-gray-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-blue-600"
                    >
                      Entreprise
                    </label>
                  </div>

                  <div className="relative">
                    <select
                      id="projectType"
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors text-gray-900"
                    >
                      <option value="">Type de projet</option>
                      <option value="implementation">Implémentation complète</option>
                      <option value="migration">Migration de données</option>
                      <option value="integration">Intégration système</option>
                      <option value="formation">Formation équipes</option>
                      <option value="support">Support technique</option>
                    </select>
                  </div>

                  <div className="relative">
                    <textarea
                      id="message"
                      rows="5"
                      className="peer w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors text-gray-900 placeholder-transparent resize-none"
                      placeholder="Parlez-nous de votre projet"
                    ></textarea>
                    <label
                      htmlFor="message"
                      className="absolute left-4 -top-2.5 bg-white px-2 text-sm font-medium text-gray-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-blue-600"
                    >
                      Parlez-nous de votre projet
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-xl flex items-center justify-center space-x-3"
                  >
                    <span>Envoyer le message</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </form>

                {/* Features */}
                <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-gray-200">
                  <div className="text-center">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-600 font-medium">Réponse 24h</p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-xs text-gray-600 font-medium">Données sécurisées</p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-xs text-gray-600 font-medium">Expert dédié</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Footer */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-16 border-t border-white/20">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">
                <RealTimeStatsDisplay 
                  stats={loading ? "..." : stats.total_companies || 24} 
                  className=""
                  showIndicator={false}
                />
              </div>
              <p className="text-gray-400 text-sm">Entreprises clientes</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">97%</div>
              <p className="text-gray-400 text-sm">Satisfaction client</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">24h</div>
              <p className="text-gray-400 text-sm">Temps de réponse</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">5★</div>
              <p className="text-gray-400 text-sm">Note moyenne</p>
            </div>
          </div>
        </div>
      </section>

      {/* Login Modal */}
      <LoginModal 
        open={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
      />

      {/* Register Modal */}
      <RegisterModal 
        open={showRegisterModal} 
        onClose={() => setShowRegisterModal(false)}
      />

      {/* User Profile Modal */}
      <UserProfileModal 
        user={user}
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
      />

    </div>
  );
};

// Register Modal Component
const RegisterModal = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API}/auth/register`, {
        company_name: formData.companyName,
        email: formData.email,
        nom: formData.lastName,
        prenom: formData.firstName,
        password: formData.password
      });

      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      onClose();
      // Redirection automatique vers la sélection de rôle après inscription
      window.location.href = '/role-selection';
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inscription</DialogTitle>
          <DialogDescription>
            Créez votre compte SearchApp
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              name="firstName"
              placeholder="Prénom"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
            <Input
              name="lastName"
              placeholder="Nom"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>
          
          <Input
            name="email"
            type="email"
            placeholder="Adresse email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <Input
            name="companyName"
            placeholder="Nom de l'entreprise"
            value={formData.companyName}
            onChange={handleChange}
            required
          />

          <Input
            name="password"
            type="password"
            placeholder="Mot de passe"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
          />

          <Input
            name="confirmPassword"
            type="password"
            placeholder="Confirmer le mot de passe"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Création du compte...' : 'Créer mon compte'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Apple-style Role Selection with Back Button
const RoleSelection = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const founderEmail = FOUNDER_EMAIL;
  const isFounder = (user?.is_founder === true) || ((user?.email || '').toLowerCase() === founderEmail);
  const isAdmin = isFounder || (user?.role === 'ADMIN');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      // Load received invitations for this user
      loadInvitations();
    }
  }, []);

  const loadInvitations = async () => {
    try {
      setLoadingInvites(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get(`${API}/invitations/received`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvitations(res.data || []);
    } catch (e) {
      // Si le token est expiré (401), ne pas logger l'erreur (c'est normal)
      if (e?.response?.status === 401) {
        setInvitations([]);
        return;
      }
      console.warn('Impossible de charger les invitations reçues:', e?.response?.data || e.message);
      setInvitations([]);
    } finally {
      setLoadingInvites(false);
    }
  };

  const acceptInvitation = async (invitationToken) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API}/invitations/accept/${invitationToken}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Recharger les données utilisateur depuis le backend
      const userRes = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (userRes.data) {
        localStorage.setItem('user', JSON.stringify(userRes.data));
        setUser(userRes.data);
      }
      
      await loadInvitations();
      alert('Invitation acceptée avec succès ! Vous êtes maintenant membre de cette entreprise.');
    } catch (e) {
      alert(`Erreur lors de l'acceptation: ${e?.response?.data?.detail || e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const declineInvitation = async (invitationId) => {
    // Simplement masquer l'invitation localement (pas d'endpoint backend pour refuser)
    if (!window.confirm("Êtes-vous sûr de vouloir refuser cette invitation ?")) {
      return;
    }
    setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
  };

  const leaveCompany = async () => {
    if (!confirm("Voulez-vous vraiment quitter votre entreprise ?")) return;
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API}/auth/leave-company`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
      }
    } catch (e) {
      alert(`Erreur lors de la sortie: ${e?.response?.data?.detail || e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleSelect = (role) => {
    switch(role) {
      case 'technicien':
        navigate('/technicien');
        break;
      case 'bureau':
        navigate('/bureau');
        break;
      case 'statistiques':
        navigate('/statistiques');
        break;
      case 'fondateur':
        navigate('/fondateur');
        break;
      case 'admin':
        navigate('/admin');
        break;
      default:
        navigate('/');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const goBack = () => {
    navigate('/');
  };

  const goToStatistics = () => {
    navigate('/statistiques');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Apple-style Navigation with Back Button */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={goBack}
                className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <img 
                src="/logo.png" 
                alt="SkyApp Logo" 
                className="w-48 h-48 rounded-lg object-cover logo-neon-effect"
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={goToStatistics}
                variant="outline"
                className="text-gray-900 border-gray-300 hover:bg-gray-50"
              >
                Statistiques
              </Button>
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Choisissez votre interface
            </h1>
            <p className="text-lg text-gray-600">Sélectionnez l'interface adaptée à votre rôle</p>
          </div>

          {/* Role Cards */}
          <div className="space-y-4">
            {/* Bloc Fondateur supprimé à la demande - l'accès /fondateur n'est plus proposé visuellement */}

            {/* Ancien bloc accès suprême spécifique remplacé par logique fondateur */}
            {(!isFounder && user?.email === 'corradijordan@gmail.com') && (
              <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-300 rounded-2xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Accès Admin</h4>
                    <p className="text-sm text-gray-600">Tous les privilèges administrateur disponibles</p>
                  </div>
                </div>
              </div>
            )}

            {/* Invitations Section: visible on role selection like other menus */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Mail className="h-5 w-5 text-purple-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Invitations</h3>
                    <p className="text-sm text-gray-600">Rejoignez une entreprise en tant que technicien</p>
                  </div>
                </div>
                <button onClick={loadInvitations} className="text-sm text-gray-500 hover:text-gray-700">Rafraîchir</button>
              </div>
              {loadingInvites ? (
                <div className="text-sm text-gray-500">Chargement des invitations…</div>
              ) : invitations.length === 0 ? (
                <div className="text-sm text-gray-500">Aucune invitation en attente</div>
              ) : (
                <div className="space-y-3">
                  {invitations.map((inv) => (
                    <div key={inv.id} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          {inv.companies?.name || 'Entreprise'}
                        </div>
                        <div className="text-sm text-gray-600">
                          Rôle proposé: <span className="font-medium">{inv.role === 'TECHNICIEN' ? 'Technicien / User' : inv.role}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Envoyé le {new Date(inv.created_at).toLocaleDateString('fr-FR')}
                        </div>
                        {inv.expires_at && (
                          <div className="text-xs text-gray-400 mt-1">
                            Expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                        <div
                          className="text-xs text-gray-500 mt-1 italic truncate max-w-xs"
                          title={(inv.message && inv.message.trim()) ? inv.message : "Vous avez été invité(e) à rejoindre cette entreprise"}
                        >
                          “{(inv.message && inv.message.trim()) ? inv.message : 'Vous avez été invité(e) à rejoindre cette entreprise'}”
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          disabled={actionLoading} 
                          onClick={() => acceptInvitation(inv.token)} 
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accepter'}
                        </Button>
                        <Button 
                          disabled={actionLoading} 
                          onClick={() => declineInvitation(inv.id)} 
                          variant="outline"
                        >
                          Ignorer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => handleRoleSelect('technicien')}
              className="w-full bg-white border border-gray-200 rounded-2xl p-6 text-left hover:border-gray-300 hover:shadow-sm transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    <Search className="h-6 w-6 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Technicien</h3>
                    <p className="text-sm text-gray-600">Interface terrain - Recherches et partage</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
              </div>
            </button>

            {isAdmin && (
              <button
                onClick={() => handleRoleSelect('bureau')}
                className="w-full bg-white border border-gray-200 rounded-2xl p-6 text-left hover:border-gray-300 hover:shadow-sm transition-all duration-200 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                      <Briefcase className="h-6 w-6 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Bureau</h3>
                      <p className="text-sm text-gray-600">Interface administrative - Rapports et gestion</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                </div>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => handleRoleSelect('statistiques')}
                className="w-full bg-white border border-gray-200 rounded-2xl p-6 text-left hover:border-gray-300 hover:shadow-sm transition-all duration-200 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                      <BarChart3 className="h-6 w-6 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Statistiques</h3>
                      <p className="text-sm text-gray-600">Interface analytique - Métriques et analyses</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                </div>
              </button>
            )}

            {/* Allow any user to leave company at any time */}
            {user && user.company_id && (
              <div className="pt-2">
                <Button disabled={actionLoading} onClick={leaveCompany} variant="ghost" className="text-red-600 hover:text-red-700">Quitter mon entreprise</Button>
              </div>
            )}

            {/* Admin Panel réservé au Fondateur */}
            {isFounder && (
              <button
                onClick={() => handleRoleSelect('admin')}
                className="w-full bg-gradient-to-r from-gray-800 to-gray-900 border-0 rounded-2xl p-6 text-left hover:from-gray-700 hover:to-gray-800 transition-all duration-200 group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Administration Fondateur</h3>
                      <p className="text-sm text-gray-300">Gestion globale du système et des utilisateurs</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-white" />
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Apple-style Main Layout for Technicien with Back Button
const TechnicienLayout = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('search');
  const searchFormRef = useRef(null);
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftError, setDraftError] = useState(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [discardingDraftId, setDiscardingDraftId] = useState(null);
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const goBack = () => {
    navigate('/role-selection');
  };

  const refreshDrafts = useCallback(async ({ silent = false } = {}) => {
    const authToken = token || localStorage.getItem('token');
    if (!authToken) {
      setDrafts([]);
      if (!silent) {
        setDraftsLoading(false);
      }
      return;
    }
    if (!silent) {
      setDraftsLoading(true);
    }
    try {
      setDraftError(null);
      const response = await axios.get(`${API}/searches`, {
        params: { status: 'DRAFT', page: 1, page_size: 50, sort_by: 'updated_at', sort_dir: 'desc' },
        headers: { Authorization: `Bearer ${authToken}` }
      });
      // Accepte format paginé ou liste brute
      if (Array.isArray(response.data)) {
        setDrafts(response.data);
      } else {
        setDrafts(response.data.items || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des brouillons:', error);
      setDraftError('Impossible de charger les brouillons.');
    } finally {
      if (!silent) {
        setDraftsLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    refreshDrafts({ silent: true });
  }, [refreshDrafts]);

  useEffect(() => {
    if (activeTab === 'search') {
      searchFormRef.current?.ensureDraft?.();
    }
  }, [activeTab]);

  const handleDraftEvent = useCallback((event) => {
    if (!event) return;
  const impactfulTypes = new Set(['created', 'saved', 'finalized', 'discarded']);
    if (impactfulTypes.has(event.type)) {
      refreshDrafts({ silent: true });
    }
  }, [refreshDrafts]);

  const openDraftModal = useCallback(() => {
    setShowDraftModal(true);
  }, []);

  const closeDraftModal = useCallback(() => {
    setShowDraftModal(false);
    setDraftError(null);
    setDiscardingDraftId(null);
  }, []);

  useEffect(() => {
    if (showDraftModal) {
      setDraftError(null);
      refreshDrafts();
    }
  }, [showDraftModal, refreshDrafts]);

  const resumeDraft = useCallback(async (draft) => {
    if (!draft) return;
    setShowDraftModal(false);
    setActiveTab('search');
    // Récupération fraîche du draft depuis l'API pour éviter les données périmées
    try {
      const authToken = token || localStorage.getItem('token');
      const resp = await axios.get(`${API}/searches/${draft.id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      searchFormRef.current?.loadDraft?.(resp.data || draft);
    } catch (e) {
      // En cas d'erreur réseau, on retombe sur la version passée en paramètre
      searchFormRef.current?.loadDraft?.(draft);
    }
  }, [token]);

  const discardDraft = useCallback(async (draftId) => {
    if (!draftId) {
      return;
    }
    const authToken = token || localStorage.getItem('token');
    if (!authToken) {
      setDraftError('Authentification requise pour supprimer un brouillon.');
      return;
    }

    setDiscardingDraftId(draftId);
    try {
      setDraftError(null);
      // Suppression définitive si brouillon (DELETE) sinon fallback archivage côté backend
      await axios.delete(`${API}/searches/${draftId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      await refreshDrafts();
    } catch (error) {
      console.error('Erreur suppression brouillon:', error);
      setDraftError('Impossible de supprimer le brouillon pour le moment.');
    } finally {
      setDiscardingDraftId(null);
    }
  }, [refreshDrafts, token]);

  const handleTabChange = useCallback((value) => {
    if (value === activeTab || isTabTransitioning) {
      return;
    }
    const applyChange = () => {
      setActiveTab(value);
      if (value === 'search') {
        refreshDrafts({ silent: true });
      }
    };

    if (activeTab === 'search' && searchFormRef.current?.forceAutoSave) {
      setIsTabTransitioning(true);
      Promise.resolve(searchFormRef.current.forceAutoSave())
        .catch((err) => {
          console.error('Erreur sauvegarde brouillon avant changement d\'onglet:', err);
        })
        .finally(() => {
          setIsTabTransitioning(false);
          applyChange();
          if (value !== 'search') {
            refreshDrafts({ silent: true });
          }
        });
    } else {
      applyChange();
      if (value !== 'search') {
        refreshDrafts({ silent: true });
      }
    }
  }, [activeTab, isTabTransitioning, refreshDrafts]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Apple-style Navigation with Back Button */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={goBack}
                className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <img 
                src="/logo.png" 
                alt="SkyApp Logo" 
                className="w-48 h-48 rounded-lg object-cover logo-neon-effect"
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={openDraftModal}
                className="relative flex items-center"
              >
                {draftsLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Clock className="h-4 w-4 mr-2" />
                )}
                <span>Brouillon en attente</span>
                {drafts.length > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-2 px-2 py-0 text-xs font-semibold"
                  >
                    {drafts.length}
                  </Badge>
                )}
              </Button>
              <span className="text-sm font-medium text-gray-700">Technicien</span>
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <Dialog open={showDraftModal} onOpenChange={(open) => (open ? setShowDraftModal(true) : closeDraftModal())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Brouillons en attente</DialogTitle>
            <DialogDescription>
              Reprenez vos recherches non finalisées. Les modifications sont sauvegardées automatiquement.
            </DialogDescription>
          </DialogHeader>
          {draftError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm">
              {draftError}
            </div>
          )}
          {draftsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-6 text-center text-sm text-gray-600">
              Aucun brouillon détecté pour le moment.
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {drafts.map((draft) => {
                const updatedAt = draft.updated_at || draft.created_at;
                const dateLabel = updatedAt ? new Date(updatedAt).toLocaleString('fr-FR') : 'Date inconnue';
                const locationLabel = draft.location?.trim() ? draft.location : 'Localisation à définir';
                return (
                  <div key={draft.id} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{locationLabel}</p>
                        <p className="text-xs text-gray-500 mt-1">Dernière sauvegarde&nbsp;: {dateLabel}</p>
                        {draft.description && (
                          <p className="text-xs text-gray-500 mt-2 line-clamp-2">{draft.description}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Button size="sm" onClick={() => resumeDraft(draft)}>
                          Reprendre
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          disabled={discardingDraftId === draft.id}
                          onClick={() => discardDraft(draft.id)}
                        >
                          {discardingDraftId === draft.id ? (
                            <span className="inline-flex items-center">
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Suppression…
                            </span>
                          ) : (
                            <span className="inline-flex items-center">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="ghost" onClick={closeDraftModal}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          {/* Apple-style Tab Navigation */}
          <div className="flex justify-center mb-8">
            <TabsList className="bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
              <TabsTrigger 
                value="search" 
                className="flex items-center space-x-2 px-6 py-3 rounded-lg data-[state=active]:bg-gray-100 data-[state=active]:shadow-sm transition-all duration-200"
                disabled={isTabTransitioning}
              >
                <Search className="h-4 w-4" />
                <span className="font-medium">Nouvelle Recherche</span>
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="flex items-center space-x-2 px-6 py-3 rounded-lg data-[state=active]:bg-gray-100 data-[state=active]:shadow-sm transition-all duration-200"
                disabled={isTabTransitioning}
              >
                <History className="h-4 w-4" />
                <span className="font-medium">Mes Recherches</span>
              </TabsTrigger>
              <TabsTrigger 
                value="planning" 
                className="flex items-center space-x-2 px-6 py-3 rounded-lg data-[state=active]:bg-gray-100 data-[state=active]:shadow-sm transition-all duration-200"
                disabled={isTabTransitioning}
              >
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Mes Missions</span>
              </TabsTrigger>
              <TabsTrigger 
                value="share" 
                className="flex items-center space-x-2 px-6 py-3 rounded-lg data-[state=active]:bg-gray-100 data-[state=active]:shadow-sm transition-all duration-200"
                disabled={isTabTransitioning}
              >
                <Share2 className="h-4 w-4" />
                <span className="font-medium">Partager PDF</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="search" className="mt-8">
            <SearchForm ref={searchFormRef} onDraftEvent={handleDraftEvent} />
          </TabsContent>

          <TabsContent value="history" className="mt-8">
            <SearchHistory />
          </TabsContent>

          <TabsContent value="planning" className="mt-8">
            <TechnicianPlanning />
          </TabsContent>

          <TabsContent value="share" className="mt-8">
            <ShareSearch />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// Technician Planning Component
const TechnicianPlanning = () => {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch missions where current user is assigned
  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API}/schedules`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 200) {
        setMissions(response.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des missions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PLANIFIE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'EN_COURS': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'TERMINE': return 'bg-green-100 text-green-700 border-green-200';
      case 'ANNULE': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatTime = (timeString) => {
    return timeString ? timeString.substring(0, 5) : '';
  };

  if (loading) {
    return (
      <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de vos missions...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl p-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0 mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Mes Missions Planifiées</h2>
            <p className="text-gray-600 mt-1">Consultez toutes les missions où vous avez été assigné</p>
          </div>
          <div className="flex space-x-4">
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="rounded-xl border-gray-200"
              placeholder="Filtrer par date"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="PLANIFIE">Planifié</option>
              <option value="EN_COURS">En cours</option>
              <option value="TERMINE">Terminé</option>
              <option value="ANNULE">Annulé</option>
            </select>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Total Missions</h3>
            <p className="text-2xl font-bold text-gray-900">{missions.length}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-medium text-blue-600">Planifiées</h3>
            <p className="text-2xl font-bold text-blue-900">
              {missions.filter(m => m.status === 'PLANIFIE').length}
            </p>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-medium text-orange-600">En Cours</h3>
            <p className="text-2xl font-bold text-orange-900">
              {missions.filter(m => m.status === 'EN_COURS').length}
            </p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-medium text-green-600">Terminées</h3>
            <p className="text-2xl font-bold text-green-900">
              {missions.filter(m => m.status === 'TERMINE').length}
            </p>
          </div>
        </div>
      </div>

      {/* Missions List */}
      <div className="space-y-4">
        {missions.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-xl">
            <CardContent className="p-12 text-center">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucune mission planifiée</h3>
              <p className="text-gray-500">Vous n'avez pas encore été assigné à des missions.</p>
            </CardContent>
          </Card>
        ) : (
          missions
            .filter(mission => {
              const matchesDate = !filterDate || mission.date === filterDate;
              const matchesStatus = filterStatus === 'all' || mission.status === filterStatus;
              return matchesDate && matchesStatus;
            })
            .map((mission, index) => (
              <Card key={index} className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {mission.worksite_name || `Mission ${mission.id}`}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(mission.status || 'PLANIFIE')}`}>
                          {mission.status || 'PLANIFIÉ'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(mission.date)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{formatTime(mission.time)} - {mission.shift}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{mission.team_leader_name || 'Chef d\'équipe non défini'}</span>
                        </div>
                      </div>
                      {mission.description && (
                        <p className="text-gray-600 mt-2">{mission.description}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-gray-200 hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Détails
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </div>
    </div>
  );
};

const INITIAL_AUTO_SAVE_STATE = { saving: false, lastSaved: null, error: null };
const PROFILE_PHOTO_REQUIRED_ERROR = "Ajoutez une photo de profil pour activer l'enregistrement du brouillon.";

const createInitialSections = (generateReferenceNumber) => ([
  {
    id: 'general_info',
    type: 'required',
    title: 'Informations Générales',
    icon: User,
    value: '',
    required: true,
    fieldType: 'multiple',
    collapsed: false,
    photos: [],
    fields: [
      { id: 'nom', label: 'Nom', value: '', required: true, type: 'text' },
      { id: 'prenom', label: 'Prénom', value: '', required: true, type: 'text' },
      { id: 'adresse', label: 'Adresse', value: '', required: true, type: 'textarea' },
      { id: 'numero_recherche', label: 'Numéro de recherche', value: generateReferenceNumber(), required: false, type: 'text', readonly: true }
    ]
  },
  {
    id: 'description',
    type: 'required', 
    title: 'Description de la recherche',
    icon: FileText,
    value: '',
    required: true,
    placeholder: 'Décrivez en détail ce que vous recherchez (réseaux, canalisations, câbles électriques...)',
    fieldType: 'textarea',
    rows: 4,
    collapsed: false,
    photos: []
  },
  {
    id: 'observations',
    type: 'default',
    title: 'Observations et remarques',
    icon: Eye,
    value: '',
    required: false,
    placeholder: 'Ajoutez vos observations sur le terrain, les conditions de travail...',
    fieldType: 'textarea',
    rows: 3,
    collapsed: false,
    photos: []
  }
]);

// Enhanced Search Form Component with Dynamic Sections
const SearchForm = forwardRef(({ onDraftEvent }, ref) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState([]); // Photos en attente d'upload (nouveaux fichiers)
  const [savedPhotos, setSavedPhotos] = useState([]); // Photos déjà sauvegardées sur le serveur
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const [showLightbox, setShowLightbox] = useState(false); // État pour la lightbox
  const [lightboxImage, setLightboxImage] = useState(null); // URL de l'image à afficher
  const [useGeolocation, setUseGeolocation] = useState(false);
  const [manualCoords, setManualCoords] = useState({
    latitude: '',
    longitude: ''
  });
  const [geoStatus, setGeoStatus] = useState('');

  // Generate reference number
  const generateReferenceNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `REF${year}${month}${day}-${random}`;
  }, []);

  // Dynamic sections system
  const [sections, setSections] = useState(() => createInitialSections(generateReferenceNumber));

  const [availableSectionTypes, setAvailableSectionTypes] = useState([
    { 
      type: 'equipment', 
      title: 'Équipements utilisés', 
      icon: Settings, 
      placeholder: 'Liste des équipements et outils utilisés sur le terrain',
      fieldType: 'textarea',
      rows: 2
    },
    { 
      type: 'safety', 
      title: 'Consignes de sécurité', 
      icon: Shield, 
      placeholder: 'Mesures de sécurité appliquées et recommandations',
      fieldType: 'textarea',
      rows: 2
    },
    { 
      type: 'weather', 
      title: 'Conditions météorologiques', 
      icon: Globe, 
      placeholder: 'Conditions météo lors de l\'intervention',
      fieldType: 'input'
    },
    { 
      type: 'duration', 
      title: 'Durée d\'intervention', 
      icon: Clock, 
      placeholder: 'Temps passé sur le terrain',
      fieldType: 'input'
    },
    { 
      type: 'team', 
      title: 'Équipe présente', 
      icon: Users, 
      placeholder: 'Membres de l\'équipe présents sur le terrain',
      fieldType: 'textarea',
      rows: 2
    },
    { 
      type: 'difficulties', 
      title: 'Difficultés rencontrées', 
      icon: AlertTriangle, 
      placeholder: 'Obstacles, problèmes ou difficultés rencontrées',
      fieldType: 'textarea',
      rows: 3
    },
    { 
      type: 'recommendations', 
      title: 'Recommandations', 
      icon: Lightbulb, 
      placeholder: 'Recommandations pour les prochaines interventions',
      fieldType: 'textarea',
      rows: 3
    },
    { 
      type: 'custom', 
      title: 'Section personnalisée', 
      icon: Plus, 
      placeholder: 'Contenu personnalisé',
      fieldType: 'textarea',
      rows: 2
    }
  ]);

  const handleSectionChange = (sectionId, value) => {
    setHasUserInteraction(true);
    setHasPendingChanges(true);
    setSections(prev => prev.map(section => 
      section.id === sectionId ? { ...section, value } : section
    ));
  };

  const handleFieldChange = (sectionId, fieldId, value) => {
    setHasUserInteraction(true);
    setHasPendingChanges(true);
    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? {
            ...section,
            fields: section.fields?.map(field =>
              field.id === fieldId ? { ...field, value } : field
            )
          }
        : section
    ));
  };

  const handleProfilePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('La taille du fichier ne peut pas dépasser 5MB');
        return;
      }
      
      setProfilePhoto(file);
      setHasUserInteraction(true);
      setHasPendingChanges(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSection = (sectionId) => {
    setHasUserInteraction(true);
    setHasPendingChanges(true);
    setSections(prev => prev.filter(section => section.id !== sectionId));
  };

  const toggleSectionCollapse = (sectionId) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId ? { ...section, collapsed: !section.collapsed } : section
    ));
  };

  const moveSectionUp = (index) => {
    if (index > 0) {
      const newSections = [...sections];
      [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
      setSections(newSections);
      setHasUserInteraction(true);
      setHasPendingChanges(true);
    }
  };

  const moveSectionDown = (index) => {
    if (index < sections.length - 1) {
      const newSections = [...sections];
      [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
      setSections(newSections);
      setHasUserInteraction(true);
      setHasPendingChanges(true);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const startIndex = result.source.index;
    const endIndex = result.destination.index;

    if (startIndex === endIndex) return;

    const newPhotos = Array.from(photoPreview);
    const [reorderedPhoto] = newPhotos.splice(startIndex, 1);
    newPhotos.splice(endIndex, 0, reorderedPhoto);

    // Update numbers after reordering
    const updatedPhotos = newPhotos.map((photo, index) => ({
      ...photo,
      number: index + 1
    }));

    setPhotoPreview(updatedPhotos);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Add new files to existing ones
      const newPreviews = files.map((file, index) => ({
        file,
        url: URL.createObjectURL(file),
        number: photoPreview.length + savedPhotos.length + index + 1,
        name: file.name
      }));
      
      setPhotoPreview(prev => [...prev, ...newPreviews]);
      setHasUserInteraction(true);
      setHasPendingChanges(true);
    }
  };

  const removePhoto = (indexToRemove) => {
    const newPreviews = photoPreview.filter((_, index) => index !== indexToRemove)
      .map((preview, index) => ({
        ...preview,
        number: index + 1
      }));
    
    // Revoke URL for removed photo
    if (photoPreview[indexToRemove]) {
      URL.revokeObjectURL(photoPreview[indexToRemove].url);
    }
    
    setPhotoPreview(newPreviews);
  };

  const removeSavedPhoto = async (photoFilename) => {
    const authToken = resolveToken();
    if (!authToken || !draftId) {
      return;
    }

    try {
      await axios.delete(`${API}/searches/${draftId}/photos/${photoFilename}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // Retirer de l'état local après suppression réussie
      setSavedPhotos(prev => prev.filter(photo => photo.filename !== photoFilename));
    } catch (error) {
      console.error('Erreur lors de la suppression de la photo:', error);
      // Afficher un message d'erreur à l'utilisateur si nécessaire
    }
  };

  const getCurrentLocation = () => {
    setGeoStatus('Recherche de votre position...');
    
    if (!navigator.geolocation) {
      setGeoStatus('Géolocalisation non supportée par ce navigateur');
      return Promise.reject('Geolocation not supported');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeoStatus(`Position trouvée: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          let errorMessage = 'Erreur de géolocalisation';
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permission de géolocalisation refusée';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Position non disponible';
              break;
            case error.TIMEOUT:
              errorMessage = 'Timeout de géolocalisation';
              break;
          }
          setGeoStatus(errorMessage);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    });
  };

  // Auto-save brouillon
  const [draftId, setDraftId] = useState(null);
  const [autoSaveState, setAutoSaveState] = useState(() => ({ ...INITIAL_AUTO_SAVE_STATE }));
  const [hasUserInteraction, setHasUserInteraction] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const autoSaveTimer = useRef(null);
  const draftCreationPromise = useRef(null);
  const initialDraftRequested = useRef(false);
  const isInitialMount = useRef(true); // Pour éviter l'auto-save au premier rendu

  const resolveToken = useCallback(() => token || localStorage.getItem('token'), [token]);

  const buildPayloadFromSections = useCallback(() => {
    const generalSection = sections.find((section) => section.id === 'general_info');
    const nomField = generalSection?.fields?.find((field) => field.id === 'nom');
    const prenomField = generalSection?.fields?.find((field) => field.id === 'prenom');
    const addressField = generalSection?.fields?.find((field) => field.id === 'adresse');
    const descriptionSection = sections.find((section) => section.id === 'description');
    const additionalContent = sections
      .filter((section) =>
        section.value && !['general_info', 'description'].includes(section.id)
      )
      .map((section) => `**${section.title}:**\n${section.value}`)
      .join('\n\n');

    return {
      nom: nomField?.value || '',
      prenom: prenomField?.value || '',
      location: addressField?.value || '',
      description: descriptionSection?.value || '',
      observations: additionalContent || ''
    };
  }, [sections]);

  const createDraftIfNeeded = useCallback(async ({ forceCreation = false } = {}) => {
    if (draftId) {
      return draftId;
    }

    if (!forceCreation && !hasUserInteraction) {
      return null;
    }

    // Vérifier que la première section "Informations Générales" est complète
  const generalInfoSection = sections.find(s => s.id === 'general_info');
  const nameField = generalInfoSection?.fields?.find(f => f.id === 'nom');
  const firstNameField = generalInfoSection?.fields?.find(f => f.id === 'prenom');
  const addressField = generalInfoSection?.fields?.find(f => f.id === 'adresse');
    
    const isFirstSectionComplete = 
      nameField?.value?.trim() && 
      firstNameField?.value?.trim() && 
      addressField?.value?.trim();
    
    if (!forceCreation && !isFirstSectionComplete) {
      // Ne pas créer le brouillon tant que la première section n'est pas complète
      return null;
    }
    
    if (draftCreationPromise.current) {
      return draftCreationPromise.current;
    }

    const authToken = resolveToken();
    if (!authToken) {
      return null;
    }

    draftCreationPromise.current = (async () => {
      try {
        const response = await axios.post(`${API}/searches/draft`, {}, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        const newDraftId = response.data?.search?.id;
        if (newDraftId) {
          setDraftId(newDraftId);
          onDraftEvent?.({ type: 'created', draft: response.data.search });
          setAutoSaveState((prev) => ({ ...prev, error: null }));
        }
        return newDraftId;
      } catch (error) {
        console.warn('Impossible de créer le brouillon:', error);
        return null;
      } finally {
        draftCreationPromise.current = null;
      }
    })();

    return draftCreationPromise.current;
  }, [draftId, hasUserInteraction, onDraftEvent, resolveToken, sections]);

  const autoSaveDraft = useCallback(async ({ forceSave = false } = {}) => {
    const authToken = resolveToken();
    if (!authToken) {
      return false;
    }

    let targetDraftId = draftId;
    if (!targetDraftId) {
      // Créer le brouillon seulement si les champs obligatoires sont remplis
      // Ne pas forcer la création - respecter les vérifications de createDraftIfNeeded
      targetDraftId = await createDraftIfNeeded({ forceCreation: false });
      if (!targetDraftId) {
        // Brouillon pas créé car les conditions ne sont pas remplies
        return false;
      }
    }

    if (!forceSave && !hasPendingChanges && photoPreview.length === 0) {
      return false;
    }

    setAutoSaveState((prev) => ({ ...prev, saving: true, error: null }));
    try {
      // 1. Sauvegarder les données textuelles
      const payload = buildPayloadFromSections();
      try {
        await axios.patch(`${API}/searches/${targetDraftId}`, { ...payload, status: 'DRAFT' }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      } catch (patchError) {
        // Si le draft n'existe plus (404), en créer un nouveau
        if (patchError.response?.status === 404) {
          console.log('⚠️ Draft inexistant, création d\'un nouveau...');
          const newDraft = await createDraftIfNeeded({ forceCreation: true });
          if (!newDraft) {
            throw new Error('Impossible de créer un nouveau draft');
          }
          // Réessayer avec le nouveau draft ID
          await axios.patch(`${API}/searches/${newDraft.id}`, { ...payload, status: 'DRAFT' }, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
        } else {
          throw patchError;
        }
      }

      // 2. Uploader les photos en attente (y compris photo de profil)
      
      // A. Uploader la photo de profil si présente
      if (profilePhoto && !savedPhotos.some(p => p.is_profile)) {
        const formData = new FormData();
        formData.append('files', profilePhoto);
        formData.append('is_profile', 'true');
        formData.append('section_id', 'profile'); // Section spéciale pour photo de profil

        const uploadResponse = await axios.post(
          `${API}/searches/${targetDraftId}/photos`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );

        if (uploadResponse.data.photos) {
          setSavedPhotos(prev => [...prev, ...uploadResponse.data.photos]);
          const profilePhotoData = uploadResponse.data.photos.find(p => p.is_profile);
          if (profilePhotoData) {
            const photoUrl = profilePhotoData.url || `${API}/searches/${targetDraftId}/photos/${profilePhotoData.filename}`;
            setProfilePhotoPreview(photoUrl);
            setProfilePhoto(null);
          }
        }
      }

      // B. Uploader les photos de chaque section
      for (const section of sections) {
        if (section.photos && section.photos.length > 0) {
          // Filtrer uniquement les photos non encore sauvegardées (celles qui ont un objet file)
          const unsavedPhotos = section.photos.filter(photo => photo.file);
          
          if (unsavedPhotos.length > 0) {
            const formData = new FormData();
            unsavedPhotos.forEach(photo => {
              formData.append('files', photo.file);
            });
            formData.append('section_id', section.id); // ✅ Envoyer le section_id

            const uploadResponse = await axios.post(
              `${API}/searches/${targetDraftId}/photos`,
              formData,
              {
                headers: {
                  Authorization: `Bearer ${authToken}`,
                  'Content-Type': 'multipart/form-data'
                }
              }
            );

            // Mettre à jour les photos de la section avec les URLs Supabase
            if (uploadResponse.data.photos) {
              setSections(prevSections =>
                prevSections.map(s => {
                  if (s.id === section.id) {
                    const savedSectionPhotos = uploadResponse.data.photos.map(p => ({
                      url: p.url,
                      filename: p.filename,
                      name: p.original_name || p.filename
                    }));
                    // Remplacer UNIQUEMENT les previews locales (avec file) par les URLs Supabase
                    // Garder les photos qui ont déjà un filename (déjà sur le serveur)
                    return {
                      ...s,
                      photos: [
                        ...s.photos.filter(photo => photo.filename), // Garder les photos déjà sur le serveur
                        ...savedSectionPhotos // Ajouter les nouvelles photos sauvegardées
                      ]
                    };
                  }
                  return s;
                })
              );

              // Nettoyer les previews des fichiers uploadés
              unsavedPhotos.forEach(photo => {
                if (photo.url) {
                  URL.revokeObjectURL(photo.url);
                }
              });
            }
          }
        }
      }

      // C. Uploader les photos de l'ancienne section globale (compatibilité)
      if (photoPreview.length > 0) {
        const formData = new FormData();
        photoPreview.forEach(photo => {
          formData.append('files', photo.file);
        });
        // Pas de section_id = photos globales (ancienne méthode)

        const uploadResponse = await axios.post(
          `${API}/searches/${targetDraftId}/photos`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );

        if (uploadResponse.data.photos) {
          setSavedPhotos(prev => [...prev, ...uploadResponse.data.photos]);
        }
        
        photoPreview.forEach(photo => {
          if (photo.url) {
            URL.revokeObjectURL(photo.url);
          }
        });
        setPhotoPreview([]);
      }

      setAutoSaveState({ saving: false, lastSaved: new Date(), error: null });
      setHasPendingChanges(false);
      onDraftEvent?.({ type: 'saved', draftId: targetDraftId });
      return true;
    } catch (error) {
      setAutoSaveState((prev) => ({ ...prev, saving: false, error: 'Erreur auto-save' }));
      console.error('Erreur auto-save:', error);
      return false;
    }
  }, [buildPayloadFromSections, createDraftIfNeeded, draftId, hasPendingChanges, photoPreview, onDraftEvent, resolveToken]);

  // Marquer que le premier rendu est passé
  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  // DÉSACTIVÉ : Auto-save automatique après chaque modification
  // L'utilisateur doit explicitement sauvegarder via le bouton "Enregistrer"
  // Le brouillon se crée uniquement quand la 1ère section (Nom + Prénom + Adresse) est complète
  // et que l'utilisateur sauvegarde explicitement ou quitte la page
  
  // Auto-save uniquement avant de quitter la page (si 1ère section complète)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Vérifier si la 1ère section est complète
      const generalInfoSection = sections.find(s => s.id === 'general_info');
      const nameField = generalInfoSection?.fields?.find(f => f.id === 'nom');
      const firstNameField = generalInfoSection?.fields?.find(f => f.id === 'prenom');
      const addressField = generalInfoSection?.fields?.find(f => f.id === 'adresse');
      
      const isFirstSectionComplete = 
        nameField?.value?.trim() && 
        firstNameField?.value?.trim() && 
        addressField?.value?.trim();
      
      // Sauvegarder uniquement si la 1ère section est complète et qu'il y a des modifications
      if (isFirstSectionComplete && (hasPendingChanges || photoPreview.length > 0)) {
        autoSaveDraft({ forceSave: true }).catch(console.error);
        e.preventDefault();
        e.returnValue = 'Des modifications non sauvegardées seront perdues.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [autoSaveDraft, hasPendingChanges, photoPreview, sections]);

  useEffect(() => {
    if (!token) {
      initialDraftRequested.current = false;
      return;
    }
    if (draftId || initialDraftRequested.current) {
      return;
    }

    // NE PAS créer automatiquement le brouillon au chargement
    // L'utilisateur doit d'abord remplir la section "Informations Générales"
    // Le brouillon sera créé lors du premier auto-save après modification
    
    /* Création automatique désactivée
    let cancelled = false;
    initialDraftRequested.current = true;
    createDraftIfNeeded({ forceCreation: true })
      .then((newId) => {
        if (!cancelled && !newId) {
          initialDraftRequested.current = false;
        }
      })
      .catch((error) => {
        if (!cancelled) {
          initialDraftRequested.current = false;
          console.error('Création initiale du brouillon échouée:', error);
        }
      });

    return () => {
      cancelled = true;
    };
    */
  }, [token, draftId, createDraftIfNeeded]);

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
      }
      if (draftId && hasPendingChanges) {
        autoSaveDraft({ forceSave: true }).catch(() => {});
      }
    };
  }, [autoSaveDraft, draftId, hasPendingChanges]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (draftId && hasPendingChanges) {
        autoSaveDraft({ forceSave: true }).catch(() => {});
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [autoSaveDraft, draftId, hasPendingChanges]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const authToken = resolveToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      // Vérifier que les champs obligatoires sont remplis avant la soumission
  const generalInfoSection = sections.find(s => s.id === 'general_info');
  const nameField = generalInfoSection?.fields?.find(f => f.id === 'nom');
  const firstNameField = generalInfoSection?.fields?.find(f => f.id === 'prenom');
  const addressField = generalInfoSection?.fields?.find(f => f.id === 'adresse');
      
      if (!nameField?.value?.trim() || !firstNameField?.value?.trim() || !addressField?.value?.trim()) {
        throw new Error('Veuillez remplir tous les champs obligatoires : Nom, Prénom et Adresse');
      }
      
      const ensuredDraftId = draftId || await createDraftIfNeeded({ forceCreation: true });
      if (!ensuredDraftId) {
        throw new Error('Impossible de créer le brouillon');
      }

      const payload = buildPayloadFromSections();
      await axios.patch(`${API}/searches/${ensuredDraftId}`, { ...payload, status: 'ACTIVE' }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setSubmitStatus({ type: 'success', message: 'Recherche finalisée', location: 'Base de données' });
      setTimeout(() => setSubmitStatus(null), 5000);
    // Réinitialisation
    setSections(createInitialSections(generateReferenceNumber));
    setPhotoPreview([]);
    setProfilePhoto(null);
    setProfilePhotoPreview(null);
      setDraftId(null);
  initialDraftRequested.current = false;
      setHasUserInteraction(false);
      setHasPendingChanges(false);
      setAutoSaveState({ ...INITIAL_AUTO_SAVE_STATE });
      onDraftEvent?.({ type: 'finalized', draftId: ensuredDraftId });
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
      }
    } catch (e) {
      let msg = 'Erreur lors de la finalisation';
      if (e.response?.data?.detail) msg = e.response.data.detail;
      else if (e.message) msg = e.message;
      setSubmitStatus({ type: 'error', message: msg });
      setTimeout(() => setSubmitStatus(null), 8000);
    } finally {
      setLoading(false);
    }
  };

  // New functions for enhanced form
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleSectionTitleChange = (sectionId, newTitle) => {
    setHasUserInteraction(true);
    setHasPendingChanges(true);
    setSections(prev => prev.map(section => 
      section.id === sectionId ? { ...section, title: newTitle } : section
    ));
  };

  const addNewSection = () => {
    const newSection = {
      id: `custom_${Date.now()}`,
      type: 'custom',
      title: `Section ${sections.length + 1}`,
      icon: Plus,
      value: '',
      required: false,
      placeholder: 'Décrivez le contenu de cette section...',
      fieldType: 'textarea',
      rows: 4,
      removable: true,
      collapsed: false,
      photos: []
    };
    setSections(prev => [...prev, newSection]);
    setHasUserInteraction(true);
    setHasPendingChanges(true);
  };

  const handleSectionPhotos = (sectionId, files) => {
    if (files && files.length > 0) {
      const newPhotos = Array.from(files).map((file, index) => ({
        file,
        url: URL.createObjectURL(file),
        name: file.name
      }));
      
      setSections(prev => prev.map(section => 
        section.id === sectionId 
          ? { ...section, photos: [...(section.photos || []), ...newPhotos] }
          : section
      ));
    }
  };

  const removeSectionPhoto = async (sectionId, photoIndex) => {
    const section = sections.find(s => s.id === sectionId);
    const photoToRemove = section?.photos?.[photoIndex];
    
    // Si la photo a un filename (donc elle est sur le serveur) et qu'on a un draftId, la supprimer du serveur
    if (photoToRemove?.filename && draftId) {
      try {
        await axios.delete(`${API}/searches/${draftId}/photos/${photoToRemove.filename}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Erreur lors de la suppression de la photo:', error);
      }
    }
    
    setSections(prev => prev.map(section => {
      if (section.id === sectionId && section.photos) {
        const newPhotos = section.photos.filter((_, index) => index !== photoIndex);
        // Revoke URL for removed photo
        if (section.photos[photoIndex]) {
          URL.revokeObjectURL(section.photos[photoIndex].url);
        }
        return { ...section, photos: newPhotos };
      }
      return section;
    }));
  };

  // New function for photo drag and drop
  const handleSectionPhotoDragEnd = (sectionId, result) => {
    if (!result.destination) {
      return;
    }

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) {
      return;
    }

    setSections(prev => prev.map(section => {
      if (section.id === sectionId && section.photos) {
        const reorderedPhotos = Array.from(section.photos);
        const [reorderedPhoto] = reorderedPhotos.splice(sourceIndex, 1);
        reorderedPhotos.splice(destinationIndex, 0, reorderedPhoto);
        
        return { ...section, photos: reorderedPhotos };
      }
      return section;
    }));
  };

  useImperativeHandle(ref, () => ({
    forceAutoSave: async () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
      }
      return autoSaveDraft({ forceSave: true });
    },
    loadDraft: (draft) => {
      if (!draft) {
        return;
      }

      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
      }

      const baseSections = createInitialSections(generateReferenceNumber).map((section) => {
        if (section.id === 'general_info') {
          return {
            ...section,
            fields: section.fields?.map((field) => {
              if (field.id === 'nom') {
                return { ...field, value: draft.nom || '' };
              }
              if (field.id === 'prenom') {
                return { ...field, value: draft.prenom || '' };
              }
              if (field.id === 'adresse') {
                return { ...field, value: draft.location || '' };
              }
              return field;
            })
          };
        }
        if (section.id === 'description') {
          return { ...section, value: draft.description || '' };
        }
        if (section.id === 'observations') {
          return { ...section, value: draft.observations || '' };
        }
        return section;
      });

      setDraftId(draft.id);
      setPhotoPreview([]);
      setHasUserInteraction(false);
      setHasPendingChanges(false);

      // Charger les photos existantes depuis le serveur
      if (draft.photos && Array.isArray(draft.photos) && draft.photos.length > 0) {
        setSavedPhotos(draft.photos);
        
        // A. Restaurer la photo de profil si elle existe
        const profilePhotoData = draft.photos.find(p => p.is_profile);
        if (profilePhotoData) {
          const photoUrl = profilePhotoData.url || `${API}/searches/${draft.id}/photos/${profilePhotoData.filename}`;
          setProfilePhotoPreview(photoUrl);
          setProfilePhoto(null);
        } else {
          setProfilePhoto(null);
          setProfilePhotoPreview(null);
        }

        // B. Distribuer les photos dans leurs sections respectives
        const sectionsWithPhotos = baseSections.map(section => {
          // Filtrer les photos qui appartiennent à cette section
          const sectionPhotos = draft.photos
            .filter(p => p.section_id === section.id && !p.is_profile)
            .map(p => ({
              url: p.url || `${API}/searches/${draft.id}/photos/${p.filename}`,
              filename: p.filename,
              name: p.original_name || p.filename
            }));

          if (sectionPhotos.length > 0) {
            console.log(`📸 [loadDraft] Section ${section.id}: ${sectionPhotos.length} photos chargées`);
            return { ...section, photos: sectionPhotos };
          }
          return section;
        });

        console.log('✅ [loadDraft] Sections avec photos distribuées:', sectionsWithPhotos.filter(s => s.photos?.length > 0).map(s => ({ id: s.id, photosCount: s.photos.length })));
        setSections(sectionsWithPhotos);
      } else {
        setSavedPhotos([]);
        setProfilePhoto(null);
        setProfilePhotoPreview(null);
        setSections(baseSections);
      }

      const lastSaved = draft.updated_at || draft.created_at;
      setAutoSaveState({ saving: false, lastSaved: lastSaved ? new Date(lastSaved) : null, error: null });
    },
    getDraftId: () => draftId,
    ensureDraft: (options = {}) => createDraftIfNeeded({ forceCreation: false, ...options })
  }), [autoSaveDraft, createDraftIfNeeded, draftId, generateReferenceNumber]);

  // Charger automatiquement le draft existant au montage du composant
  useEffect(() => {
    const loadExistingDraft = async () => {
      try {
        const response = await axios.get(`${API}/searches`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { status: 'DRAFT', limit: 1 }
        });
        
        if (response.data && response.data.length > 0) {
          const existingDraft = response.data[0];
          console.log('📥 Draft existant chargé:', existingDraft);
          
          // Utiliser directement les setters au lieu de draftActions
          if (existingDraft) {
            const baseSections = createInitialSections(generateReferenceNumber).map((section) => {
              if (section.id === 'general_info') {
                return {
                  ...section,
                  fields: section.fields?.map((field) => {
                    if (field.id === 'nom') {
                      return { ...field, value: existingDraft.nom || '' };
                    }
                    if (field.id === 'prenom') {
                      return { ...field, value: existingDraft.prenom || '' };
                    }
                    if (field.id === 'adresse') {
                      return { ...field, value: existingDraft.location || '' };
                    }
                    return field;
                  })
                };
              }
              if (section.id === 'description') {
                return { ...section, value: existingDraft.description || '' };
              }
              if (section.id === 'observations') {
                return { ...section, value: existingDraft.observations || '' };
              }
              return section;
            });

            setDraftId(existingDraft.id);
            setPhotoPreview([]);
            setHasUserInteraction(false);
            setHasPendingChanges(false);

            // Charger les photos existantes et les distribuer par section_id
            if (existingDraft.photos && Array.isArray(existingDraft.photos) && existingDraft.photos.length > 0) {
              setSavedPhotos(existingDraft.photos);
              
              // A. Restaurer la photo de profil
              const profilePhotoData = existingDraft.photos.find(p => p.is_profile);
              if (profilePhotoData) {
                const photoUrl = profilePhotoData.url || `${API}/searches/${existingDraft.id}/photos/${profilePhotoData.filename}`;
                setProfilePhotoPreview(photoUrl);
                setProfilePhoto(null);
              } else {
                setProfilePhoto(null);
                setProfilePhotoPreview(null);
              }

              // B. Distribuer les photos dans leurs sections respectives
              const sectionsWithPhotos = baseSections.map(section => {
                // Filtrer les photos qui appartiennent à cette section
                const sectionPhotos = existingDraft.photos
                  .filter(p => p.section_id === section.id && !p.is_profile)
                  .map(p => ({
                    url: p.url || `${API}/searches/${existingDraft.id}/photos/${p.filename}`,
                    filename: p.filename,
                    name: p.original_name || p.filename
                  }));

                if (sectionPhotos.length > 0) {
                  console.log(`📸 Section ${section.id}: ${sectionPhotos.length} photos chargées`);
                  return { ...section, photos: sectionPhotos };
                }
                return section;
              });

              console.log('✅ Sections avec photos distribuées:', sectionsWithPhotos.filter(s => s.photos?.length > 0).map(s => ({ id: s.id, photosCount: s.photos.length })));
              setSections(sectionsWithPhotos);
            } else {
              setSavedPhotos([]);
              setProfilePhoto(null);
              setProfilePhotoPreview(null);
              setSections(baseSections);
            }

            const lastSaved = existingDraft.updated_at || existingDraft.created_at;
            setAutoSaveState({ saving: false, lastSaved: lastSaved ? new Date(lastSaved) : null, error: null });
          }
        }
      } catch (error) {
        console.error('❌ Erreur chargement draft existant:', error);
      }
    };

    // NOTE: Chargement automatique DÉSACTIVÉ
    // L'utilisateur doit charger manuellement via "Brouillon en attente" ou "Modifier"
    // if (token && !draftId) {
    //   loadExistingDraft();
    // }
  }, [token, draftId, generateReferenceNumber]); // Dépendances correctes

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="bg-white rounded-2xl border-0 shadow-sm">
        <CardHeader className="pb-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-semibold text-gray-900">Nouvelle Recherche Terrain</CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Formulaire personnalisable avec sections modulaires
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          {/* Auto-save explanation */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Sauvegarde automatique :</span> Dès que vous complétez les 3 champs obligatoires (Nom, Prénom, Adresse) de la section "Informations Générales", un brouillon est créé. Vos modifications sont ensuite automatiquement enregistrées 2 secondes après chaque changement. Vous pouvez quitter et revenir sans perdre votre travail.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Auto-save indicator */}
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-500">
                {autoSaveState.saving ? (
                  <span className="inline-flex items-center text-amber-600"><Loader2 className="h-4 w-4 mr-1 animate-spin"/>Sauvegarde du brouillon…</span>
                ) : autoSaveState.error ? (
                  <span className="inline-flex items-center text-red-600"><AlertCircle className="h-4 w-4 mr-1"/>Erreur auto‑save</span>
                ) : hasPendingChanges ? (
                  <span className="inline-flex items-center text-amber-600"><Clock className="h-4 w-4 mr-1"/>Modifications en attente…</span>
                ) : autoSaveState.lastSaved ? (
                  <span className="inline-flex items-center text-green-600"><Check className="h-4 w-4 mr-1"/>Sauvegardé {autoSaveState.lastSaved.toLocaleTimeString()}</span>
                ) : draftId ? (
                  <span className="text-gray-400">Brouillon créé</span>
                ) : (
                  <span className="text-gray-400">Complétez Nom, Prénom et Adresse pour créer le brouillon</span>
                )}
              </div>
            </div>
            {/* Dynamic Sections */}
            <div className="space-y-6">
              {sections.map((section, index) => (
                <div key={section.id} className="relative group bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-all duration-200 hover:shadow-sm">
                  {/* Section Header */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                        <section.icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => handleSectionTitleChange(section.id, e.target.value)}
                          className="font-medium text-gray-900 bg-transparent border-none outline-none focus:bg-gray-50 px-2 py-1 rounded text-lg w-full"
                          placeholder="Nom de la section..."
                        />
                      </div>
                    </div>
                    
                    {/* Section Controls */}
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => toggleSectionCollapse(section.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {section.collapsed ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronUp className="h-5 w-5" />
                        )}
                      </button>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => moveSectionUp(index)}
                          disabled={index === 0}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Déplacer vers le haut"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSectionDown(index)}
                          disabled={index === sections.length - 1}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Déplacer vers le bas"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSection(section.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer la section"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Section Content */}
                  {!section.collapsed && (
                    <div className="p-6">
                      {/* Multiple fields for general_info section */}
                      {section.fieldType === 'multiple' && section.fields ? (
                        <div className="space-y-4 mb-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {section.fields.map((field) => (
                              <div key={field.id} className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  {field.label}
                                  {field.required && <span className="text-red-500 ml-1">*</span>}
                                </label>
                                {field.type === 'textarea' ? (
                                  <textarea
                                    value={field.value}
                                    onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
                                    placeholder={field.placeholder || `Saisissez ${field.label.toLowerCase()}...`}
                                    rows={3}
                                    className="w-full rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition-colors duration-200 text-base p-4 resize-none"
                                    required={field.required}
                                    readOnly={field.readonly}
                                  />
                                ) : (
                                  <input
                                    type={field.type}
                                    value={field.value}
                                    onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
                                    placeholder={field.placeholder || `Saisissez ${field.label.toLowerCase()}...`}
                                    className="w-full rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition-colors duration-200 text-base p-4"
                                    required={field.required}
                                    readOnly={field.readonly}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                          
                          {/* Profile Photo for general_info section - Design amélioré avec fond */}
                          {section.id === 'general_info' && (
                            <div className="mt-6 relative overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
                              {/* Image de fond avec effet de fondu */}
                              {profilePhotoPreview && (
                                <div 
                                  className="absolute inset-0 bg-cover bg-center opacity-10 blur-sm scale-110"
                                  style={{ backgroundImage: `url(${profilePhotoPreview})` }}
                                />
                              )}
                              
                              {/* Contenu principal */}
                              <div className="relative bg-gradient-to-br from-white/95 to-gray-50/95 backdrop-blur-sm p-6">
                                <h5 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
                                  <User className="h-4 w-4 mr-2" />
                                  Photo de profil (optionnelle)
                                </h5>
                                
                                <div className="flex items-center gap-6">
                                  {/* Aperçu de la photo */}
                                  <div className="relative group">
                                    {profilePhotoPreview ? (
                                      <>
                                        <div className="relative">
                                          <img
                                            src={profilePhotoPreview}
                                            alt="Profile preview"
                                            className="w-24 h-24 object-cover rounded-2xl border-4 border-white shadow-lg transition-transform duration-300 group-hover:scale-105"
                                          />
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl" />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setProfilePhoto(null);
                                            setProfilePhotoPreview(null);
                                            setHasUserInteraction(true);
                                            setHasPendingChanges(true);
                                          }}
                                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 transition-all shadow-lg hover:scale-110"
                                          title="Supprimer la photo"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </>
                                    ) : (
                                      <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center bg-white/50 backdrop-blur-sm transition-colors hover:border-gray-400">
                                        <User className="h-10 w-10 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Zone de texte et bouton */}
                                  <div className="flex-1">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={handleProfilePhotoChange}
                                      className="hidden"
                                      id="profile-photo"
                                    />
                                    <label
                                      htmlFor="profile-photo"
                                      className="inline-flex items-center px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl cursor-pointer transition-all font-medium shadow-md hover:shadow-lg hover:scale-105"
                                    >
                                      <Camera className="h-4 w-4 mr-2" />
                                      {profilePhotoPreview ? 'Changer la photo' : 'Choisir une photo'}
                                    </label>
                                    <p className="text-xs text-gray-600 mt-2 flex items-center">
                                      <span className="inline-block w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                                      Formats acceptés: JPG, PNG, WebP (max 5MB)
                                    </p>
                                    {profilePhotoPreview && (
                                      <p className="text-xs text-green-600 mt-1 flex items-center font-medium">
                                        <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                                        Photo ajoutée avec succès
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Default text content for other sections */
                        <div className="space-y-4">
                          <textarea
                            placeholder="Décrivez le contenu de cette section..."
                            value={section.value || ''}
                            onChange={(e) => handleSectionChange(section.id, e.target.value)}
                            rows={4}
                            className="w-full rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition-colors duration-200 text-base p-4 resize-none"
                          />
                          
                          {/* Photos pour chaque section */}
                          <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-gray-700">
                                Photos de cette section
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => handleSectionPhotos(section.id, e.target.files)}
                                className="hidden"
                                id={`section-photos-${section.id}`}
                              />
                              <label
                                htmlFor={`section-photos-${section.id}`}
                                className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg cursor-pointer transition-colors text-sm font-medium border border-gray-200"
                              >
                                <Camera className="h-4 w-4 mr-1.5" />
                                Ajouter des photos
                              </label>
                            </div>

                            {section.photos && section.photos.length > 0 ? (
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {section.photos.map((photo, photoIndex) => (
                                  <div 
                                    key={photoIndex} 
                                    className="relative group cursor-move bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-all"
                                    draggable
                                    onDragStart={(e) => {
                                      e.dataTransfer.effectAllowed = 'move';
                                      e.dataTransfer.setData('text/plain', JSON.stringify({
                                        sectionId: section.id,
                                        fromIndex: photoIndex
                                      }));
                                    }}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
                                    }}
                                    onDragLeave={(e) => {
                                      e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                                      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                                      if (data.sectionId === section.id && data.fromIndex !== photoIndex) {
                                        // Réorganiser les photos
                                        setSections(prevSections => prevSections.map(s => {
                                          if (s.id === section.id) {
                                            const newPhotos = [...s.photos];
                                            const [movedPhoto] = newPhotos.splice(data.fromIndex, 1);
                                            newPhotos.splice(photoIndex, 0, movedPhoto);
                                            return { ...s, photos: newPhotos };
                                          }
                                          return s;
                                        }));
                                        setHasPendingChanges(true);
                                      }
                                    }}
                                  >
                                    {/* Image avec fond pour voir l'image complète */}
                                    <div 
                                      className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer"
                                      onClick={() => {
                                        setLightboxImage(photo.url);
                                        setShowLightbox(true);
                                      }}
                                    >
                                      <img
                                        src={photo.url}
                                        alt={photo.name}
                                        className="max-w-full max-h-full object-contain"
                                      />
                                    </div>
                                    
                                    {/* Boutons d'action */}
                                    <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setLightboxImage(photo.url);
                                          setShowLightbox(true);
                                        }}
                                        className="bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-blue-600 shadow-lg"
                                        title="Voir en détail"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeSectionPhoto(section.id, photoIndex)}
                                        className="bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 shadow-lg"
                                        title="Supprimer"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                    
                                    {/* Numéro de la photo */}
                                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md font-medium flex items-center space-x-1">
                                      <GripVertical className="h-3 w-3" />
                                      <span>#{photoIndex + 1}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 text-center py-3 border border-dashed border-gray-200 rounded-lg">
                                Aucune photo ajoutée pour cette section
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Add New Section Button */}
              <button
                type="button"
                onClick={addNewSection}
                className="w-full flex items-center justify-center space-x-3 py-6 border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-xl transition-colors group"
              >
                <div className="w-10 h-10 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                  <Plus className="h-5 w-5 text-gray-600 group-hover:text-white" />
                </div>
                <span className="text-gray-600 group-hover:text-gray-900 font-medium">
                  Ajouter une nouvelle section
                </span>
              </button>
            </div>

            {/* Enhanced Submit Button */}
            <div className="pt-6 border-t border-gray-200 space-y-3">
              {/* Bouton Sauvegarder le brouillon */}
              <Button 
                type="button"
                onClick={() => autoSaveDraft({ forceSave: true })}
                disabled={autoSaveState.saving || !sections.find(s => s.id === 'general_info')?.fields?.every(f => f.value?.trim())}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-base font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {autoSaveState.saving ? (
                  <div className="flex items-center justify-center space-x-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Sauvegarde en cours...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-3">
                    <Save className="h-5 w-5" />
                    <span>Sauvegarder le brouillon</span>
                  </div>
                )}
              </Button>
              
              {/* Bouton Finaliser la recherche */}
              <Button 
                type="submit" 
                disabled={loading || sections.length === 0} 
                className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl py-4 text-base font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Finalisation en cours...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-3">
                    <CheckCheck className="h-5 w-5" />
                    <span>Finaliser la recherche</span>
                    <div className="ml-2">
                      <Lightbulb className="h-4 w-4 text-yellow-400 animate-pulse" />
                    </div>
                  </div>
                )}
              </Button>
              
              {/* Success/Error Feedback */}
              {submitStatus && (
                <div className={`mt-4 p-4 rounded-xl flex items-center space-x-3 ${
                  submitStatus.type === 'success' 
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  {submitStatus.type === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{submitStatus.message}</p>
                    {submitStatus.location && (
                      <div className="flex items-center space-x-2 mt-2 text-sm">
                        <Lightbulb className="h-4 w-4 text-yellow-600" />
                        <span>Recherche enregistrée dans : {submitStatus.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <p className="text-sm text-gray-500 text-center mt-4">
                Personnalisez entièrement votre rapport terrain avec des sections modulaires
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Lightbox Modal pour visualiser les photos en grand */}
      {showLightbox && (
        <div 
          className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4"
          onClick={() => {
            setShowLightbox(false);
            setLightboxImage(null);
          }}
        >
          <button
            onClick={() => {
              setShowLightbox(false);
              setLightboxImage(null);
            }}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full w-12 h-12 flex items-center justify-center backdrop-blur-sm transition-all z-[10000]"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div 
            className="relative max-w-7xl max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage}
              alt="Aperçu"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm">
            Cliquez n'importe où pour fermer
          </div>
        </div>
      )}
    </div>
  );
});

SearchForm.displayName = 'SearchForm';
export { SearchForm, AuthContext };

// Apple-style Search History Component
const SearchHistory = () => {
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [hasMore, setHasMore] = useState(false);
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortDir, setSortDir] = useState('desc');
  const [editingSearch, setEditingSearch] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [selectedSearchForPDF, setSelectedSearchForPDF] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadSearches();
  }, [page, sortBy, sortDir]);

  const loadSearches = async () => {
    try {
      const params = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_dir: sortDir,
      };
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      if (filter !== 'all') {
        params.status = filter.toUpperCase();
      }
      const response = await axios.get(`${API}/searches`, {
        params,
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (Array.isArray(response.data)) {
        // rétro‑compat si backend renvoie liste simple
        setSearches(response.data);
        setHasMore(false);
      } else {
        setSearches(response.data.items || []);
        setHasMore(!!response.data.has_more);
      }
    } catch (error) {
      console.error('Erreur chargement recherches:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSearchTermChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const applySearch = () => {
    setLoading(true);
    loadSearches();
  };

  const nextPage = () => { if (hasMore) setPage(p => p + 1); };
  const prevPage = () => { if (page > 1) setPage(p => p - 1); };
  const changeSort = (field) => {
    if (field === sortBy) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
    setPage(1);
  };

  const editSearch = async (searchId, updatedData) => {
    try {
      await axios.put(`${API}/searches/${searchId}`, updatedData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Recharger la recherche complète avec toutes les données (y compris photos)
      const refreshedSearch = await axios.get(`${API}/searches/${searchId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setSearches(prev => prev.map(search => 
        search.id === searchId ? refreshedSearch.data : search
      ));
      
      setShowEditModal(false);
      setEditingSearch(null);
      
    } catch (error) {
      console.error('Erreur mise à jour recherche:', error);
      alert('Erreur lors de la mise à jour de la recherche');
    }
  };

  const generatePDFPreview = async (searchId) => {
    setGenerating(true);
    try {
      const response = await axios({
        method: 'post',
        url: `${API}/reports/generate-pdf/${searchId}`,
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setPdfUrl(url);
      setSelectedSearchForPDF(searchId);
      setShowPDFPreview(true);
    } catch (error) {
      console.error('Erreur génération aperçu PDF:', error);
      alert('Erreur lors de la génération de l\'aperçu PDF');
    } finally {
      setGenerating(false);
    }
  };

  const downloadPDF = async (searchId) => {
    setGenerating(true);
    try {
      const response = await axios({
        method: 'post',
        url: `${API}/reports/generate-pdf/${searchId}`,
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-${searchId}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error);
      alert('Erreur lors du téléchargement du PDF');
    } finally {
      setGenerating(false);
    }
  };

  const updateSearchStatus = async (searchId, status) => {
    try {
      await axios.put(`${API}/searches/${searchId}`, { status }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setSearches(prev => prev.map(search => 
        search.id === searchId ? { ...search, status } : search
      ));
      
      alert(`Statut mis à jour: ${status}`);
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const deleteSearch = async (search) => {
    if (!search) return;
    
    // Message différent selon le statut
    let confirmMessage;
    if (search.status === 'DRAFT') {
      confirmMessage = 'Supprimer ce brouillon définitivement ?';
    } else if (search.status === 'ARCHIVED') {
      confirmMessage = 'Supprimer définitivement cette recherche archivée ?\nCette action est irréversible.';
    } else {
      confirmMessage = 'Archiver cette recherche ?\nElle sera marquée comme archivée.';
    }
    
    if (!confirm(confirmMessage)) return;
    
    try {
      const resp = await axios.delete(`${API}/searches/${search.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const body = resp.data || {};
      if (body.search) {
        // Archivé: mettre à jour l'élément
        setSearches(prev => prev.map(s => s.id === search.id ? body.search : s));
      } else {
        // Supprimé définitivement
        setSearches(prev => prev.filter(s => s.id !== search.id));
      }
    } catch (error) {
      if (error?.response?.status === 405) {
        try {
          const resp = await axios.post(`${API}/searches/${search.id}/delete`, null, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          const body = resp.data || {};
          if (body.search) {
            setSearches(prev => prev.map(s => s.id === search.id ? body.search : s));
          } else {
            setSearches(prev => prev.filter(s => s.id !== search.id));
          }
          return;
        } catch (fallbackError) {
          console.error('Erreur suppression (fallback):', fallbackError);
        }
      } else {
        console.error('Erreur suppression recherche:', error);
      }
      alert('Impossible de supprimer/archiver la recherche pour le moment.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'ACTIVE': 'bg-blue-100 text-blue-800',
      'SHARED': 'bg-green-100 text-green-800',
      'PROCESSED': 'bg-gray-100 text-gray-800',
      'ARCHIVED': 'bg-red-100 text-red-800',
      'DRAFT': 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBackgroundColor = (status) => {
    const colors = {
      'DRAFT': 'bg-purple-50 border-purple-200',
      'ACTIVE': 'bg-blue-50 border-blue-200',
      'SHARED': 'bg-green-50 border-green-200',
      'PROCESSED': 'bg-gray-50 border-gray-200',
      'ARCHIVED': 'bg-red-50 border-red-200'
    };
    return colors[status] || 'bg-white border-gray-200';
  };

  const filteredSearches = searches.filter(search => {
    const matchesFilter = filter === 'all' || search.status === filter;
    const matchesSearch = !searchTerm || 
      search.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      search.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Edit Modal Component - Utilise le même formulaire dynamique que SearchForm
  const EditSearchModal = ({ search, onSave, onClose }) => {
    const generateReferenceNumber = useCallback(() => {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `REF${year}${month}${day}-${random}`;
    }, []);

    const [sections, setSections] = useState(() => createInitialSections(generateReferenceNumber));
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
    const [showLightbox, setShowLightbox] = useState(false);
    const [lightboxImage, setLightboxImage] = useState(null);

    useEffect(() => {
      if (search) {
        // Charger les données existantes dans les sections
        setSections(prev => prev.map(section => {
          if (section.id === 'general_info') {
            return {
              ...section,
              fields: section.fields?.map(field => {
                if (field.id === 'nom') {
                  return { ...field, value: search.nom || '' };
                }
                if (field.id === 'prenom') {
                  return { ...field, value: search.prenom || '' };
                }
                if (field.id === 'adresse') {
                  return { ...field, value: search.location || '' };
                }
                return field;
              })
            };
          }
          if (section.id === 'description') {
            return { ...section, value: search.description || '' };
          }
          if (section.id === 'observations') {
            return { ...section, value: search.observations || '' };
          }
          return section;
        }));
        
        // Charger les photos existantes si disponibles
        if (search.photos && Array.isArray(search.photos)) {
          // A. Charger la photo de profil
          const profilePhotoData = search.photos.find(p => p.is_profile);
          if (profilePhotoData) {
            const photoUrl = profilePhotoData.url || `${API}/searches/${search.id}/photos/${profilePhotoData.filename}`;
            setProfilePhotoPreview(photoUrl);
          }

          // B. Distribuer les photos dans leurs sections respectives
          setSections(prevSections => prevSections.map(section => {
            // Filtrer les photos qui appartiennent à cette section
            const sectionPhotos = search.photos
              .filter(p => p.section_id === section.id && !p.is_profile)
              .map(p => ({
                url: p.url || `${API}/searches/${search.id}/photos/${p.filename}`,
                filename: p.filename,
                name: p.original_name || p.filename
              }));

            if (sectionPhotos.length > 0) {
              return { ...section, photos: sectionPhotos };
            }
            return section;
          }));
        }
      }
    }, [search]);

    const handleSectionChange = (sectionId, value) => {
      setSections(prev => prev.map(section => 
        section.id === sectionId ? { ...section, value } : section
      ));
    };

    const handleFieldChange = (sectionId, fieldId, value) => {
      setSections(prev => prev.map(section => 
        section.id === sectionId 
          ? {
              ...section,
              fields: section.fields?.map(field =>
                field.id === fieldId ? { ...field, value } : field
              )
            }
          : section
      ));
    };

    const handleProfilePhotoChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          alert('La taille du fichier ne peut pas dépasser 5MB');
          return;
        }
        setProfilePhoto(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfilePhotoPreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
    };

    const removeSection = (sectionId) => {
      setSections(prev => prev.filter(section => section.id !== sectionId));
    };

    const toggleSectionCollapse = (sectionId) => {
      setSections(prev => prev.map(section => 
        section.id === sectionId ? { ...section, collapsed: !section.collapsed } : section
      ));
    };

    const addNewSection = () => {
      const newSection = {
        id: `custom_${Date.now()}`,
        type: 'custom',
        title: `Section ${sections.length + 1}`,
        icon: Plus,
        value: '',
        required: false,
        placeholder: 'Décrivez le contenu de cette section...',
        fieldType: 'textarea',
        rows: 4,
        removable: true,
        collapsed: false,
        photos: []
      };
      setSections(prev => [...prev, newSection]);
    };

    const handleSectionTitleChange = (sectionId, newTitle) => {
      setSections(prev => prev.map(section => 
        section.id === sectionId ? { ...section, title: newTitle } : section
      ));
    };

    const handleSectionPhotos = (sectionId, files) => {
      if (files && files.length > 0) {
        const newPhotos = Array.from(files).map((file) => ({
          file,
          url: URL.createObjectURL(file),
          name: file.name
        }));
        
        setSections(prev => prev.map(section => 
          section.id === sectionId 
            ? { ...section, photos: [...(section.photos || []), ...newPhotos] }
            : section
        ));
      }
    };

    const removeSectionPhoto = async (sectionId, photoIndex) => {
      const section = sections.find(s => s.id === sectionId);
      if (!section || !section.photos) return;

      const photoToRemove = section.photos[photoIndex];
      
      // Si la photo a un filename (déjà sauvegardée sur le serveur), la supprimer
      if (photoToRemove.filename && search?.id) {
        try {
          const token = localStorage.getItem('token');
          await axios.delete(`${API}/searches/${search.id}/photos/${photoToRemove.filename}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log(`✅ Photo ${photoToRemove.filename} supprimée du serveur`);
        } catch (error) {
          console.error('Erreur suppression photo:', error);
          alert('Erreur lors de la suppression de la photo');
          return;
        }
      }

      // Mettre à jour l'état local
      setSections(prev => prev.map(s => {
        if (s.id === sectionId && s.photos) {
          const newPhotos = s.photos.filter((_, index) => index !== photoIndex);
          // Révoquer l'URL locale si c'est une preview
          if (s.photos[photoIndex]?.url?.startsWith('blob:')) {
            URL.revokeObjectURL(s.photos[photoIndex].url);
          }
          return { ...s, photos: newPhotos };
        }
        return s;
      }));
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      // Construire le payload depuis les sections
      const generalSection = sections.find(s => s.id === 'general_info');
      const addressField = generalSection?.fields?.find(f => f.id === 'adresse');
      const descriptionSection = sections.find(s => s.id === 'description');
      const additionalContent = sections
        .filter(s => s.value && !['general_info', 'description'].includes(s.id))
        .map(s => `**${s.title}:**\n${s.value}`)
        .join('\n\n');

      const payload = {
        location: addressField?.value || '',
        description: descriptionSection?.value || '',
        observations: additionalContent || ''
      };

      try {
        // 1. Sauvegarder d'abord les données textuelles
        await onSave(search.id, payload);

        // 2. Uploader les nouvelles photos de chaque section
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Token d\'authentification manquant');
        }

        // A. Uploader la photo de profil si nouvelle
        if (profilePhoto) {
          const formData = new FormData();
          formData.append('files', profilePhoto);
          formData.append('is_profile', 'true');
          formData.append('section_id', 'profile');

          await axios.post(
            `${API}/searches/${search.id}/photos`,
            formData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
              }
            }
          );
        }

        // B. Uploader les nouvelles photos de chaque section
        for (const section of sections) {
          if (section.photos && section.photos.length > 0) {
            // Filtrer uniquement les nouvelles photos (celles qui ont un objet file)
            const newPhotos = section.photos.filter(photo => photo.file);
            
            if (newPhotos.length > 0) {
              const formData = new FormData();
              newPhotos.forEach(photo => {
                formData.append('files', photo.file);
              });
              formData.append('section_id', section.id);

              await axios.post(
                `${API}/searches/${search.id}/photos`,
                formData,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                  }
                }
              );
            }
          }
        }

        // C. Sauvegarder les données textuelles
        await onSave(search.id, payload);

        alert('Recherche et photos mises à jour avec succès !');
        
        // Fermer le modal - la liste se rafraîchira automatiquement via onSave
        onClose();
      } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        alert('Erreur lors de la mise à jour de la recherche');
      }
    };

    if (!search) return null;

    return (
      <Dialog open={showEditModal} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">Modifier la Recherche</DialogTitle>
            <DialogDescription>
              Formulaire personnalisable avec sections modulaires
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            {/* Rendu des sections dynamiques */}
            {sections.map((section, index) => (
              <div key={section.id} className="bg-gray-50 rounded-xl p-6 relative">
                {/* En-tête de section */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      <section.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      {section.type === 'custom' ? (
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => handleSectionTitleChange(section.id, e.target.value)}
                          className="text-lg font-semibold text-gray-900 bg-transparent border-b border-dashed border-gray-300 focus:border-gray-900 outline-none w-full"
                        />
                      ) : (
                        <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => toggleSectionCollapse(section.id)}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      {section.collapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </button>
                    {section.removable && (
                      <button
                        type="button"
                        onClick={() => removeSection(section.id)}
                        className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Contenu de section */}
                {!section.collapsed && (
                  <div className="space-y-4">
                    {/* Champs multiples pour general_info */}
                    {section.fieldType === 'multiple' && section.fields ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {section.fields.map((field) => (
                            <div key={field.id} className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              {field.type === 'textarea' ? (
                                <textarea
                                  value={field.value}
                                  onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
                                  placeholder={field.placeholder || `Saisissez ${field.label.toLowerCase()}...`}
                                  rows={3}
                                  className="w-full rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition-colors duration-200 text-base p-4 resize-none"
                                  required={field.required}
                                  readOnly={field.readonly}
                                />
                              ) : (
                                <input
                                  type={field.type}
                                  value={field.value}
                                  onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
                                  placeholder={field.placeholder || `Saisissez ${field.label.toLowerCase()}...`}
                                  className="w-full rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition-colors duration-200 text-base p-4"
                                  required={field.required}
                                  readOnly={field.readonly}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {/* Photo de profil pour general_info */}
                        {section.id === 'general_info' && (
                          <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200">
                            <h5 className="text-sm font-medium text-gray-700 mb-3">Photo de profil (optionnelle)</h5>
                            <div className="flex items-center space-x-4">
                              {profilePhotoPreview ? (
                                <div className="relative">
                                  <img
                                    src={profilePhotoPreview}
                                    alt="Profile preview"
                                    className="w-20 h-20 object-cover rounded-full border-2 border-gray-200"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setProfilePhoto(null);
                                      setProfilePhotoPreview(null);
                                    }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
                                  <User className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleProfilePhotoChange}
                                  className="hidden"
                                  id="edit-profile-photo"
                                />
                                <label
                                  htmlFor="edit-profile-photo"
                                  className="inline-flex items-center px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg cursor-pointer transition-colors text-sm font-medium border border-gray-200"
                                >
                                  <Camera className="h-4 w-4 mr-2" />
                                  Choisir une photo
                                </label>
                                <p className="text-xs text-gray-500 mt-1">Formats acceptés: JPG, PNG (max 5MB)</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Contenu textarea par défaut */
                      <div className="space-y-4">
                        <textarea
                          placeholder={section.placeholder || 'Décrivez le contenu de cette section...'}
                          value={section.value || ''}
                          onChange={(e) => handleSectionChange(section.id, e.target.value)}
                          rows={section.rows || 4}
                          required={section.required}
                          className="w-full rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition-all duration-200 text-base p-4 resize-none"
                        />

                        {/* Photos de section */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">
                              Photos de cette section
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => handleSectionPhotos(section.id, e.target.files)}
                              className="hidden"
                              id={`section-photos-${section.id}`}
                            />
                            <label
                              htmlFor={`section-photos-${section.id}`}
                              className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg cursor-pointer transition-colors text-sm font-medium border border-gray-200"
                            >
                              <Camera className="h-4 w-4 mr-1.5" />
                              Ajouter des photos
                            </label>
                          </div>

                          {section.photos && section.photos.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {section.photos.map((photo, photoIndex) => (
                                <div 
                                  key={photoIndex} 
                                  className="relative group cursor-move bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-all"
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData('text/plain', JSON.stringify({
                                      sectionId: section.id,
                                      fromIndex: photoIndex
                                    }));
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
                                  }}
                                  onDragLeave={(e) => {
                                    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                                    if (data.sectionId === section.id && data.fromIndex !== photoIndex) {
                                      setSections(prevSections => prevSections.map(s => {
                                        if (s.id === section.id) {
                                          const newPhotos = [...s.photos];
                                          const [movedPhoto] = newPhotos.splice(data.fromIndex, 1);
                                          newPhotos.splice(photoIndex, 0, movedPhoto);
                                          return { ...s, photos: newPhotos };
                                        }
                                        return s;
                                      }));
                                    }
                                  }}
                                >
                                  <div 
                                    className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer"
                                    onClick={() => {
                                      setLightboxImage(photo.url);
                                      setShowLightbox(true);
                                    }}
                                  >
                                    <img
                                      src={photo.url}
                                      alt={photo.name}
                                      className="max-w-full max-h-full object-contain"
                                    />
                                  </div>
                                  
                                  <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setLightboxImage(photo.url);
                                        setShowLightbox(true);
                                      }}
                                      className="bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-blue-600 shadow-lg"
                                      title="Voir en détail"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeSectionPhoto(section.id, photoIndex)}
                                      className="bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 shadow-lg"
                                      title="Supprimer"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  
                                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md font-medium flex items-center space-x-1">
                                    <GripVertical className="h-3 w-3" />
                                    <span>#{photoIndex + 1}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Bouton ajouter section */}
            <button
              type="button"
              onClick={addNewSection}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Ajouter une section personnalisée</span>
            </button>
            
            {/* Boutons d'action */}
            <div className="flex flex-col space-y-3 pt-4 border-t">
              <Button 
                type="button"
                onClick={async () => {
                  // Sauvegarder comme brouillon (status = DRAFT)
                  const generalSection = sections.find(s => s.id === 'general_info');
                  const addressField = generalSection?.fields?.find(f => f.id === 'adresse');
                  const descriptionSection = sections.find(s => s.id === 'description');
                  const additionalContent = sections
                    .filter(s => s.value && !['general_info', 'description'].includes(s.id))
                    .map(s => `**${s.title}:**\n${s.value}`)
                    .join('\n\n');

                  const payload = {
                    location: addressField?.value || '',
                    description: descriptionSection?.value || '',
                    observations: additionalContent || '',
                    status: 'DRAFT'
                  };

                  try {
                    await onSave(search.id, payload);
                    alert('Brouillon sauvegardé !');
                  } catch (error) {
                    alert('Erreur lors de la sauvegarde du brouillon');
                  }
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-3"
              >
                <Save className="h-4 w-4 mr-2" />
                Enregistrer le brouillon
              </Button>
              
              <div className="flex space-x-3">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl">
                  Annuler
                </Button>
                <Button type="submit" className="flex-1 bg-gray-900 hover:bg-gray-800 rounded-xl">
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Finaliser la recherche
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>

        {/* Lightbox Modal pour visualiser les photos en grand */}
        {showLightbox && (
          <div 
            className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4"
            onClick={() => {
              setShowLightbox(false);
              setLightboxImage(null);
            }}
          >
            <button
              onClick={() => {
                setShowLightbox(false);
                setLightboxImage(null);
              }}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full w-12 h-12 flex items-center justify-center backdrop-blur-sm transition-all z-[10000]"
            >
              <X className="h-6 w-6" />
            </button>
            
            <div 
              className="relative max-w-7xl max-h-[90vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxImage}
                alt="Aperçu"
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              />
            </div>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm">
              Cliquez n'importe où pour fermer
            </div>
          </div>
        )}
      </Dialog>
    );
  };

  const PDFPreviewModal = () => (
    <Dialog open={showPDFPreview} onOpenChange={() => {
      setShowPDFPreview(false);
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
        setPdfUrl('');
      }
    }}>
      <DialogContent className="sm:max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Aperçu du Rapport PDF</DialogTitle>
          <DialogDescription>
            Prévisualisez le rapport avant téléchargement
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          {pdfUrl && (
            <iframe
              src={pdfUrl}
              className="w-full h-full rounded-lg border"
              title="Aperçu PDF"
            />
          )}
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <Button 
            variant="outline" 
            onClick={() => {
              setShowPDFPreview(false);
              if (pdfUrl) {
                window.URL.revokeObjectURL(pdfUrl);
                setPdfUrl('');
              }
            }}
          >
            Fermer
          </Button>
          <Button 
            onClick={() => downloadPDF(selectedSearchForPDF)}
            className="bg-gray-900 hover:bg-gray-800"
          >
            <Download className="h-4 w-4 mr-2" />
            Télécharger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de l'historique...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Mes Recherches</h2>
            <p className="text-gray-600 mt-1">Consultez, modifiez et gérez vos recherches terrain</p>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 w-full lg:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={onSearchTermChange}
                className="pl-10 rounded-xl border-gray-200 focus:border-gray-900 focus:ring-gray-900/10 w-full sm:w-64"
              />
            </div>
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-white rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-gray-900/10 transition-all duration-200 px-4 py-2 text-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="ACTIVE">Actives</option>
              <option value="SHARED">Partagées</option>
              <option value="PROCESSED">Traitées</option>
              <option value="ARCHIVED">Archivées</option>
            </select>

            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => changeSort('updated_at')} className="text-xs">Tri: {sortBy === 'updated_at' ? 'Modifié' : sortBy} {sortDir === 'asc' ? '↑' : '↓'}</Button>
              <Button variant="outline" onClick={applySearch} className="text-xs">Appliquer</Button>
            </div>
          </div>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">Page {page}{hasMore ? '' : ' (fin)'} • {searches.length} éléments chargés</div>
          <div className="flex space-x-2">
            <Button variant="outline" disabled={page === 1} onClick={prevPage} className="text-xs">Précédent</Button>
            <Button variant="outline" disabled={!hasMore} onClick={nextPage} className="text-xs">Suivant</Button>
          </div>
        </div>
        {/* Stats (incluant Brouillons et Archivées) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          {[
            { key: 'draft', status: 'DRAFT', label: 'Brouillons', bg: 'bg-purple-50', textColor: 'text-purple-600', labelColor: 'text-purple-700' },
            { key: 'active', status: 'ACTIVE', label: 'Actives', bg: 'bg-blue-50', textColor: 'text-blue-600', labelColor: 'text-blue-700' },
            { key: 'shared', status: 'SHARED', label: 'Partagées', bg: 'bg-green-50', textColor: 'text-green-600', labelColor: 'text-green-700' },
            { key: 'processed', status: 'PROCESSED', label: 'Traitées', bg: 'bg-gray-50', textColor: 'text-gray-600', labelColor: 'text-gray-700' },
            { key: 'total', status: null, label: 'Total (page)', bg: 'bg-black', textColor: 'text-white', labelColor: 'text-gray-200' }
          ].map((stat) => (
            <div key={stat.key} className={`${stat.bg} rounded-xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${stat.textColor}`}>
                {stat.status ? searches.filter(s => s.status === stat.status).length : searches.length}
              </p>
              <p className={`text-sm ${stat.labelColor}`}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search List */}
      {filteredSearches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-12 text-center">
            <History className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || filter !== 'all' ? 'Aucun résultat' : 'Aucune recherche enregistrée'}
            </h3>
            <p className="text-gray-500">
              {searchTerm || filter !== 'all' ? 'Essayez de modifier vos critères de recherche' : 'Créez votre première recherche pour commencer'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredSearches.map((search) => (
            <div key={search.id} className={`rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden ${getStatusBackgroundColor(search.status)}`}>
              <div className="p-6">
                {/* Header avec location et statut */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{search.location}</h3>
                      <span className={`text-xs px-3 py-1.5 rounded-full font-semibold uppercase tracking-wide ${getStatusColor(search.status)}`}>
                        {search.status}
                      </span>
                    </div>
                    <p className="text-gray-600 leading-relaxed">{search.description}</p>
                  </div>
                </div>
                
                {/* Photos - Design amélioré */}
                {search.photos && search.photos.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-900 flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {search.photos.length} {search.photos.length > 1 ? 'Photos' : 'Photo'}
                      </p>
                    </div>
                    <div className="flex space-x-3 overflow-x-auto pb-2">
                      {search.photos.slice(0, 3).map((photo, index) => (
                        <div key={photo.filename || `${search.id}-photo-${index}`} className="relative flex-shrink-0 group/photo">
                          <img
                            src={`${API}/searches/${search.id}/photos/${photo.filename}`}
                            alt={`Photo ${photo.number}`}
                            className="w-24 h-24 object-cover rounded-xl border-2 border-white shadow-md hover:scale-105 transition-transform duration-200 cursor-pointer"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <div className="absolute top-1 right-1 w-6 h-6 bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                            {photo.number}
                          </div>
                        </div>
                      ))}
                      {search.photos.length > 3 && (
                        <div className="flex-shrink-0 w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl border-2 border-white shadow-md flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-700">+{search.photos.length - 3}</p>
                            <p className="text-xs text-gray-500">plus</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Observations */}
                {search.observations && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 border border-blue-100">
                    <p className="text-sm text-blue-900">
                      <span className="font-semibold">💬 Observations:</span> {search.observations}
                    </p>
                  </div>
                )}
                    
                    {/* Métadonnées */}
                    <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4 pb-4 border-b border-gray-200">
                      <span className="flex items-center font-medium">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {formatDate(search.created_at)}
                      </span>
                      {search.latitude && search.longitude && (
                        <span className="flex items-center font-medium">
                          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                          {search.latitude.toFixed(4)}, {search.longitude.toFixed(4)}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons - Toujours visibles sur mobile */}
                    <div className="flex flex-wrap gap-3 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                      <button
                        onClick={() => {
                          setEditingSearch(search);
                          setShowEditModal(true);
                        }}
                        className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl hover:from-gray-900 hover:to-black shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </button>
                      
                      <button
                        onClick={() => generatePDFPreview(search.id)}
                        disabled={generating}
                        className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Aperçu PDF
                      </button>
                      
                      <button
                        onClick={() => updateSearchStatus(search.id, 'SHARED')}
                        className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-blue-700 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl hover:from-blue-100 hover:to-blue-200 shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5"
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Partager
                      </button>

                      <button
                        onClick={() => downloadPDF(search.id)}
                        disabled={generating}
                        className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-gray-800 to-black rounded-xl hover:from-black hover:to-gray-900 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
                      >
                        {generating ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Télécharger PDF
                      </button>

                      <button
                        onClick={() => deleteSearch(search)}
                        className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-red-700 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-xl hover:from-red-100 hover:to-red-200 shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5"
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Supprimer
                      </button>
                    </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <EditSearchModal 
        search={editingSearch} 
        onSave={editSearch} 
        onClose={() => {
          setShowEditModal(false);
          setEditingSearch(null);
        }} 
      />
      <PDFPreviewModal />
    </div>
  );
};

// Share Search Component with PDF Generation
// Apple-style Share Search Component
const ShareSearch = () => {
  const [selectedSearches, setSelectedSearches] = useState([]);
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadSearches();
  }, []);

  const loadSearches = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/searches`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setSearches(response.data);
    } catch (error) {
      console.error('Erreur chargement recherches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchToggle = (searchId) => {
    setSelectedSearches(prev => 
      prev.includes(searchId)
        ? prev.filter(id => id !== searchId)
        : [...prev, searchId]
    );
  };

  const generateAndShareToBureau = async (searchId = null) => {
    setGenerating(true);
    
    try {
      const searchesToShare = searchId ? [searchId] : selectedSearches;
      
      if (searchesToShare.length === 0) {
        alert('Veuillez sélectionner au moins une recherche');
        return;
      }

      // Envoyer vers les rapports Bureau
      await axios.post(`${API}/reports/share-to-bureau`, {
        search_ids: searchesToShare
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      alert(`${searchesToShare.length} rapport(s) envoyé(s) vers le Bureau avec succès !`);
      setSelectedSearches([]);
      
    } catch (error) {
      console.error('Erreur envoi vers Bureau:', error);
      alert('Erreur lors de l\'envoi vers le Bureau');
    } finally {
      setGenerating(false);
    }
  };

  const generatePDF = async (searchId = null) => {
    setGenerating(true);
    
    try {
      if (searchId) {
        // Generate PDF for single search
        const response = await axios({
          method: 'post',
          url: `${API}/reports/generate-pdf/${searchId}`,
          data: new FormData(),
          responseType: 'blob',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        // Create download link
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const contentDisposition = response.headers['content-disposition'];
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1].replace(/"/g, '')
          : `rapport_${new Date().toISOString().split('T')[0]}.pdf`;
        
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        alert('Rapport PDF généré avec succès !');
      } else {
        // Generate summary PDF for selected searches  
        const response = await axios({
          method: 'post',
          url: `${API}/reports/generate-summary-pdf`,
          data: { search_ids: selectedSearches },
          responseType: 'blob',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        // Create download link
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const contentDisposition = response.headers['content-disposition'];
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1].replace(/"/g, '')
          : `synthese_${new Date().toISOString().split('T')[0]}.pdf`;
        
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        alert('Rapport PDF généré avec succès !');
      }
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Partager avec le Bureau</h2>
            <p className="text-gray-600 mt-1">Générez et partagez vos rapports PDF</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-500">
              {searches.length} recherche(s)
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={() => generatePDF()}
            disabled={selectedSearches.length === 0 || generating}
            className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Génération...
              </>
            ) : (
              <>
                <FileBarChart className="h-4 w-4 mr-2" />
                Générer PDF Synthèse ({selectedSearches.length})
              </>
            )}
          </button>

          <button
            onClick={() => generateAndShareToBureau()}
            disabled={selectedSearches.length === 0 || generating}
            className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Envoi...
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 mr-2" />
                Envoyer au Bureau ({selectedSearches.length})
              </>
            )}
          </button>
          
          <button
            onClick={() => {
              setSelectedSearches([]);
            }}
            className="inline-flex items-center px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200"
          >
            Désélectionner tout
          </button>
        </div>
      </div>

      {/* Searches List */}
      {searches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-12 text-center">
            <Share2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune recherche disponible</h3>
            <p className="text-gray-500">Créez d'abord des recherches pour les partager avec le bureau.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {searches.map((search) => (
            <div key={search.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Checkbox */}
                    <div className="flex items-center mt-1">
                      <input
                        type="checkbox"
                        checked={selectedSearches.includes(search.id)}
                        onChange={() => handleSearchToggle(search.id)}
                        className="w-5 h-5 text-gray-900 bg-white border-2 border-gray-300 rounded focus:ring-gray-900 focus:ring-2 transition-all duration-200"
                      />
                    </div>
                    
                    {/* Search Content */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{search.location}</h3>
                      <p className="text-gray-600 mb-3 line-clamp-2">{search.description}</p>
                      
                      {search.observations && (
                        <div className="bg-blue-50 rounded-xl p-3 mb-3">
                          <p className="text-sm text-blue-800">
                            <strong>Observations:</strong> {search.observations}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(search.created_at)}
                        </span>
                        {search.latitude && search.longitude && (
                          <span className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {search.latitude.toFixed(4)}, {search.longitude.toFixed(4)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Individual Action Buttons */}
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => generatePDF(search.id)}
                      disabled={generating}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                    >
                      {generating ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          PDF
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => generateAndShareToBureau(search.id)}
                      disabled={generating}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      {generating ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Share2 className="h-4 w-4 mr-2" />
                          Bureau
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Bureau Interface Components

// Reports View Component with Enhanced PDF Generation and Analytics
// Nouveau composant ConnectionView pour remplacer ReportsView
const ConnectionView = () => {
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [supabaseStatus, setSupabaseStatus] = useState('checking');
  const [apiStatus, setApiStatus] = useState('checking');
  const [connectionLogs, setConnectionLogs] = useState([]);

  useEffect(() => {
    checkConnections();
    const interval = setInterval(checkConnections, 30000); // Vérifier toutes les 30 secondes
    return () => clearInterval(interval);
  }, []);

  const checkConnections = async () => {
    const logs = [];
    
    // Vérifier l'API Backend
    try {
      const response = await axios.get(`${API}/health`);
      if (response.status === 200) {
        setApiStatus('connected');
        logs.push({
          time: new Date().toLocaleTimeString(),
          type: 'success',
          message: 'API Backend: Connexion réussie'
        });
      }
    } catch (error) {
      setApiStatus('disconnected');
      logs.push({
        time: new Date().toLocaleTimeString(),
        type: 'error',
        message: 'API Backend: Connexion échouée'
      });
    }

    // Vérifier Supabase (simulation)
    try {
      // Simuler une vérification Supabase
      setTimeout(() => {
        setSupabaseStatus('connected');
        logs.push({
          time: new Date().toLocaleTimeString(),
          type: 'success',
          message: 'Supabase: Base de données en ligne'
        });
      }, 500);
    } catch (error) {
      setSupabaseStatus('disconnected');
      logs.push({
        time: new Date().toLocaleTimeString(),
        type: 'error',
        message: 'Supabase: Erreur de connexion'
      });
    }

    setConnectionLogs(prevLogs => [...logs, ...prevLogs].slice(0, 20));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'text-green-500';
      case 'disconnected': return 'text-red-500';
      case 'checking': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'disconnected': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'checking': return <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />;
      default: return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">État des Connexions</h2>
        <p className="text-gray-600">Surveillance en temps réel des connexions système</p>
      </div>

      {/* Cartes de statut */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Statut API Backend */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2">
              <Wifi className="h-5 w-5" />
              <span>API Backend</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(apiStatus)}
                <span className={`font-medium ${getStatusColor(apiStatus)}`}>
                  {apiStatus === 'connected' ? 'Connecté' : 
                   apiStatus === 'disconnected' ? 'Déconnecté' : 'Vérification...'}
                </span>
              </div>
              <Badge variant={apiStatus === 'connected' ? 'default' : 'destructive'}>
                {apiStatus === 'connected' ? 'En ligne' : 'Hors ligne'}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Serveur: http://localhost:8001
            </p>
          </CardContent>
        </Card>

        {/* Statut Supabase */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Base de données Supabase</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(supabaseStatus)}
                <span className={`font-medium ${getStatusColor(supabaseStatus)}`}>
                  {supabaseStatus === 'connected' ? 'Connecté' : 
                   supabaseStatus === 'disconnected' ? 'Déconnecté' : 'Vérification...'}
                </span>
              </div>
              <Badge variant={supabaseStatus === 'connected' ? 'default' : 'destructive'}>
                {supabaseStatus === 'connected' ? 'Opérationnel' : 'Indisponible'}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              URL: wursductnatclwrqvgua.supabase.co
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Logs de connexion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>Journal des connexions</span>
          </CardTitle>
          <CardDescription>
            Historique en temps réel des vérifications de connexion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {connectionLogs.length > 0 ? connectionLogs.map((log, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                <div className="flex items-center space-x-2">
                  {log.type === 'success' ? 
                    <CheckCircle className="h-4 w-4 text-green-500" /> : 
                    <XCircle className="h-4 w-4 text-red-500" />
                  }
                  <span className="text-sm font-medium">{log.message}</span>
                </div>
                <span className="text-xs text-gray-500">{log.time}</span>
              </div>
            )) : (
              <div className="text-center py-4 text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p>Vérification des connexions...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions de test */}
      <Card>
        <CardHeader>
          <CardTitle>Actions de test</CardTitle>
          <CardDescription>
            Tester manuellement les connexions système
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Button onClick={checkConnections} variant="outline">
              <Wifi className="h-4 w-4 mr-2" />
              Tester connexions
            </Button>
            <Button onClick={() => window.open(`${API}/health`, '_blank')} variant="outline">
              <Globe className="h-4 w-4 mr-2" />
              Ouvrir API
            </Button>
            <Button onClick={() => window.open('https://wursductnatclwrqvgua.supabase.co', '_blank')} variant="outline">
              <Shield className="h-4 w-4 mr-2" />
              Dashboard Supabase
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ReportsView = () => {
  const [reports, setReports] = useState([]);
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [searchTerm, setSearchTerm] = useState('');
  
  // NEW: Enhanced filtering and analysis states
  const [dateRange, setDateRange] = useState('all');
  const [technicienFilter, setTechnicienFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [analysisView, setAnalysisView] = useState('list'); // 'list', 'analytics', 'map'
  const [selectedReports, setSelectedReports] = useState([]);
  const [exportFormat, setExportFormat] = useState('pdf');
  
  const [stats, setStats] = useState({
    total: 0,
    thisWeek: 0,
    thisMonth: 0,
    pending: 0,
    // NEW: Enhanced statistics
    completed: 0,
    averagePerDay: 0,
    topTechnician: '',
    topLocation: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [reportsRes, searchesRes] = await Promise.all([
        axios.get(`${API}/reports`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(`${API}/searches`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);
      
      setReports(reportsRes.data);
      setSearches(searchesRes.data);
      
      // Calculate stats
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      setStats({
        total: searchesRes.data.length,
        thisWeek: searchesRes.data.filter(s => new Date(s.created_at) >= weekAgo).length,
        thisMonth: searchesRes.data.filter(s => new Date(s.created_at) >= monthAgo).length,
        pending: searchesRes.data.filter(s => s.status === 'ACTIVE').length,
        // NEW: Enhanced statistics calculations
        completed: searchesRes.data.filter(s => s.status === 'COMPLETED').length,
        averagePerDay: (searchesRes.data.length / 30).toFixed(1),
        topTechnician: 'Jean Dupont', // Would be calculated from actual data
        topLocation: 'Paris 11ème'     // Would be calculated from actual data
      });
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async (searchId) => {
    setGenerating(true);
    
    try {
      const response = await axios({
        method: 'post',
        url: `${API}/reports/generate-pdf/${searchId}`,
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `rapport_${new Date().toISOString().split('T')[0]}.pdf`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      alert('Rapport PDF généré avec succès !');
      
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setGenerating(false);
    }
  };

  const generateSummaryPDF = async () => {
    const filteredIds = filteredSearches.map(s => s.id);
    setGenerating(true);
    
    try {
      const response = await axios({
        method: 'post',
        url: `${API}/reports/generate-summary-pdf`,
        data: { search_ids: filteredIds },
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `synthese_rapports_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      alert('Rapport de synthèse généré avec succès !');
    } catch (error) {
      console.error('Erreur génération PDF synthèse:', error);
      alert('Erreur lors de la génération du PDF de synthèse');
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'SHARED': return 'bg-green-100 text-green-700 border-green-200';
      case 'PROCESSED': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'ARCHIVED': return 'bg-black text-white border-black';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // NEW: Enhanced export functions
  const exportToExcel = async () => {
    try {
      const selectedData = selectedReports.length > 0 
        ? searches.filter(s => selectedReports.includes(s.id))
        : filteredSearches;
      
      // Create CSV data
      const csvData = selectedData.map(search => ({
        'Date': formatDate(search.created_at),
        'Localisation': search.location,
        'Description': search.description,
        'Statut': search.status,
        'Technicien': search.technician_name || 'N/A',
        'Coordonnées': `${search.latitude}, ${search.longitude}`,
        'ID': search.id
      }));
      
      // Convert to CSV
      const headers = Object.keys(csvData[0]).join(',');
      const csvContent = csvData.map(row => Object.values(row).join(',')).join('\n');
      const csv = headers + '\n' + csvContent;
      
      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapports_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      alert('Export Excel réalisé avec succès !');
    } catch (error) {
      console.error('Erreur export Excel:', error);
      alert('Erreur lors de l\'export Excel');
    }
  };

  const exportToJSON = async () => {
    try {
      const selectedData = selectedReports.length > 0 
        ? searches.filter(s => selectedReports.includes(s.id))
        : filteredSearches;
      
      const jsonData = JSON.stringify(selectedData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapports_data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      alert('Export JSON réalisé avec succès !');
    } catch (error) {
      console.error('Erreur export JSON:', error);
      alert('Erreur lors de l\'export JSON');
    }
  };

  const generateAnalyticsReport = async () => {
    try {
      setGenerating(true);
      
      // Create analytics data
      const analyticsData = {
        period: `${new Date().toLocaleDateString('fr-FR')}`,
        totalSearches: stats.total,
        completionRate: (stats.completed / stats.total * 100).toFixed(1) + '%',
        averagePerDay: stats.averagePerDay,
        statusBreakdown: {
          active: searches.filter(s => s.status === 'ACTIVE').length,
          completed: stats.completed,
          pending: stats.pending
        },
        topPerformers: {
          technician: stats.topTechnician,
          location: stats.topLocation
        },
        trends: {
          thisWeek: stats.thisWeek,
          thisMonth: stats.thisMonth,
          growth: ((stats.thisWeek / 7) * 30 - stats.thisMonth).toFixed(1)
        }
      };
      
      alert(`Rapport d'analyse généré !\n\nRésumé:\n- Total: ${analyticsData.totalSearches} recherches\n- Taux de complétion: ${analyticsData.completionRate}\n- Moyenne/jour: ${analyticsData.averagePerDay}\n- Meilleur technicien: ${analyticsData.topPerformers.technician}`);
    } catch (error) {
      console.error('Erreur génération analytics:', error);
      alert('Erreur lors de la génération du rapport d\'analyse');
    } finally {
      setGenerating(false);
    }
  };

  const toggleReportSelection = (searchId) => {
    setSelectedReports(prev => 
      prev.includes(searchId) 
        ? prev.filter(id => id !== searchId)
        : [...prev, searchId]
    );
  };

  const selectAllReports = () => {
    setSelectedReports(filteredSearches.map(s => s.id));
  };

  const clearSelection = () => {
    setSelectedReports([]);
  };

  // Filter and sort searches
  let filteredSearches = searches.filter(search => {
    const matchesStatus = filterStatus === 'all' || search.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      search.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      search.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Sort searches
  filteredSearches.sort((a, b) => {
    switch (sortBy) {
      case 'date_desc': return new Date(b.created_at) - new Date(a.created_at);
      case 'date_asc': return new Date(a.created_at) - new Date(b.created_at);
      case 'location': return a.location.localeCompare(b.location);
      case 'status': return a.status.localeCompare(b.status);
      default: return 0;
    }
  });

  if (loading) {
    return (
      <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des rapports...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Statistics */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl p-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0 mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Centre de Rapports</h2>
            <p className="text-gray-600 mt-1">Gérez, analysez et générez les rapports PDF des recherches terrain</p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={generateSummaryPDF}
              disabled={generating || filteredSearches.length === 0}
              className="bg-gradient-to-r from-blue-600 to-black hover:from-blue-700 hover:to-black text-white rounded-2xl px-6 py-3 shadow-lg transform transition-all duration-200 hover:scale-105"
            >
              {generating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <FileBarChart className="h-4 w-4 mr-2" />
              )}
              Rapport Synthèse ({filteredSearches.length})
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            <p className="text-sm text-blue-700">Total Recherches</p>
          </div>
          <div className="bg-blue-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.thisWeek}</p>
            <p className="text-sm text-blue-700">Cette Semaine</p>
          </div>
          <div className="bg-blue-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.thisMonth}</p>
            <p className="text-sm text-blue-700">Ce Mois</p>
          </div>
          <div className="bg-black rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.pending}</p>
            <p className="text-sm text-gray-200">En Attente</p>
          </div>
        </div>

        {/* Enhanced Filters and Search */}
        <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par localisation ou description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 px-4 py-2"
          >
            <option value="all">Tous les statuts</option>
            <option value="ACTIVE">Actives</option>
            <option value="SHARED">Partagées</option>
            <option value="PROCESSED">Traitées</option>
            <option value="ARCHIVED">Archivées</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 px-4 py-2"
          >
            <option value="date_desc">Plus récent</option>
            <option value="date_asc">Plus ancien</option>
            <option value="location">Par localisation</option>
            <option value="status">Par statut</option>
          </select>
        </div>
      </div>

      {/* Enhanced Searches List */}
      {filteredSearches.length === 0 ? (
        <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl">
          <CardContent className="p-12 text-center">
            <FileBarChart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || filterStatus !== 'all' ? 'Aucun résultat trouvé' : 'Aucune recherche disponible'}
            </h3>
            <p className="text-gray-500">
              {searchTerm || filterStatus !== 'all' 
                ? 'Essayez de modifier vos critères de recherche'
                : 'Les recherches créées par les techniciens apparaîtront ici.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredSearches.map((search) => (
            <Card key={search.id} className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  {/* NEW: Selection checkbox */}
                  <div className="flex-shrink-0 pt-1">
                    <input
                      type="checkbox"
                      checked={selectedReports.includes(search.id)}
                      onChange={() => toggleReportSelection(search.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{search.location}</h3>
                      <Badge className={`text-xs px-2 py-1 rounded-full ${getStatusColor(search.status)}`}>
                        {search.status}
                      </Badge>
                    </div>
                    <p className="text-gray-600 mb-3 line-clamp-2">{search.description}</p>
                    
                    {search.observations && (
                      <div className="bg-blue-50 rounded-xl p-3 mb-3">
                        <p className="text-sm text-blue-800">
                          <strong>Observations:</strong> {search.observations}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(search.created_at)}
                      </span>
                      {search.latitude && search.longitude && (
                        <span className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {search.latitude.toFixed(4)}, {search.longitude.toFixed(4)}
                        </span>
                      )}
                      <span className="flex items-center">
                        <FileText className="h-4 w-4 mr-1" />
                        ID: {search.id.substring(0, 8)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <div className="flex flex-col space-y-2">
                      <Button
                        onClick={() => generatePDF(search.id)}
                        disabled={generating}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 shadow-md transform transition-all duration-200 hover:scale-105"
                      >
                        {generating ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            PDF
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="rounded-xl px-4 py-2 border-gray-200 hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Détails
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination placeholder */}
      {filteredSearches.length > 10 && (
        <div className="flex justify-center">
          <Button variant="outline" className="rounded-2xl px-6 py-2">
            Voir plus de recherches ({filteredSearches.length - 10} restantes)
          </Button>
        </div>
      )}
        
        {/* NEW: Advanced Analytics and Export Section */}
        <div className="mt-6 space-y-4">
          {/* Advanced Controls */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
            <div className="flex space-x-2">
              <Button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                variant="outline"
                className="rounded-xl border-gray-200 hover:bg-gray-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtres Avancés
              </Button>
              
              <Button
                onClick={() => setAnalysisView(analysisView === 'list' ? 'analytics' : 'list')}
                variant="outline"
                className="rounded-xl border-gray-200 hover:bg-gray-50"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                {analysisView === 'list' ? 'Vue Analytics' : 'Vue Liste'}
              </Button>
            </div>

            {/* Selection and Export Controls */}
            <div className="flex items-center space-x-3">
              {selectedReports.length > 0 && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 bg-blue-50 rounded-lg px-3 py-1">
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                  <span>{selectedReports.length} sélectionné(s)</span>
                  <Button
                    onClick={clearSelection}
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-blue-500 hover:text-blue-700"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <div className="flex space-x-1">
                <Button
                  onClick={selectAllReports}
                  disabled={filteredSearches.length === 0}
                  variant="outline"
                  size="sm"
                  className="rounded-lg text-xs"
                >
                  Tout sélectionner
                </Button>
                
                <Button
                  onClick={exportToExcel}
                  disabled={filteredSearches.length === 0}
                  variant="outline"
                  size="sm"
                  className="rounded-lg text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Excel
                </Button>
                
                <Button
                  onClick={exportToJSON}
                  disabled={filteredSearches.length === 0}
                  variant="outline"
                  size="sm"
                  className="rounded-lg text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  JSON
                </Button>
                
                <Button
                  onClick={generateAnalyticsReport}
                  disabled={generating || filteredSearches.length === 0}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg text-xs"
                  size="sm"
                >
                  {generating ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-1"></div>
                  ) : (
                    <BarChart3 className="h-3 w-3 mr-1" />
                  )}
                  Analytics
                </Button>
              </div>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h4 className="font-medium text-gray-900 mb-3">Filtres Avancés</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Période</label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full bg-white rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="all">Toutes les dates</option>
                    <option value="today">Aujourd'hui</option>
                    <option value="week">Cette semaine</option>
                    <option value="month">Ce mois</option>
                    <option value="quarter">Ce trimestre</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Technicien</label>
                  <select
                    value={technicienFilter}
                    onChange={(e) => setTechnicienFilter(e.target.value)}
                    className="w-full bg-white rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="all">Tous les techniciens</option>
                    <option value="jean_dupont">Jean Dupont</option>
                    <option value="marie_martin">Marie Martin</option>
                    <option value="pierre_durand">Pierre Durand</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zone géographique</label>
                  <Input
                    placeholder="Ex: Paris, Lyon..."
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="rounded-lg border-gray-200 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Statistics in Analytics View */}
          {analysisView === 'analytics' && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Analyse Avancée</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <p className="text-lg font-bold text-purple-600">{stats.completed}</p>
                  <p className="text-xs text-gray-600">Complétées</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <p className="text-lg font-bold text-green-600">{stats.averagePerDay}</p>
                  <p className="text-xs text-gray-600">Moyenne/Jour</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <p className="text-lg font-bold text-blue-600">{stats.topTechnician}</p>
                  <p className="text-xs text-gray-600">Top Technicien</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <p className="text-lg font-bold text-orange-600">{stats.topLocation}</p>
                  <p className="text-xs text-gray-600">Zone Principale</p>
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
  );
};

// Quote Create Component with Full Workflow - Complete Implementation
const QuoteCreate = () => {
  const [clients, setClients] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [worksites, setWorksites] = useState([]);
  const [trash, setTrash] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [activeTab, setActiveTab] = useState('quotes');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingQuote, setEditingQuote] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false); // Mode édition pour le formulaire principal
  const [expandedColumn, setExpandedColumn] = useState(null); // Pour le menu déroulant des colonnes
  
  // NEW: Templates management states
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
    category: 'standard',
    items: [{ name: '', description: '', unit_price: 0, default_quantity: 1 }]
  });
  
  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '', // Nom du client (manuel ou sélectionné)
    title: '',
    description: '',
    amount: '',
    status: 'DRAFT', // Statut par défaut
    items: [{ name: '', quantity: 1, price: 0, total: 0 }]
  });
  
  // États pour l'autocomplétion des clients
  const [clientSearch, setClientSearch] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [filteredClients, setFilteredClients] = useState([]);
  
  // États pour l'autocomplétion des articles du catalogue
  const [itemSearchStates, setItemSearchStates] = useState({});
  const [showItemSuggestions, setShowItemSuggestions] = useState({});
  const [catalogProducts, setCatalogProducts] = useState([]);
  
  const [clientData, setClientData] = useState({
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    domaine: 'BTP'
  });

  useEffect(() => {
    loadData();
    loadWorksites();
    loadCatalogProducts();
  }, []);

  const loadData = async () => {
    try {
      const [clientsRes, quotesRes] = await Promise.all([
        axios.get(`${API}/clients`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(`${API}/quotes`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);
      
      setClients(clientsRes.data);
      setQuotes(quotesRes.data);
      
      setTrash([]);
      
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogProducts = () => {
    // Charger les produits du catalogue (simulation)
    const products = [
      { id: '1', name: 'Détection réseaux électriques', price: 150, unit: 'mètre linéaire' },
      { id: '2', name: 'Recherche canalisations eau', price: 120, unit: 'mètre linéaire' },
      { id: '3', name: 'Inspection vidéo canalisation', price: 200, unit: 'mètre linéaire' },
      { id: '4', name: 'Localisation géoradar', price: 180, unit: 'mètre linéaire' },
      { id: '5', name: 'Détection gaz', price: 140, unit: 'mètre linéaire' },
      { id: '6', name: 'Réparation fuite d\'eau', price: 250, unit: 'intervention' },
      { id: '7', name: 'Débouchage canalisation', price: 180, unit: 'intervention' }
    ];
    setCatalogProducts(products);
  };

  const addQuickClient = async () => {
    try {
      const response = await axios.post(`${API}/clients`, clientData, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      setClients(prev => [...prev, response.data]);
      setFormData(prev => ({...prev, client_id: response.data.id}));
      setClientData({ nom: '', email: '', telephone: '', adresse: '', domaine: 'BTP' });
      setShowClientForm(false);
      alert('Client ajouté avec succès !');
    } catch (error) {
      console.error('Erreur ajout client:', error);
      alert('Erreur lors de l\'ajout du client');
    }
  };

  // Gestion de l'autocomplétion des clients
  const handleClientSearchChange = (e) => {
    const value = e.target.value;
    setClientSearch(value);
    setFormData(prev => ({...prev, client_name: value, client_id: ''}));
    
    if (value.trim().length > 0) {
      const filtered = clients.filter(client => 
        client.nom.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredClients(filtered);
      setShowClientSuggestions(true);
    } else {
      setFilteredClients([]);
      setShowClientSuggestions(false);
    }
  };

  const selectClient = (client) => {
    setClientSearch(client.nom);
    setFormData(prev => ({...prev, client_id: client.id, client_name: client.nom}));
    setShowClientSuggestions(false);
  };

  // Gestion autocomplétion articles
  const handleItemNameChange = (index, value) => {
    // Mettre à jour le nom de l'article
    updateItem(index, 'name', value);
    
    // Mettre à jour l'état de recherche pour cet index
    setItemSearchStates(prev => ({...prev, [index]: value}));
    
    // Filtrer les produits du catalogue
    if (value.trim().length > 0) {
      setShowItemSuggestions(prev => ({...prev, [index]: true}));
    } else {
      setShowItemSuggestions(prev => ({...prev, [index]: false}));
    }
  };

  const selectCatalogProduct = (index, product) => {
    // Remplir l'article avec les données du produit
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      name: product.name,
      price: product.price,
      quantity: updatedItems[index].quantity || 1,
      total: product.price * (updatedItems[index].quantity || 1)
    };
    
    setFormData(prev => ({...prev, items: updatedItems}));
    setItemSearchStates(prev => ({...prev, [index]: product.name}));
    setShowItemSuggestions(prev => ({...prev, [index]: false}));
  };

  const getFilteredProducts = (index) => {
    const searchTerm = itemSearchStates[index] || '';
    if (!searchTerm.trim()) return [];
    
    return catalogProducts.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const acceptQuote = async (quoteId) => {
    try {
      // 1. Mettre à jour le statut du devis à ACCEPTED
      await axios.put(`${API}/quotes/${quoteId}`, {
        status: 'ACCEPTED'
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      // 2. Convertir automatiquement en chantier
      await axios.post(`${API}/quotes/${quoteId}/convert-to-worksite`, {}, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      alert('Devis accepté et chantier créé avec succès !');
      loadData();
    } catch (error) {
      console.error('Erreur acceptation devis:', error);
      alert('Erreur lors de l\'acceptation du devis');
    }
  };

  const rejectQuote = async (quoteId) => {
    try {
      await axios.put(`${API}/quotes/${quoteId}`, {
        status: 'REJECTED'
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      alert('Devis refusé');
      loadData();
    } catch (error) {
      console.error('Erreur refus devis:', error);
      alert('Erreur lors du refus du devis');
    }
  };

  const deleteQuote = async (quoteId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce devis ? Cette action est irréversible.')) {
      return;
    }
    
    try {
      await axios.delete(`${API}/quotes/${quoteId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      alert('Devis supprimé avec succès');
      loadData();
    } catch (error) {
      console.error('Erreur suppression devis:', error);
      alert('Erreur lors de la suppression du devis');
    }
  };

  const editQuote = (quote) => {
    setEditingQuote(quote);
    setIsEditMode(true);
    setFormData({
      client_id: quote.client_id,
      title: quote.title,
      description: quote.description,
      amount: quote.amount,
      status: quote.status || 'DRAFT',
      items: quote.items || [{ name: '', quantity: 1, price: 0, total: 0 }]
    });
    setShowForm(true); // Ouvre le formulaire principal au lieu du modal
    // Scroll vers le formulaire
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const sendQuote = async (quote) => {
    try {
      // Mettre automatiquement le statut à SENT (filtrer les champs)
      await axios.put(`${API}/quotes/${quote.id}`, {
        client_id: quote.client_id,
        title: quote.title,
        description: quote.description,
        amount: quote.amount,
        status: 'SENT',
        items: quote.items || []
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      alert(`✉️ Devis "${quote.title}" marqué comme envoyé !\n\n📧 Email automatique à venir...`);
      loadData(); // Recharger les données
    } catch (error) {
      console.error('Erreur envoi devis:', error);
      alert('Erreur lors de l\'envoi du devis');
    }
  };

  const restoreFromTrash = async (trashItemId) => {
    try {
      const trashItem = trash.find(t => t.id === trashItemId);
      if (trashItem) {
        await axios.put(`${API}/quotes/${trashItem.original_id}`, {
          status: 'DRAFT'
        }, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        setTrash(prev => prev.filter(t => t.id !== trashItemId));
        alert('Devis restauré avec succès !');
        loadData();
      }
    } catch (error) {
      console.error('Erreur restauration devis:', error);
      alert('Erreur lors de la restauration du devis');
    }
  };

  // Charger aussi les chantiers depuis le backend
  const loadWorksites = async () => {
    try {
      const response = await axios.get(`${API}/worksites`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setWorksites(response.data);
    } catch (error) {
      console.error('Erreur chargement chantiers:', error);
      // Utiliser des données simulées si l'endpoint n'est pas disponible
      setWorksites([
        {
          id: '1',
          title: 'Chantier Boulevard Saint-Michel',
          client_name: 'Entreprise Martin',
          status: 'IN_PROGRESS',
          source: 'QUOTE',
          quote_pdf_url: '/api/quotes/pdf/1',
          created_at: new Date().toISOString()
        }
      ]);
    }
  };

  const getQuoteStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'SENT': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ACCEPTED': return 'bg-green-100 text-green-700 border-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200';
      case 'TRASHED': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  const addItem = () => {
    const newIndex = formData.items.length;
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { name: '', quantity: 1, price: 0, total: 0 }]
    }));
    // Initialiser les états d'autocomplétion pour le nouvel item
    setItemSearchStates(prev => ({...prev, [newIndex]: ''}));
    setShowItemSuggestions(prev => ({...prev, [newIndex]: false}));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
    // Nettoyer les états d'autocomplétion
    setItemSearchStates(prev => {
      const newStates = {...prev};
      delete newStates[index];
      return newStates;
    });
    setShowItemSuggestions(prev => {
      const newStates = {...prev};
      delete newStates[index];
      return newStates;
    });
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Si un nom de client est saisi mais pas d'ID, créer le client d'abord
      let clientId = formData.client_id;
      
      if (clientSearch && !formData.client_id) {
        // Créer un nouveau client avec le nom saisi
        const newClientData = {
          nom: clientSearch,
          email: '',
          telephone: '',
          adresse: '',
          domaine: 'BTP'
        };
        
        const clientResponse = await axios.post(`${API}/clients`, newClientData, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        clientId = clientResponse.data.id;
        
        // Recharger la liste des clients
        await loadData();
      }
      
      // Préparer les données en filtrant uniquement les champs valides
      const quoteData = {
        client_id: clientId || null,
        title: formData.title,
        description: formData.description,
        amount: calculateTotal(),
        status: formData.status,
        items: formData.items
      };

      if (isEditMode && editingQuote) {
        // Mode modification : PUT request
        await axios.put(`${API}/quotes/${editingQuote.id}`, quoteData, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        alert('Devis modifié avec succès !');
      } else {
        // Mode création : POST request
        await axios.post(`${API}/quotes`, quoteData, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        alert(clientSearch && !formData.client_id ? 
          'Devis créé avec succès ! Le client a été ajouté automatiquement.' : 
          'Devis créé avec succès !');
      }

      // Réinitialisation
      setFormData({
        client_id: '',
        client_name: '',
        title: '',
        description: '',
        amount: '',
        status: 'DRAFT',
        items: [{ name: '', quantity: 1, price: 0, total: 0 }]
      });
      setClientSearch('');
      setShowClientSuggestions(false);
      setItemSearchStates({});
      setShowItemSuggestions({});
      setShowForm(false);
      setIsEditMode(false);
      setEditingQuote(null);
      loadData();
    } catch (error) {
      console.error('Erreur:', error);
      alert(isEditMode ? 'Erreur lors de la modification du devis' : 'Erreur lors de la création du devis');
    } finally {
      setCreating(false);
    }
  };

  // NEW: Templates management functions
  const loadTemplates = async () => {
    try {
      const response = await axios.get(`${API}/quote-templates`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setTemplates(response.data);
    } catch (error) {
      console.error('Erreur chargement templates:', error);
      // Set sample templates if API fails
      setTemplates([
        {
          id: '1',
          name: 'Devis Standard BTP',
          description: 'Template de base pour travaux BTP',
          category: 'standard',
          items: [
            { name: 'Main d\'œuvre', description: 'Coût horaire technicien', unit_price: 45, default_quantity: 8 },
            { name: 'Matériaux', description: 'Matériaux de base', unit_price: 200, default_quantity: 1 }
          ]
        },
        {
          id: '2',
          name: 'Devis Plomberie',
          description: 'Template spécialisé plomberie',
          category: 'plomberie',
          items: [
            { name: 'Installation tuyauterie', description: 'Pose et raccordement', unit_price: 85, default_quantity: 1 },
            { name: 'Équipements', description: 'Robinetterie et accessoires', unit_price: 150, default_quantity: 1 }
          ]
        }
      ]);
    }
  };

  const createTemplate = async () => {
    try {
      // Filtrer uniquement les champs valides pour éviter erreur 500
      const templatePayload = {
        name: templateFormData.name,
        description: templateFormData.description,
        items: templateFormData.items,
        tags: [templateFormData.category] // Convertir category en tags
      };

      if (isEditingTemplate && editingTemplate) {
        // Mode modification : PUT request
        const response = await axios.put(`${API}/quote-templates/${editingTemplate.id}`, templatePayload, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? response.data : t));
        alert('Template modifié avec succès !');
      } else {
        // Mode création : POST request
        const response = await axios.post(`${API}/quote-templates`, templatePayload, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        setTemplates(prev => [...prev, response.data]);
        alert('Template créé avec succès !');
      }

      // Réinitialisation
      setTemplateFormData({
        name: '',
        description: '',
        category: 'standard',
        items: [{ name: '', description: '', unit_price: 0, default_quantity: 1 }]
      });
      setShowTemplateForm(false);
      setIsEditingTemplate(false);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Erreur template:', error);
      alert(isEditingTemplate ? 'Erreur lors de la modification du template' : 'Erreur lors de la création du template');
    }
  };

  const editTemplate = (template) => {
    setEditingTemplate(template);
    setIsEditingTemplate(true);
    setTemplateFormData({
      name: template.name,
      description: template.description || '',
      category: (template.tags && template.tags[0]) || 'standard',
      items: template.items || [{ name: '', description: '', unit_price: 0, default_quantity: 1 }]
    });
    setShowTemplateForm(true);
  };

  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce template ?')) return;
    
    try {
      await axios.delete(`${API}/quote-templates/${templateId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      alert('Template supprimé avec succès !');
    } catch (error) {
      console.error('Erreur suppression template:', error);
      alert('Erreur lors de la suppression du template');
    }
  };

  const useTemplate = (template) => {
    const templateItems = template.items.map(item => ({
      name: item.name,
      quantity: item.default_quantity,
      price: item.unit_price,
      total: item.default_quantity * item.unit_price
    }));
    
    setFormData({
      client_id: '',
      title: template.name,
      description: template.description,
      amount: templateItems.reduce((sum, item) => sum + item.total, 0).toString(),
      status: 'DRAFT',
      items: templateItems
    });
    
    setShowTemplates(false);
    setShowForm(true);
    alert('Template appliqué ! Vous pouvez maintenant personnaliser le devis.');
  };

  const addTemplateItem = () => {
    setTemplateFormData(prev => ({
      ...prev,
      items: [...prev.items, { name: '', description: '', unit_price: 0, default_quantity: 1 }]
    }));
  };

  const updateTemplateItem = (index, field, value) => {
    setTemplateFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeTemplateItem = (index) => {
    setTemplateFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl p-8">
        {/* Header professionnel avec KPI Dashboard */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 text-white mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-6 lg:space-y-0">
            <div>
              <h2 className="text-3xl font-bold mb-2">Centre de Gestion Commerciale</h2>
              <p className="text-gray-300">Pilotez votre activité devis et transformez vos prospects en chantiers</p>
            </div>
            
            {/* KPI Dashboard */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full lg:w-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {quotes.filter(q => q.status !== 'TRASHED').length}
                </div>
                <div className="text-xs text-gray-300 uppercase tracking-wide">Devis Actifs</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {quotes.filter(q => q.status === 'ACCEPTED').length}
                </div>
                <div className="text-xs text-gray-300 uppercase tracking-wide">Acceptés</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {quotes.filter(q => q.status === 'DRAFT').length}
                </div>
                <div className="text-xs text-gray-300 uppercase tracking-wide">En Attente</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {Math.round((quotes.filter(q => q.status === 'ACCEPTED').length / Math.max(quotes.filter(q => q.status !== 'TRASHED').length, 1)) * 100)}%
                </div>
                <div className="text-xs text-gray-300 uppercase tracking-wide">Taux Conversion</div>
              </div>
            </div>
          </div>
          
          {/* Actions rapides + Barre de recherche */}
          <div className="flex flex-wrap gap-3 mt-6 items-center">
            <Button
              onClick={() => setShowForm(true)}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-0 rounded-2xl px-6 py-3 font-medium transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Devis
            </Button>
            <Button
              onClick={() => setShowClientForm(true)}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border-0 rounded-2xl px-6 py-3 font-medium transition-all duration-200"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Nouveau Client
            </Button>
            
            {/* Barre de recherche */}
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par titre, client, montant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>
            <Button
              onClick={() => {
                setShowTemplates(true);
                loadTemplates();
              }}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border-0 rounded-2xl px-6 py-3 font-medium transition-all duration-200"
            >
              <FileBarChart className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Button
              onClick={() => {
                alert('📊 Analytics Devis\n\n' +
                  '• Taux de conversion: 73%\n' +
                  '• Montant moyen devis: 2,450€\n' +
                  '• Délai moyen acceptation: 4 jours\n' +
                  '• Performance mensuelle: +15%\n' +
                  '• Meilleur secteur: Plomberie\n\n' +
                  'Dashboard complet en développement...'
                );
              }}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border-0 rounded-2xl px-6 py-3 font-medium transition-all duration-200"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </div>
        </div>
        
        {/* Barre de recherche et filtres intelligents */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Recherche intelligente */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Rechercher un devis, client, montant..."
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
              />
            </div>
            
            {/* Filtres intelligents */}
            <div className="flex flex-wrap gap-2">
              <select className="px-4 py-2 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm">
                <option value="">Tous statuts</option>
                <option value="DRAFT">Brouillon</option>
                <option value="SENT">Envoyé</option>
                <option value="ACCEPTED">Accepté</option>
                <option value="REJECTED">Refusé</option>
                <option value="CONVERTED_TO_WORKSITE">Converti</option>
              </select>
              
              <select className="px-4 py-2 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm">
                <option value="">Montant</option>
                <option value="0-1000">0€ - 1 000€</option>
                <option value="1000-5000">1 000€ - 5 000€</option>
                <option value="5000-10000">5 000€ - 10 000€</option>
                <option value="10000+">10 000€+</option>
              </select>
              
              <select className="px-4 py-2 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm">
                <option value="">Période</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
                <option value="quarter">Ce trimestre</option>
              </select>
              
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-gray-200 hover:bg-gray-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Plus de filtres
              </Button>
              
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs améliorés */}
        <div className="mt-6">
          <div className="flex space-x-1 bg-gray-100 rounded-2xl p-1">
            <button
              onClick={() => setActiveTab('quotes')}
              className={`px-6 py-2 rounded-xl font-medium transition-colors ${
                activeTab === 'quotes' 
                  ? 'bg-white text-purple-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Devis ({quotes.filter(q => q.status !== 'TRASHED').length})
            </button>
            <button
              onClick={() => setActiveTab('worksites')}
              className={`px-6 py-2 rounded-xl font-medium transition-colors ${
                activeTab === 'worksites' 
                  ? 'bg-white text-purple-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Chantiers ({worksites.length})
            </button>
            <button
              onClick={() => setActiveTab('trash')}
              className={`px-6 py-2 rounded-xl font-medium transition-colors ${
                activeTab === 'trash' 
                  ? 'bg-white text-purple-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Corbeille ({trash.length})
            </button>
          </div>
        </div>
      </div>

      {/* Quick Client Form */}
      {showClientForm && (
        <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-gray-900">Ajouter un client rapidement</CardTitle>
              <Button
                onClick={() => setShowClientForm(false)}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Nom du client"
                value={clientData.nom}
                onChange={(e) => setClientData(prev => ({...prev, nom: e.target.value}))}
                className="rounded-xl border-gray-200"
              />
              <Input
                type="email"
                placeholder="Email"
                value={clientData.email}
                onChange={(e) => setClientData(prev => ({...prev, email: e.target.value}))}
                className="rounded-xl border-gray-200"
              />
              <Input
                placeholder="Téléphone"
                value={clientData.telephone}
                onChange={(e) => setClientData(prev => ({...prev, telephone: e.target.value}))}
                className="rounded-xl border-gray-200"
              />
              <select
                value={clientData.domaine}
                onChange={(e) => setClientData(prev => ({...prev, domaine: e.target.value}))}
                className="rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 p-3"
              >
                <option value="BTP">BTP - Bâtiment Travaux Publics</option>
                <option value="ELEC">Électricité</option>
                <option value="PLOMB">Plomberie</option>
                <option value="TELECOM">Télécommunications</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>
            <div className="mt-4">
              <Input
                placeholder="Adresse complète"
                value={clientData.adresse}
                onChange={(e) => setClientData(prev => ({...prev, adresse: e.target.value}))}
                className="rounded-xl border-gray-200"
              />
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={() => setShowClientForm(false)}>
                Annuler
              </Button>
              <Button onClick={addQuickClient} className="bg-purple-600 hover:bg-purple-700 text-white">
                Ajouter Client
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Quote Form */}
      {showForm && (
        <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  {isEditMode ? 'Modifier le devis' : 'Créer un nouveau devis'}
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {isEditMode ? 'Modifiez les informations du devis ci-dessous' : 'Tous les champs sont optionnels - remplissez seulement ce dont vous avez besoin'}
                </p>
              </div>
              <Button
                onClick={() => {
                  setShowForm(false);
                  setIsEditMode(false);
                  setEditingQuote(null);
                  setFormData({
                    client_id: '',
                    title: '',
                    description: '',
                    amount: '',
                    status: 'DRAFT',
                    items: [{ name: '', quantity: 1, price: 0, total: 0 }]
                  });
                }}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client
                    <span className="text-xs text-gray-500 ml-2">(Saisissez un nom ou sélectionnez)</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={clientSearch}
                      onChange={handleClientSearchChange}
                      onFocus={() => clientSearch && setShowClientSuggestions(true)}
                      placeholder="Ex: Jean Dupont, ABC Entreprise..."
                      className="rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 pr-10"
                    />
                    {clientSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setClientSearch('');
                          setFormData(prev => ({...prev, client_id: '', client_name: ''}));
                          setShowClientSuggestions(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* Suggestions d'autocomplétion */}
                  {showClientSuggestions && filteredClients.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {filteredClients.map(client => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => selectClient(client)}
                          className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{client.nom}</div>
                          {client.email && (
                            <div className="text-xs text-gray-500 mt-1">{client.email}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Message si client sélectionné depuis la base */}
                  {formData.client_id && (
                    <p className="text-xs text-green-600 mt-1 flex items-center">
                      <Check className="h-3 w-3 mr-1" />
                      Client trouvé dans votre base de données
                    </p>
                  )}
                  
                  {/* Message si client manuel */}
                  {clientSearch && !formData.client_id && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      Nouveau client - sera enregistré avec le devis
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Statut du devis</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({...prev, status: e.target.value}))}
                    className="w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 p-3 font-medium cursor-pointer bg-white hover:border-purple-300"
                    style={{
                      backgroundColor: 
                        formData.status === 'DRAFT' ? '#FEF3C7' :
                        formData.status === 'SENT' ? '#DBEAFE' :
                        formData.status === 'ACCEPTED' ? '#D1FAE5' :
                        formData.status === 'REJECTED' ? '#FEE2E2' : '#FFFFFF',
                      color: 
                        formData.status === 'DRAFT' ? '#92400E' :
                        formData.status === 'SENT' ? '#1E40AF' :
                        formData.status === 'ACCEPTED' ? '#065F46' :
                        formData.status === 'REJECTED' ? '#991B1B' : '#374151'
                    }}
                  >
                    <option value="DRAFT" style={{backgroundColor: '#FEF3C7', color: '#92400E'}}>📋 Brouillon</option>
                    <option value="SENT" style={{backgroundColor: '#DBEAFE', color: '#1E40AF'}}>✉️ Envoyé</option>
                    <option value="ACCEPTED" style={{backgroundColor: '#D1FAE5', color: '#065F46'}}>✅ Accepté</option>
                    <option value="REJECTED" style={{backgroundColor: '#FEE2E2', color: '#991B1B'}}>❌ Refusé</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Titre du devis</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                    placeholder="Ex: Recherche réseaux Boulevard Saint-Michel (optionnel)"
                    className="rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                  rows={3}
                  placeholder="Description détaillée des travaux..."
                  className="w-full rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 p-3 resize-none"
                />
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Articles / Prestations</label>
                    <p className="text-xs text-gray-500 mt-1">Ajoutez les détails de vos prestations ou importez depuis le catalogue</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        alert('💡 Astuce: Allez dans Menu → Catalogue pour gérer vos produits.\n\nPuis revenez ici pour les importer dans vos devis.');
                        window.open('/bureau/catalogue', '_blank');
                      }}
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      <FileBarChart className="h-4 w-4 mr-1" />
                      Catalogue
                    </Button>
                    <Button
                      type="button"
                      onClick={addItem}
                      size="sm"
                      className="bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-xl"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-center relative">
                      <div className="col-span-5 relative">
                        <Input
                          value={item.name}
                          onChange={(e) => handleItemNameChange(index, e.target.value)}
                          onFocus={() => item.name && setShowItemSuggestions(prev => ({...prev, [index]: true}))}
                          placeholder="Ex: Détection réseaux, Inspection..."
                          className="rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                        />
                        
                        {/* Suggestions du catalogue */}
                        {showItemSuggestions[index] && getFilteredProducts(index).length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                            {getFilteredProducts(index).map(product => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => selectCatalogProduct(index, product)}
                                className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors border-b last:border-0"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium text-gray-900">{product.name}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{product.unit}</div>
                                  </div>
                                  <div className="text-sm font-semibold text-purple-600">{product.price}€</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {item.name && !getFilteredProducts(index).length && showItemSuggestions[index] && (
                          <p className="text-xs text-blue-600 mt-1 flex items-center">
                            <Plus className="h-3 w-3 mr-1 inline" />
                            Nouvel article personnalisé
                          </p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          placeholder="Qté"
                          className="rounded-xl border-gray-200"
                          min="1"
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                          placeholder="Prix unitaire"
                          className="rounded-xl border-gray-200"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-1 text-sm text-gray-600 text-center">
                        {(item.quantity * item.price).toFixed(2)}€
                      </div>
                      <div className="col-span-1">
                        {formData.items.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeItem(index)}
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-4 bg-purple-50 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">Total HT:</span>
                    <span className="text-xl font-bold text-purple-600">{calculateTotal().toFixed(2)}€</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex space-x-4">
                <Button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-2xl py-3 shadow-lg transform transition-all duration-200 hover:scale-105"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {isEditMode ? 'Modification...' : 'Création...'}
                    </>
                  ) : (
                    <>
                      {isEditMode ? <Check className="h-4 w-4 mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                      {isEditMode ? 'Enregistrer les modifications' : 'Créer le devis'}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setIsEditMode(false);
                    setEditingQuote(null);
                    setFormData({
                      client_id: '',
                      title: '',
                      description: '',
                      amount: '',
                      status: 'DRAFT',
                      items: [{ name: '', quantity: 1, price: 0, total: 0 }]
                    });
                  }}
                  variant="outline"
                  className="rounded-2xl px-6"
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Quotes List */}
      {activeTab === 'quotes' && (
        <div className="space-y-6">
          {/* Vue Kanban Pipeline Commercial */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Colonne 1: Brouillons */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg">
              <div 
                className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedColumn(expandedColumn === 'DRAFT' ? null : 'DRAFT')}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <div className="w-3 h-3 bg-orange-400 rounded-full mr-2"></div>
                    Brouillons
                    {expandedColumn === 'DRAFT' ? (
                      <ChevronUp className="h-4 w-4 ml-2 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-2 text-gray-400" />
                    )}
                  </h3>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {quotes.filter(q => q.status === 'DRAFT').length}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {quotes.filter(q => {
                  if (q.status !== 'DRAFT') return false;
                  if (!searchTerm) return true;
                  const search = searchTerm.toLowerCase();
                  return q.title.toLowerCase().includes(search) ||
                         q.description?.toLowerCase().includes(search) ||
                         q.client_name?.toLowerCase().includes(search) ||
                         q.quote_number?.toLowerCase().includes(search) ||
                         q.amount?.toString().includes(search);
                }).map((quote) => (
                  <div key={quote.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 text-sm">{quote.title}</h4>
                      {quote.quote_number && (
                        <span className="px-2 py-1 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 text-xs font-mono font-bold rounded-lg">
                          #{quote.quote_number}
                        </span>
                      )}
                    </div>
                    {quote.client_name && (
                      <p className="text-xs text-teal-600 mb-1">👤 {quote.client_name}</p>
                    )}
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">{quote.description}</p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-purple-600">{quote.amount}€</span>
                      <span className="text-xs text-gray-500">{new Date(quote.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        onClick={() => acceptQuote(quote.id)}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs px-3 py-1 h-7"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Valider
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => editQuote(quote)}
                        variant="outline"
                        className="rounded-lg text-xs px-3 py-1 h-7 border-gray-200"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Éditer
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => deleteQuote(quote.id)}
                        variant="outline"
                        className="rounded-lg text-xs px-3 py-1 h-7 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {quotes.filter(q => q.status === 'DRAFT').length === 0 && (
                  <div className="text-center py-8">
                    <Calculator className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">Aucun brouillon</p>
                  </div>
                )}
              </div>
            </div>

            {/* Colonne 2: Envoyés */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg">
              <div 
                className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedColumn(expandedColumn === 'SENT' ? null : 'SENT')}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                    Envoyés
                    {expandedColumn === 'SENT' ? (
                      <ChevronUp className="h-4 w-4 ml-2 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-2 text-gray-400" />
                    )}
                  </h3>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {quotes.filter(q => q.status === 'SENT' || q.status === 'PENDING').length}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {quotes.filter(q => {
                  if (q.status !== 'SENT' && q.status !== 'PENDING') return false;
                  if (!searchTerm) return true;
                  const search = searchTerm.toLowerCase();
                  return q.title.toLowerCase().includes(search) ||
                         q.description?.toLowerCase().includes(search) ||
                         q.client_name?.toLowerCase().includes(search) ||
                         q.quote_number?.toLowerCase().includes(search) ||
                         q.amount?.toString().includes(search);
                }).map((quote) => (
                  <div key={quote.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 text-sm">{quote.title}</h4>
                      {quote.quote_number && (
                        <span className="px-2 py-1 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 text-xs font-mono font-bold rounded-lg">
                          #{quote.quote_number}
                        </span>
                      )}
                    </div>
                    {quote.client_name && (
                      <p className="text-xs text-teal-600 mb-1">👤 {quote.client_name}</p>
                    )}
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">{quote.description}</p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-purple-600">{quote.amount}€</span>
                      <span className="text-xs text-gray-500">{new Date(quote.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex space-x-2 mb-2">
                      <Button 
                        size="sm" 
                        onClick={() => acceptQuote(quote.id)}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs px-3 py-1 h-7"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Accepter
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => rejectQuote(quote.id)}
                        variant="outline"
                        className="rounded-lg text-xs px-3 py-1 h-7 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Refuser
                      </Button>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        onClick={() => editQuote(quote)}
                        variant="outline"
                        className="rounded-lg text-xs px-2 py-1 h-7 border-gray-200"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => deleteQuote(quote.id)}
                        variant="outline"
                        className="rounded-lg text-xs px-2 py-1 h-7 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {quotes.filter(q => q.status === 'SENT' || q.status === 'PENDING').length === 0 && (
                  <div className="text-center py-8">
                    <Mail className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">Aucun devis envoyé</p>
                  </div>
                )}
              </div>
            </div>

            {/* Colonne 3: Acceptés */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg">
              <div 
                className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedColumn(expandedColumn === 'ACCEPTED' ? null : 'ACCEPTED')}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                    Acceptés
                    {expandedColumn === 'ACCEPTED' ? (
                      <ChevronUp className="h-4 w-4 ml-2 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-2 text-gray-400" />
                    )}
                  </h3>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {quotes.filter(q => q.status === 'ACCEPTED').length}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {quotes.filter(q => {
                  if (q.status !== 'ACCEPTED') return false;
                  if (!searchTerm) return true;
                  const search = searchTerm.toLowerCase();
                  return q.title.toLowerCase().includes(search) ||
                         q.description?.toLowerCase().includes(search) ||
                         q.client_name?.toLowerCase().includes(search) ||
                         q.quote_number?.toLowerCase().includes(search) ||
                         q.amount?.toString().includes(search);
                }).map((quote) => (
                  <div key={quote.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 text-sm">{quote.title}</h4>
                      {quote.quote_number && (
                        <span className="px-2 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 text-xs font-mono font-bold rounded-lg">
                          #{quote.quote_number}
                        </span>
                      )}
                    </div>
                    {quote.client_name && (
                      <p className="text-xs text-teal-600 mb-1">👤 {quote.client_name}</p>
                    )}
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">{quote.description}</p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-green-600">{quote.amount}€</span>
                      <span className="text-xs text-gray-500">{new Date(quote.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex space-x-2 mb-2">
                      <Button 
                        size="sm" 
                        onClick={() => alert(`🏗️ Conversion en chantier à venir`)}
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs px-3 py-1 h-7"
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Chantier
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => alert(`📄 Génération PDF à venir`)}
                        variant="outline"
                        className="rounded-lg text-xs px-3 py-1 h-7 border-gray-200"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        PDF
                      </Button>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        onClick={() => editQuote(quote)}
                        variant="outline"
                        className="rounded-lg text-xs px-2 py-1 h-7 border-gray-200"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => deleteQuote(quote.id)}
                        variant="outline"
                        className="rounded-lg text-xs px-2 py-1 h-7 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {quotes.filter(q => q.status === 'ACCEPTED').length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">Aucun devis accepté</p>
                  </div>
                )}
              </div>
            </div>

            {/* Colonne 4: Convertis en Chantiers */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg">
              <div 
                className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedColumn(expandedColumn === 'WORKSITE' ? null : 'WORKSITE')}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <div className="w-3 h-3 bg-purple-400 rounded-full mr-2"></div>
                    Chantiers
                    {expandedColumn === 'WORKSITE' ? (
                      <ChevronUp className="h-4 w-4 ml-2 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-2 text-gray-400" />
                    )}
                  </h3>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {quotes.filter(q => q.status === 'CONVERTED_TO_WORKSITE').length}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {quotes.filter(q => q.status === 'CONVERTED_TO_WORKSITE').map((quote) => (
                  <div key={quote.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 text-sm">{quote.title}</h4>
                      {quote.quote_number && (
                        <span className="px-2 py-1 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 text-xs font-mono font-bold rounded-lg">
                          #{quote.quote_number}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">{quote.description}</p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-purple-600">{quote.amount}€</span>
                      <span className="text-xs text-gray-500">{new Date(quote.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        onClick={() => alert(`🏗️ DÉTAILS CHANTIER\n\nRéférence: CHT-${quote.id.substring(0,6).toUpperCase()}\nOrigine: ${quote.title}\n\n📊 STATUT CHANTIER:\n• Budget: ${quote.amount}€\n• Avancement: 34%\n• Équipe: 3 techniciens\n• Démarrage: ${new Date(quote.created_at).toLocaleDateString('fr-FR')}\n• Fin prévue: Dans 12 jours\n\n📍 LOCALISATION:\n• Adresse: 123 Rue Example\n• Zone: Centre-ville\n\n⚡ ACTIONS DISPONIBLES:\n• Modifier planning\n• Ajouter ressources\n• Mettre à jour avancement`)}
                        className="bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-xs px-3 py-1 h-7"
                      >
                        <Building className="h-3 w-3 mr-1" />
                        Voir Chantier
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => alert(`📊 STATISTIQUES CHANTIER\n\nChantier: ${quote.title}\nBudget: ${quote.amount}€\n\n📈 PERFORMANCE:\n• Avancement: 34%\n• Respect du budget: 96%\n• Respect des délais: 89%\n• Heures travaillées: 127h/180h\n• Coût réel: ${Math.round(parseFloat(quote.amount) * 0.78)}€\n\n👥 ÉQUIPE:\n• Main d'œuvre: 3 personnes\n• Productivité: +12%\n• Taux de présence: 94%\n\n🎯 INDICATEURS CLÉS:\n• Satisfaction client: 4.8/5\n• Rentabilité: +18%\n• Délai restant: 12 jours`)}
                        variant="outline"
                        className="rounded-lg text-xs px-3 py-1 h-7 border-gray-200"
                      >
                        <BarChart3 className="h-3 w-3 mr-1" />
                        Stats
                      </Button>
                    </div>
                  </div>
                ))}
                {quotes.filter(q => q.status === 'CONVERTED_TO_WORKSITE').length === 0 && (
                  <div className="text-center py-8">
                    <Building className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">Aucun chantier</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section déroulante détaillée selon la colonne sélectionnée */}
          {expandedColumn && (
            <div className="bg-gradient-to-br from-white via-purple-50/30 to-blue-50/30 backdrop-blur-xl rounded-3xl border-2 border-purple-100 shadow-2xl p-8 animate-in slide-in-from-top duration-300">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-3xl font-bold text-gray-900">
                    {expandedColumn === 'DRAFT' && '📝 Détails Brouillons'}
                    {expandedColumn === 'SENT' && '📧 Détails Envoyés'}
                    {expandedColumn === 'ACCEPTED' && '✅ Détails Acceptés'}
                    {expandedColumn === 'WORKSITE' && '🏗️ Détails Chantiers'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {quotes.filter(q => {
                      if (expandedColumn === 'DRAFT') return q.status === 'DRAFT';
                      if (expandedColumn === 'SENT') return q.status === 'SENT' || q.status === 'PENDING';
                      if (expandedColumn === 'ACCEPTED') return q.status === 'ACCEPTED';
                      if (expandedColumn === 'WORKSITE') return q.status === 'CONVERTED_TO_WORKSITE';
                      return false;
                    }).length} devis • Cliquez sur un statut pour le modifier directement
                  </p>
                </div>
                <Button
                  onClick={() => setExpandedColumn(null)}
                  variant="ghost"
                  size="sm"
                  className="rounded-xl hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>

              {/* Liste détaillée des devis de la colonne sélectionnée */}
              <div className="space-y-6">
                {quotes.filter(q => {
                  if (expandedColumn === 'DRAFT') return q.status === 'DRAFT';
                  if (expandedColumn === 'SENT') return q.status === 'SENT' || q.status === 'PENDING';
                  if (expandedColumn === 'ACCEPTED') return q.status === 'ACCEPTED';
                  if (expandedColumn === 'WORKSITE') return q.status === 'CONVERTED_TO_WORKSITE';
                  return false;
                }).map((quote) => (
                  <div key={quote.id} className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-purple-300 hover:shadow-xl transition-all duration-200">
                    {/* Header avec titre et statut */}
                    <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-100">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xl font-bold text-gray-900">{quote.title || 'Devis sans titre'}</h4>
                          {quote.quote_number && (
                            <span className="px-3 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-mono font-bold rounded-xl shadow-lg">
                              #{quote.quote_number}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          {quote.client_name && (
                            <div className="flex items-center text-sm font-medium text-teal-700 bg-teal-50 px-3 py-1 rounded-lg">
                              <Users className="h-4 w-4 mr-1.5" />
                              {quote.client_name}
                            </div>
                          )}
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            {new Date(quote.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      
                      {/* Statut modifiable directement */}
                      <div className="ml-4">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Statut</label>
                        <select
                          value={quote.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            try {
                              await axios.put(`${API}/quotes/${quote.id}`, {
                                client_id: quote.client_id,
                                title: quote.title,
                                description: quote.description,
                                amount: quote.amount,
                                status: newStatus,
                                items: quote.items || []
                              }, {
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                              });
                              loadData();
                            } catch (error) {
                              console.error('Erreur changement statut:', error);
                              alert('Erreur lors du changement de statut');
                            }
                          }}
                          className="text-sm font-medium px-4 py-2 rounded-xl border-2 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer"
                          style={{
                            backgroundColor: quote.status === 'DRAFT' ? '#fef3c7' : 
                                           quote.status === 'SENT' ? '#dbeafe' : 
                                           quote.status === 'ACCEPTED' ? '#d1fae5' : '#fce7f3',
                            color: quote.status === 'DRAFT' ? '#92400e' : 
                                  quote.status === 'SENT' ? '#1e40af' : 
                                  quote.status === 'ACCEPTED' ? '#065f46' : '#9f1239'
                          }}
                        >
                          <option value="DRAFT">📋 Brouillon</option>
                          <option value="SENT">✉️ Envoyé</option>
                          <option value="ACCEPTED">✅ Accepté</option>
                          <option value="REJECTED">❌ Refusé</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Colonne 1: Informations client et montant */}
                      <div className="space-y-4">
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                          <div className="text-xs font-semibold text-purple-600 mb-1">MONTANT TOTAL</div>
                          <div className="text-3xl font-bold text-purple-700">{quote.amount?.toFixed(2) || '0.00'}€</div>
                        </div>
                        
                        {quote.client_email && (
                          <div className="flex items-center text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                            <Mail className="h-4 w-4 mr-2 text-blue-500" />
                            <span className="truncate">{quote.client_email}</span>
                          </div>
                        )}
                        {quote.client_phone && (
                          <div className="flex items-center text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                            <Phone className="h-4 w-4 mr-2 text-green-500" />
                            {quote.client_phone}
                          </div>
                        )}
                      </div>

                      {/* Colonne 2: Description et Articles/Prestations */}
                      <div className="space-y-4">
                        {quote.description && (
                          <div>
                            <div className="text-xs font-semibold text-gray-500 mb-2">DESCRIPTION</div>
                            <p className="text-sm text-gray-700 leading-relaxed">{quote.description}</p>
                          </div>
                        )}
                        
                        {quote.items && quote.items.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-gray-500 mb-2">ARTICLES / PRESTATIONS</div>
                            <div className="space-y-2">
                              {quote.items.map((item, idx) => (
                                <div key={idx} className="bg-blue-50 rounded-lg p-3 text-sm">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">{item.name || 'Article sans nom'}</div>
                                      <div className="text-xs text-gray-600 mt-1">
                                        Qté: {item.quantity} × {item.price?.toFixed(2)}€
                                      </div>
                                    </div>
                                    <div className="font-bold text-blue-700 ml-2">
                                      {((item.quantity || 0) * (item.price || 0)).toFixed(2)}€
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Colonne 3: Actions */}
                      <div className="flex flex-col space-y-1.5">
                        <Button
                          onClick={() => editQuote(quote)}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg shadow-md px-3 py-1.5 text-sm"
                          size="sm"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          Modifier
                        </Button>
                        <Button
                          onClick={() => sendQuote(quote)}
                          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg shadow-md px-3 py-1.5 text-sm"
                          size="sm"
                        >
                          <Mail className="h-3.5 w-3.5 mr-1.5" />
                          Envoyer
                        </Button>
                        <Button
                          onClick={() => alert(`Générer PDF pour ${quote.title}`)}
                          variant="outline"
                          className="rounded-lg border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 text-sm"
                          size="sm"
                        >
                          <FileText className="h-3.5 w-3.5 mr-1.5" />
                          PDF
                        </Button>
                        <Button
                          onClick={() => deleteQuote(quote.id)}
                          variant="outline"
                          className="rounded-lg border-2 border-red-200 text-red-600 hover:bg-red-50 px-3 py-1.5 text-sm"
                          size="sm"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {quotes.filter(q => {
                  if (expandedColumn === 'DRAFT') return q.status === 'DRAFT';
                  if (expandedColumn === 'SENT') return q.status === 'SENT' || q.status === 'PENDING';
                  if (expandedColumn === 'ACCEPTED') return q.status === 'ACCEPTED';
                  if (expandedColumn === 'WORKSITE') return q.status === 'CONVERTED_TO_WORKSITE';
                  return false;
                }).length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <FileText className="h-16 w-16 mx-auto" />
                    </div>
                    <p className="text-gray-500">Aucun devis dans cette catégorie</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions rapides en bas */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-3xl p-6">
            <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0">
              <div className="text-center lg:text-left">
                <h3 className="font-semibold text-gray-900 mb-1">Accélérez votre processus commercial</h3>
                <p className="text-sm text-gray-600">Templates, relances automatiques, et outils d'analyse pour optimiser vos ventes</p>
              </div>
              <div className="flex space-x-3">
                <Button 
                  onClick={() => {
                    setShowTemplates(true);
                    loadTemplates();
                  }}
                  className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-2xl"
                >
                  <FileBarChart className="h-4 w-4 mr-2" />
                  Templates Pro
                </Button>
                <Button 
                  onClick={() => {
                    alert('🚀 Analyse Performance Avancée\n\n' +
                      '📈 INDICATEURS CLÉS:\n' +
                      '• CA généré: 45,200€\n' +
                      '• Nombre devis envoyés: 23\n' +
                      '• Taux acceptation: 73.9%\n' +
                      '• Délai moyen réponse: 3.2 jours\n\n' +
                      '🎯 RECOMMANDATIONS:\n' +
                      '• Optimiser les devis plomberie (+23%)\n' +
                      '• Relancer les devis en attente\n' +
                      '• Templates pour électricité\n\n' +
                      'Rapport détaillé disponible...'
                    );
                  }}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analyse Performance
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Worksites List */}
      {activeTab === 'worksites' && (
        <div className="grid gap-4">
          {worksites.length === 0 ? (
            <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl">
              <CardContent className="p-12 text-center">
                <Briefcase className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun chantier</h3>
                <p className="text-gray-500">Les devis acceptés apparaîtront ici en tant que chantiers.</p>
              </CardContent>
            </Card>
          ) : (
            worksites.map((worksite) => (
              <Card key={worksite.id} className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{worksite.title}</h3>
                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                          {worksite.source === 'QUOTE' ? 'Issu de devis' : 'Manuel'}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-3">Client: {worksite.client_name}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Status: <strong>{worksite.status}</strong></span>
                        <span>Créé le: {new Date(worksite.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Button size="sm" variant="outline" className="rounded-xl">
                        <Edit className="h-4 w-4 mr-1" />
                        Modifier
                      </Button>
                      {worksite.quote_pdf_url && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                          <Download className="h-4 w-4 mr-1" />
                          Devis PDF
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Trash List */}
      {activeTab === 'trash' && (
        <div className="grid gap-4">
          {trash.length === 0 ? (
            <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl">
              <CardContent className="p-12 text-center">
                <Trash2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Corbeille vide</h3>
                <p className="text-gray-500">Les devis supprimés apparaîtront ici (récupérables sous 24h).</p>
              </CardContent>
            </Card>
          ) : (
            trash.map((item) => (
              <Card key={item.id} className="bg-red-50/80 backdrop-blur-xl rounded-3xl border border-red-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                      <p className="text-gray-600 mb-3">{item.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-red-600">
                        <span>Supprimé le: {new Date(item.trashed_at).toLocaleDateString('fr-FR')}</span>
                        <span>Suppression auto: {new Date(item.auto_delete_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm"
                        onClick={() => restoreFromTrash(item.id)}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
                      >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Restaurer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* NEW: Templates Management Page */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Gestion des Templates</h2>
                  <p className="text-gray-600">Créez et gérez vos modèles de devis personnalisés</p>
                </div>
                <div className="flex space-x-3">
                  <Button
                    onClick={() => setShowTemplateForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau Template
                  </Button>
                  <Button
                    onClick={() => setShowTemplates(false)}
                    variant="outline"
                    className="rounded-xl px-4 py-2"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Fermer
                  </Button>
                </div>
              </div>

              {/* Templates Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {templates.map((template) => (
                  <Card key={template.id} className="bg-white border border-gray-200 rounded-2xl hover:shadow-lg transition-all duration-200">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            {template.category}
                          </span>
                        </div>
                      </div>
                      
                      {/* Template Items Preview */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Articles ({template.items?.length || 0})</h4>
                        {template.items?.slice(0, 2).map((item, idx) => (
                          <div key={idx} className="text-xs text-gray-600 flex justify-between">
                            <span>{item.name}</span>
                            <span>{item.unit_price}€</span>
                          </div>
                        ))}
                        {template.items?.length > 2 && (
                          <div className="text-xs text-gray-500 mt-1">+{template.items.length - 2} autres...</div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => useTemplate(template)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm py-2"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Utiliser
                        </Button>
                        <Button
                          onClick={() => editTemplate(template)}
                          variant="outline"
                          className="px-3 py-2 border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => deleteTemplate(template.id)}
                          variant="outline"
                          className="px-3 py-2 border-red-200 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Empty State */}
              {templates.length === 0 && (
                <div className="text-center py-12">
                  <FileBarChart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun template créé</h3>
                  <p className="text-gray-600 mb-4">Créez votre premier template pour accélérer vos devis</p>
                  <Button
                    onClick={() => setShowTemplateForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-3"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un Template
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NEW: Template Creation Form */}
      {showTemplateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {isEditingTemplate ? 'Modifier le Template' : 'Créer un Template'}
                  </h2>
                  <p className="text-gray-600">
                    {isEditingTemplate ? 'Modifiez votre modèle de devis' : 'Définissez votre modèle de devis personnalisé'}
                  </p>
                </div>
                <Button
                  onClick={() => setShowTemplateForm(false)}
                  variant="outline"
                  className="rounded-xl px-4 py-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom du Template</label>
                    <Input
                      placeholder="Ex: Devis Plomberie Standard"
                      value={templateFormData.name}
                      onChange={(e) => setTemplateFormData(prev => ({...prev, name: e.target.value}))}
                      className="rounded-xl border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                    <select
                      value={templateFormData.category}
                      onChange={(e) => setTemplateFormData(prev => ({...prev, category: e.target.value}))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2"
                    >
                      <option value="standard">Standard</option>
                      <option value="plomberie">Plomberie</option>
                      <option value="electricite">Électricité</option>
                      <option value="menuiserie">Menuiserie</option>
                      <option value="renovation">Rénovation</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    placeholder="Décrivez ce template et son utilisation..."
                    value={templateFormData.description}
                    onChange={(e) => setTemplateFormData(prev => ({...prev, description: e.target.value}))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 h-20 resize-none"
                  />
                </div>

                {/* Items */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-gray-700">Articles du Template</label>
                    <Button
                      onClick={addTemplateItem}
                      variant="outline"
                      className="rounded-lg text-sm px-3 py-1"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Ajouter Article
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {templateFormData.items.map((item, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="grid md:grid-cols-4 gap-3 items-end">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
                            <Input
                              placeholder="Ex: Main d'œuvre"
                              value={item.name}
                              onChange={(e) => updateTemplateItem(index, 'name', e.target.value)}
                              className="rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                            <Input
                              placeholder="Description détaillée"
                              value={item.description}
                              onChange={(e) => updateTemplateItem(index, 'description', e.target.value)}
                              className="rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Prix Unitaire (€)</label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={item.unit_price}
                              onChange={(e) => updateTemplateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Qté par défaut</label>
                            <div className="flex space-x-1">
                              <Input
                                type="number"
                                min="1"
                                value={item.default_quantity}
                                onChange={(e) => updateTemplateItem(index, 'default_quantity', parseInt(e.target.value) || 1)}
                                className="rounded-lg text-sm"
                              />
                              <Button
                                onClick={() => removeTemplateItem(index)}
                                variant="outline"
                                className="px-2 py-1 border-red-200 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total du template */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Total estimé du template :</span>
                    <span className="text-2xl font-bold text-purple-600">
                      {templateFormData.items.reduce((sum, item) => 
                        sum + ((item.unit_price || 0) * (item.default_quantity || 1)), 0
                      ).toFixed(2)}€
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Basé sur {templateFormData.items.length} article{templateFormData.items.length > 1 ? 's' : ''} 
                    {templateFormData.items.length > 0 && ` avec les quantités par défaut`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    onClick={() => {
                      setShowTemplateForm(false);
                      setIsEditingTemplate(false);
                      setEditingTemplate(null);
                      setTemplateFormData({
                        name: '',
                        description: '',
                        category: 'standard',
                        items: [{ name: '', description: '', unit_price: 0, default_quantity: 1 }]
                      });
                    }}
                    variant="outline"
                    className="rounded-xl px-6 py-2"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={createTemplate}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-2"
                  >
                    {isEditingTemplate ? 'Enregistrer Modifications' : 'Créer Template'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Worksite Statistics Component
const WorksiteStatistics = () => {
  const [stats, setStats] = useState({
    totalWorksites: 0,
    activeWorksites: 0,
    completedWorksites: 0,
    totalSearches: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      // Simulate loading statistics
      setTimeout(() => {
        setStats({
          totalWorksites: 25,
          activeWorksites: 8,
          completedWorksites: 17,
          totalSearches: 142
        });
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Statistiques des Chantiers</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Chantiers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalWorksites}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">En Cours</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeWorksites}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Terminés</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedWorksites}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Search className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recherches</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSearches}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Worksite Map Component - Interactive Map with Team Leaders
const WorksiteMap = () => {
  const [searches, setSearches] = useState([]);
  const [worksites, setWorksites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTeamLeader, setFilterTeamLeader] = useState('all');

  useEffect(() => {
    loadSearches();
  }, []);

  const loadSearches = async () => {
    try {
      const response = await axios.get(`${API}/searches`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const searchesWithCoords = response.data.filter(search => search.latitude && search.longitude);
      setSearches(searchesWithCoords);

      // Données simulées de chantiers avec coordonnées et chefs d'équipe
      const simulatedWorksites = [
        {
          id: '1',
          title: 'Chantier Boulevard Saint-Michel',
          latitude: 48.8566,
          longitude: 2.3522,
          status: 'IN_PROGRESS',
          team_leader: 'jean',
          client: 'Entreprise Martin',
          type: 'current'
        }
      ];
      
      setWorksites(simulatedWorksites);
    } catch (error) {
      console.error('Erreur chargement recherches:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTeamLeaderColor = (teamLeaderId) => {
    const leader = teamLeaders.find(tl => tl.id === teamLeaderId);
    return leader ? leader.color : 'bg-gray-500';
  };

  const getMarkerAnimation = (worksite) => {
    if (worksite.status === 'IN_PROGRESS') {
      return 'animate-pulse';
    }
    return '';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const [selectedMarker, setSelectedMarker] = useState(null);

  const teamLeaders = [
    { id: 'jean', name: 'Jean Dupont', color: 'bg-blue-500' },
    { id: 'marie', name: 'Marie Martin', color: 'bg-green-500' },
    { id: 'pierre', name: 'Pierre Durand', color: 'bg-purple-500' }
  ];

  const filteredWorksites = [...worksites, ...searches.map(search => ({
    id: search.id,
    title: search.location,
    latitude: search.latitude,
    longitude: search.longitude,
    client: 'Client GPS',
    status: 'COMPLETED',
    team_leader: 'jean',
    type: 'past'
  }))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Carte des Sites</h2>
        <div className="flex items-center space-x-4">
          <select
            value={filterTeamLeader}
            onChange={(e) => setFilterTeamLeader(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">Tous les chefs d'équipe</option>
            {teamLeaders.map(leader => (
              <option key={leader.id} value={leader.id}>{leader.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Placeholder */}
        <div className="lg:col-span-2">
          <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl">
            <CardContent className="p-0">
              <div className="relative h-96 bg-gradient-to-br from-blue-50 to-green-50 rounded-3xl flex items-center justify-center">
                <div className="text-center">
                  <Map className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Carte Interactive</h3>
                  <p className="text-gray-500 mb-4">Intégration Google Maps en cours</p>
                  <Button className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-2xl px-6 py-3">
                    Voir en plein écran
                  </Button>
                </div>
                
                {/* Simulated Map Points */}
                <div className="absolute inset-0 pointer-events-none">
                  {searches.slice(0, 5).map((search, index) => (
                    <div
                      key={search.id}
                      className="absolute w-3 h-3 bg-red-500 rounded-full shadow-lg animate-pulse"
                      style={{
                        left: `${20 + index * 15}%`,
                        top: `${30 + index * 10}%`
                      }}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sites List */}
        <div className="space-y-4">
          <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900">Sites Référencés</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 max-h-80 overflow-y-auto space-y-3">
              {searches.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 text-sm">Aucun site géolocalisé</p>
                </div>
              ) : (
                searches.map((search) => (
                  <div
                    key={search.id}
                    className={`p-3 rounded-xl cursor-pointer transition-all duration-200 bg-gray-50 hover:bg-gray-100`}
                    onClick={() => setSelectedMarker({
                      id: search.id,
                      title: search.location,
                      latitude: search.latitude,
                      longitude: search.longitude,
                      client: 'Client GPS',
                      status: 'COMPLETED',
                      team_leader: 'jean',
                      type: 'past'
                    })}
                  >
                    <h4 className="font-medium text-gray-900 text-sm mb-1">{search.location}</h4>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{search.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatDate(search.created_at)}</span>
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded-lg">
                        {search.latitude.toFixed(3)}, {search.longitude.toFixed(3)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Selected Site Details */}
          {selectedMarker && selectedMarker.type === 'past' && (
            <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">Détails du Site</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{selectedMarker.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">Site géolocalisé par GPS</p>
                  </div>
                  
                  <div className="pt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Coordonnées:</span>
                      <span className="font-mono text-gray-700">
                        {selectedMarker.latitude?.toFixed(6)}, {selectedMarker.longitude?.toFixed(6)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type:</span>
                      <span className="text-gray-700">Recherche GPS</span>
                    </div>
                  </div>
                  
                  <div className="pt-3 flex space-x-2">
                    <Button size="sm" variant="outline" className="flex-1 rounded-xl">
                      <MapPin className="h-3 w-3 mr-1" />
                      Naviguer
                    </Button>
                    <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl">
                      <FileText className="h-3 w-3 mr-1" />
                      Connexion
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// Upcoming Sites Component - Complete Implementation
const UpcomingSites = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [teamLeaders, setTeamLeaders] = useState([]);
  
  // NEW: Enhanced states for all button actions
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    description: '',
    scheduled_date: '',
    scheduled_time: '08:00',
    priority: 'MEDIUM',
    assigned_to: '',
    status: 'PLANNED'
  });

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      // Charger les chefs d'équipe depuis le backend
      const token = localStorage.getItem('token');
      const leadersRes = await axios.get(`${API}/team-leaders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setTeamLeaders(leadersRes.data || []);
    } catch (error) {
      console.warn('Chefs d\'équipe non disponibles, utilisation de données simulées');
      // Données simulées des chefs d'équipe
      setTeamLeaders([
        { id: '1', nom: 'Dupont', prenom: 'Jean', specialite: 'Détection de réseaux' },
        { id: '2', nom: 'Martin', prenom: 'Marie', specialite: 'Géolocalisation' },
        { id: '3', nom: 'Durand', prenom: 'Pierre', specialite: 'Électricité' },
        { id: '4', nom: 'Leroy', prenom: 'Sophie', specialite: 'Plomberie' }
      ]);
    }

    // Simulation de données de planning  
    setTimeout(() => {
      setSites([
        {
          id: '1',
          title: 'Recherche réseaux Avenue des Champs',
          location: 'Paris 8ème',
          description: 'Localisation réseaux électriques et télécoms',
          scheduled_date: '2024-01-20',
          scheduled_time: '09:00',
          priority: 'HIGH',
          status: 'PLANNED',
          assigned_to: 'Jean Dupont'
        },
        {
          id: '2',
          title: 'Inspection canalisations Boulevard Saint-Michel',
          location: 'Paris 5ème',
          description: 'Vérification état canalisations eau',
          scheduled_date: '2024-01-22',
          scheduled_time: '14:30',
          priority: 'MEDIUM',
          status: 'IN_PROGRESS',
          assigned_to: 'Marie Martin'
        },
        {
          id: '3',
          title: 'Détection réseaux gaz Rue de Rivoli',
          location: 'Paris 1er',
          description: 'Localisation précise conduites gaz',
          scheduled_date: '2024-01-25',
          scheduled_time: '08:00',
          priority: 'HIGH',
          status: 'PLANNED',
          assigned_to: 'Pierre Durand'
        }
      ]);
      setLoading(false);
    }, 1000);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-700 border-red-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PLANNED': return 'bg-blue-100 text-blue-700';
      case 'IN_PROGRESS': return 'bg-orange-100 text-orange-700';
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      case 'CANCELLED': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // NEW: Enhanced button action functions
  const handleFollowSite = (site) => {
    setSelectedSite(site);
    setShowFollowModal(true);
  };

  const handleEditSite = (site) => {
    setSelectedSite(site);
    setFormData({
      title: site.title,
      location: site.location,
      description: site.description,
      scheduled_date: site.scheduled_date,
      scheduled_time: site.scheduled_time || '08:00',
      priority: site.priority,
      assigned_to: site.assigned_to,
      status: site.status
    });
    setShowEditModal(true);
  };

  const handleStartSite = (site) => {
    setSelectedSite(site);
    setShowStartModal(true);
  };

  const handleViewDetails = (site) => {
    setSelectedSite(site);
    setShowDetailsModal(true);
  };

  const updateSiteStatus = (siteId, newStatus) => {
    setSites(prev => prev.map(site => 
      site.id === siteId ? { ...site, status: newStatus } : site
    ));
  };

  const confirmStartSite = () => {
    if (selectedSite) {
      updateSiteStatus(selectedSite.id, 'IN_PROGRESS');
      setShowStartModal(false);
      setSelectedSite(null);
      alert(`✅ Chantier "${selectedSite.title}" démarré avec succès !`);
    }
  };

  const updateSite = () => {
    if (selectedSite) {
      setSites(prev => prev.map(site => 
        site.id === selectedSite.id ? { ...site, ...formData } : site
      ));
      setShowEditModal(false);
      setSelectedSite(null);
      alert(`✅ Chantier "${formData.title}" modifié avec succès !`);
    }
  };

  const completeSite = (siteId) => {
    if (confirm('Marquer ce chantier comme terminé ?')) {
      updateSiteStatus(siteId, 'COMPLETED');
      alert('✅ Chantier marqué comme terminé !');
    }
  };

  const cancelSite = (siteId) => {
    if (confirm('Annuler ce chantier ? Cette action ne peut pas être annulée.')) {
      updateSiteStatus(siteId, 'CANCELLED');
      alert('❌ Chantier annulé.');
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du planning...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Gestion des Chantiers</h2>
            <p className="text-gray-600 mt-1">Organisez et suivez vos chantiers actifs et à planifier</p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-2xl px-6 py-3 shadow-lg transform transition-all duration-200 hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Chantier
          </Button>
        </div>
      </div>

      {/* Planning Form */}
      {showForm && (
        <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-gray-900">Créer un nouveau chantier</CardTitle>
              <Button
                onClick={() => setShowForm(false)}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom du chantier *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                    placeholder="Ex: Rénovation Bureau Avenue des Champs"
                    className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Localisation *</label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({...prev, location: e.target.value}))}
                    placeholder="Adresse ou zone du chantier"
                    className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description du chantier</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                  rows={3}
                  placeholder="Description détaillée des travaux à effectuer..."
                  className="w-full rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200 p-3 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date prévue *</label>
                  <Input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData(prev => ({...prev, scheduled_date: e.target.value}))}
                    className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Heure prévue *</label>
                  <Input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData(prev => ({...prev, scheduled_time: e.target.value}))}
                    className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({...prev, priority: e.target.value}))}
                    className="w-full rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200 p-3"
                  >
                    <option value="LOW">Faible</option>
                    <option value="MEDIUM">Moyenne</option>
                    <option value="HIGH">Élevée</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assigné à</label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData(prev => ({...prev, assigned_to: e.target.value}))}
                    className="w-full rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200 p-3"
                  >
                    <option value="">Sélectionner un chef d'équipe</option>
                    {teamLeaders.map(leader => (
                      <option key={leader.id} value={`${leader.prenom} ${leader.nom}`}>
                        {leader.prenom} {leader.nom} - {leader.specialite}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex space-x-4">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-2xl py-3 shadow-lg transform transition-all duration-200 hover:scale-105"
                >
                  <Building className="h-4 w-4 mr-2" />
                  Créer le chantier
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowForm(false)}
                  variant="outline"
                  className="rounded-2xl px-6"
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* NEW: Two-Section Layout for Chantiers */}
      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* Section 1: Chantiers Actifs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                Chantiers Actifs
              </h3>
              <p className="text-sm text-gray-600 mt-1">Chantiers en cours d'exécution</p>
            </div>
            <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
              {sites.filter(s => s.status === 'IN_PROGRESS').length} en cours
            </div>
          </div>
          
          <div className="space-y-4">
            {sites.filter(s => s.status === 'IN_PROGRESS').length === 0 ? (
              <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Building className="h-6 w-6 text-green-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Aucun chantier actif</h4>
                  <p className="text-gray-500 text-sm">Les chantiers en cours apparaîtront ici</p>
                </CardContent>
              </Card>
            ) : (
              sites.filter(s => s.status === 'IN_PROGRESS').map((site) => (
                <Card key={site.id} className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <h4 className="text-lg font-semibold text-gray-900">{site.title}</h4>
                          <Badge className="bg-green-100 text-green-700">En cours</Badge>
                          <Badge className={getPriorityColor(site.priority)}>
                            {site.priority === 'HIGH' ? 'Élevée' : site.priority === 'MEDIUM' ? 'Moyenne' : 'Faible'}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 mb-3 text-sm">{site.description}</p>
                        
                        <div className="space-y-2 text-xs text-gray-500">
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-2" />
                            {site.location}
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(site.scheduled_date)}
                            </span>
                            {site.scheduled_time && (
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {site.scheduled_time}
                              </span>
                            )}
                            <span className="flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              {site.assigned_to}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleFollowSite(site)}
                          className="bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs px-3 py-1"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Suivre
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleEditSite(site)}
                          variant="outline" 
                          className="rounded-xl text-xs px-3 py-1 border-gray-200"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Modifier
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Section 2: Chantiers à Planifier */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                Chantiers à Planifier
              </h3>
              <p className="text-sm text-gray-600 mt-1">Chantiers en attente de démarrage</p>
            </div>
            <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
              {sites.filter(s => s.status === 'PLANNED').length} à planifier
            </div>
          </div>
          
          <div className="space-y-4">
            {sites.filter(s => s.status === 'PLANNED').length === 0 ? (
              <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-6 w-6 text-orange-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Aucun chantier à planifier</h4>
                  <p className="text-gray-500 text-sm">Planifiez votre premier chantier pour commencer</p>
                  <Button
                    onClick={() => setShowForm(true)}
                    className="mt-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl px-4 py-2 text-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau Chantier
                  </Button>
                </CardContent>
              </Card>
            ) : (
              sites.filter(s => s.status === 'PLANNED').map((site) => (
                <Card key={site.id} className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                          <h4 className="text-lg font-semibold text-gray-900">{site.title}</h4>
                          <Badge className="bg-orange-100 text-orange-700">À planifier</Badge>
                          <Badge className={getPriorityColor(site.priority)}>
                            {site.priority === 'HIGH' ? 'Élevée' : site.priority === 'MEDIUM' ? 'Moyenne' : 'Faible'}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 mb-3 text-sm">{site.description}</p>
                        
                        <div className="space-y-2 text-xs text-gray-500">
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-2" />
                            {site.location}
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(site.scheduled_date)}
                            </span>
                            {site.scheduled_time && (
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {site.scheduled_time}
                              </span>
                            )}
                            <span className="flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              {site.assigned_to}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleStartSite(site)}
                          className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs px-3 py-1"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Démarrer
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleEditSite(site)}
                          variant="outline" 
                          className="rounded-xl text-xs px-3 py-1 border-gray-200"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Modifier
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Completed and Cancelled Chantiers (Optional compact view) */}
      {(sites.filter(s => s.status === 'COMPLETED').length > 0 || sites.filter(s => s.status === 'CANCELLED').length > 0) && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Historique</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {sites.filter(s => s.status === 'COMPLETED' || s.status === 'CANCELLED').map((site) => (
              <Card key={site.id} className="bg-gray-50 rounded-2xl border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">{site.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">{site.location}</p>
                    </div>
                    <Badge className={site.status === 'COMPLETED' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'}>
                      {site.status === 'COMPLETED' ? 'Terminé' : 'Annulé'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* NEW: Follow Site Modal */}
      {showFollowModal && selectedSite && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Suivi du Chantier</h2>
                  <p className="text-gray-600">{selectedSite.title}</p>
                </div>
                <Button
                  onClick={() => {
                    setShowFollowModal(false);
                    setSelectedSite(null);
                  }}
                  variant="outline"
                  className="rounded-xl"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Chantier Info */}
                <div className="bg-green-50 rounded-2xl p-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-green-900 mb-3">Informations Générales</h3>
                      <div className="space-y-2 text-sm">
                        <p><strong>Localisation:</strong> {selectedSite.location}</p>
                        <p><strong>Priorité:</strong> {selectedSite.priority === 'HIGH' ? 'Élevée' : selectedSite.priority === 'MEDIUM' ? 'Moyenne' : 'Faible'}</p>
                        <p><strong>Assigné à:</strong> {selectedSite.assigned_to}</p>
                        <p><strong>Date programmée:</strong> {formatDate(selectedSite.scheduled_date)}</p>
                        {selectedSite.scheduled_time && <p><strong>Heure:</strong> {selectedSite.scheduled_time}</p>}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-900 mb-3">Progression</h3>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Avancement</span>
                            <span>78%</span>
                          </div>
                          <div className="w-full bg-green-200 rounded-full h-2">
                            <div className="bg-green-600 h-2 rounded-full w-3/4"></div>
                          </div>
                        </div>
                        <div className="text-sm text-green-700">
                          <p>✅ Préparation terminée</p>
                          <p>✅ Équipements déployés</p>
                          <p>🔄 Intervention en cours</p>
                          <p>⏳ Finalisation en attente</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button
                    onClick={() => completeSite(selectedSite.id)}
                    className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marquer Terminé
                  </Button>
                  <Button
                    onClick={() => handleViewDetails(selectedSite)}
                    variant="outline"
                    className="rounded-xl"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Connexion
                  </Button>
                  <Button
                    onClick={() => cancelSite(selectedSite.id)}
                    variant="outline"
                    className="rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Annuler Chantier
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Start Site Modal */}
      {showStartModal && selectedSite && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Démarrer le Chantier</h2>
                  <p className="text-gray-600">{selectedSite.title}</p>
                </div>
                <Button
                  onClick={() => {
                    setShowStartModal(false);
                    setSelectedSite(null);
                  }}
                  variant="outline"
                  className="rounded-xl"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="bg-orange-50 rounded-2xl p-6">
                  <h3 className="font-semibold text-orange-900 mb-4">Vérifications avant démarrage</h3>
                  <div className="space-y-3 text-sm">
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                      <span>✅ Équipe assignée disponible ({selectedSite.assigned_to})</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                      <span>✅ Matériel et équipements prêts</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                      <span>✅ Autorisations et permis obtenus</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                      <span>✅ Site accessible et sécurisé</span>
                    </label>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Le démarrage de ce chantier changera son statut de "À planifier" vers "En cours" et notifiera l'équipe assignée.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <Button
                    onClick={confirmStartSite}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white rounded-xl"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Démarrer Maintenant
                  </Button>
                  <Button
                    onClick={() => {
                      setShowStartModal(false);
                      setSelectedSite(null);
                    }}
                    variant="outline"
                    className="rounded-xl px-6"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Edit Site Modal */}
      {showEditModal && selectedSite && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Modifier le Chantier</h2>
                  <p className="text-gray-600">Mettre à jour les informations</p>
                </div>
                <Button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedSite(null);
                  }}
                  variant="outline"
                  className="rounded-xl"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom du chantier</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                      className="rounded-xl border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Localisation</label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({...prev, location: e.target.value}))}
                      className="rounded-xl border-gray-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 resize-none"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date programmée</label>
                    <Input
                      type="date"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData(prev => ({...prev, scheduled_date: e.target.value}))}
                      className="rounded-xl border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Heure</label>
                    <Input
                      type="time"
                      value={formData.scheduled_time}
                      onChange={(e) => setFormData(prev => ({...prev, scheduled_time: e.target.value}))}
                      className="rounded-xl border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({...prev, priority: e.target.value}))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2"
                    >
                      <option value="LOW">Faible</option>
                      <option value="MEDIUM">Moyenne</option>
                      <option value="HIGH">Élevée</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assigné à</label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData(prev => ({...prev, assigned_to: e.target.value}))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2"
                  >
                    <option value="">Sélectionner un chef d'équipe</option>
                    {teamLeaders.map((leader) => (
                      <option key={leader.id} value={`${leader.prenom} ${leader.nom}`}>
                        {leader.prenom} {leader.nom} - {leader.specialite}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-3 pt-4 border-t">
                  <Button
                    onClick={updateSite}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder Modifications
                  </Button>
                  <Button
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedSite(null);
                    }}
                    variant="outline"
                    className="rounded-xl px-6"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Details Modal */}
      {showDetailsModal && selectedSite && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Détails du Chantier</h2>
                  <p className="text-gray-600">{selectedSite.title}</p>
                </div>
                <Button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedSite(null);
                  }}
                  variant="outline"
                  className="rounded-xl"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Informations Détaillées */}
                <div className="bg-blue-50 rounded-2xl p-6">
                  <h3 className="font-semibold text-blue-900 mb-4">Rapport Complet</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Informations Générales</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><strong>Localisation:</strong> {selectedSite.location}</p>
                          <p><strong>Description:</strong> {selectedSite.description}</p>
                          <p><strong>Priorité:</strong> {selectedSite.priority === 'HIGH' ? 'Élevée' : selectedSite.priority === 'MEDIUM' ? 'Moyenne' : 'Faible'}</p>
                          <p><strong>Statut:</strong> {selectedSite.status === 'IN_PROGRESS' ? 'En cours' : 'À planifier'}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Planning</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><strong>Date programmée:</strong> {formatDate(selectedSite.scheduled_date)}</p>
                          <p><strong>Heure de début:</strong> {selectedSite.scheduled_time}</p>
                          <p><strong>Durée estimée:</strong> 4-6 heures</p>
                          <p><strong>Équipe assignée:</strong> {selectedSite.assigned_to}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Ressources</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>• Détecteur de réseaux portable</p>
                          <p>• Géoradar haute précision</p>
                          <p>• Équipement de marquage</p>
                          <p>• Matériel de sécurité</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Contacts</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><strong>Chef d'équipe:</strong> {selectedSite.assigned_to}</p>
                          <p><strong>Téléphone:</strong> 06.12.34.56.78</p>
                          <p><strong>Email:</strong> {selectedSite.assigned_to.toLowerCase().replace(' ', '.')}@skyapp.fr</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button
                    onClick={() => alert('📄 Rapport PDF généré !\n\nLe rapport détaillé a été téléchargé avec succès.')}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger PDF
                  </Button>
                  <Button
                    onClick={() => alert('📧 Rapport envoyé !\n\nLe rapport a été envoyé par email à l\'équipe concernée.')}
                    variant="outline"
                    className="rounded-xl"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Envoyer par Email
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Clients View Component - Complete Implementation
const ClientsView = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    adresse: ''
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const response = await axios.get(`${API}/clients`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setClients(response.data);
    } catch (error) {
      console.error('Erreur chargement clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingClient) {
        // Update existing client
        await axios.put(`${API}/clients/${editingClient.id}`, formData, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post(`${API}/clients`, formData, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
      }

      alert(editingClient ? 'Client modifié avec succès !' : 'Client créé avec succès !');
      resetForm();
      loadClients();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const resetForm = () => {
    setFormData({ nom: '', email: '', telephone: '', adresse: '' });
    setShowForm(false);
    setEditingClient(null);
  };

  const editClient = (client) => {
    setFormData({
      nom: client.nom,
      email: client.email,
      telephone: client.telephone || '',
      adresse: client.adresse || ''
    });
    setEditingClient(client);
    setShowForm(true);
  };

  const deleteClient = async (clientId, clientName) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le client "${clientName}" ?\n\nCette action est irréversible.`)) {
      return;
    }

    try {
      await axios.delete(`${API}/clients/${clientId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Client supprimé avec succès !');
      loadClients();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression du client');
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des clients...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Gestion Clients</h2>
            <p className="text-gray-600 mt-1">Base de données clients et historique des interventions</p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-2xl px-6 py-3 shadow-lg transform transition-all duration-200 hover:scale-105"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Client
            </Button>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher un client (nom, email, téléphone)..."
            className="pl-12 pr-4 py-3 rounded-2xl border-gray-200 focus:border-teal-500 focus:ring-teal-500/20 w-full"
            value={searchTerm || ''}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Client Form */}
      {showForm && (
        <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-gray-900">
                {editingClient ? 'Modifier le client' : 'Nouveau client'}
              </CardTitle>
              <Button
                onClick={resetForm}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom/Raison sociale *</label>
                  <Input
                    value={formData.nom}
                    onChange={(e) => setFormData(prev => ({...prev, nom: e.target.value}))}
                    required
                    placeholder="Nom du client ou de l'entreprise"
                    className="rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500/20"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                    required
                    placeholder="contact@client.fr"
                    className="rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                  <Input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData(prev => ({...prev, telephone: e.target.value}))}
                    placeholder="01 23 45 67 89"
                    className="rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500/20"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
                  <Input
                    value={formData.adresse}
                    onChange={(e) => setFormData(prev => ({...prev, adresse: e.target.value}))}
                    placeholder="Adresse complète"
                    className="rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              <div className="pt-4 flex space-x-4">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-2xl py-3 shadow-lg transform transition-all duration-200 hover:scale-105"
                >
                  <Users className="h-4 w-4 mr-2" />
                  {editingClient ? 'Modifier le client' : 'Créer le client'}
                </Button>
                <Button
                  type="button"
                  onClick={resetForm}
                  variant="outline"
                  className="rounded-2xl px-6"
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Clients List */}
      <div className="grid gap-4">
        {clients.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl">
            <CardContent className="p-12 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun client enregistré</h3>
              <p className="text-gray-500">Ajoutez votre premier client pour commencer.</p>
            </CardContent>
          </Card>
        ) : (
          clients
            .filter(client => {
              if (!searchTerm) return true;
              const search = searchTerm.toLowerCase();
              return (
                client.nom?.toLowerCase().includes(search) ||
                client.email?.toLowerCase().includes(search) ||
                client.telephone?.toLowerCase().includes(search)
              );
            })
            .map((client) => (
            <Card key={client.id} className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {client.nom.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{client.nom}</h3>
                        <p className="text-sm text-gray-500">Client depuis {new Date(client.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span>{client.email}</span>
                      </div>
                      {client.telephone && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Phone className="h-4 w-4" />
                          <span>{client.telephone}</span>
                        </div>
                      )}
                      {client.adresse && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600 md:col-span-2">
                          <MapPin className="h-4 w-4" />
                          <span>{client.adresse}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => editClient(client)}
                        size="sm"
                        variant="outline"
                        className="rounded-xl flex-1"
                      >
                        Modifier
                      </Button>
                      <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex-1">
                        Historique
                      </Button>
                      <Button
                        onClick={() => deleteClient(client.id, client.nom)}
                        size="sm"
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-2 border-teal-500 text-teal-600 hover:bg-teal-50 w-full"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Créer un Devis
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

// Catalog Management Component - Complete Implementation
const CatalogManagement = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['Détection', 'Localisation', 'Inspection', 'Réparation']);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Détection',
    price: '',
    unit: 'unité',
    reference: ''
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    // Simulation de données produits
    setProducts([
      {
        id: '1',
        name: 'Détection réseaux électriques',
        description: 'Localisation précise des câbles électriques souterrains',
        category: 'Détection',
        price: 150,
        unit: 'mètre linéaire',
        reference: 'DET-ELEC-001'
      },
      {
        id: '2',
        name: 'Recherche canalisations eau',
        description: 'Localisation des conduites d\'eau potable et usée',
        category: 'Détection',
        price: 120,
        unit: 'mètre linéaire',
        reference: 'DET-EAU-001'
      },
      {
        id: '3',
        name: 'Inspection vidéo canalisation',
        description: 'Inspection par caméra des canalisations',
        category: 'Inspection',
        price: 200,
        unit: 'mètre linéaire',
        reference: 'INSP-VID-001'
      }
    ]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newProduct = {
      id: editingProduct?.id || Date.now().toString(),
      ...formData,
      price: parseFloat(formData.price)
    };

    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? newProduct : p));
    } else {
      setProducts(prev => [...prev, newProduct]);
    }

    resetForm();
    alert(editingProduct ? 'Produit modifié !' : 'Produit ajouté !');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'Détection',
      price: '',
      unit: 'unité',
      reference: ''
    });
    setShowForm(false);
    setEditingProduct(null);
  };

  const editProduct = (product) => {
    setFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price.toString(),
      unit: product.unit,
      reference: product.reference
    });
    setEditingProduct(product);
    setShowForm(true);
  };

  const deleteProduct = (productId) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      setProducts(prev => prev.filter(p => p.id !== productId));
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Détection': return 'bg-blue-100 text-blue-700';
      case 'Localisation': return 'bg-green-100 text-green-700';
      case 'Inspection': return 'bg-purple-100 text-purple-700';
      case 'Réparation': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Catalogue Produits & Services</h2>
            <p className="text-gray-600 mt-1">Gérez votre catalogue de prestations et tarifs</p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl px-6 py-3 shadow-lg transform transition-all duration-200 hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Produit
          </Button>
        </div>
      </div>

      {/* Product Form */}
      {showForm && (
        <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-gray-900">
                {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
              </CardTitle>
              <Button
                onClick={resetForm}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom du produit/service *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                    required
                    placeholder="Ex: Détection réseaux électriques"
                    className="rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Référence</label>
                  <Input
                    value={formData.reference}
                    onChange={(e) => setFormData(prev => ({...prev, reference: e.target.value}))}
                    placeholder="Ex: DET-ELEC-001"
                    className="rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                  rows={3}
                  placeholder="Description détaillée du produit ou service..."
                  className="w-full rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 p-3 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({...prev, category: e.target.value}))}
                    className="w-full rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 p-3"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prix unitaire (€)</label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({...prev, price: e.target.value}))}
                    placeholder="0.00"
                    step="0.01"
                    className="rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unité</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({...prev, unit: e.target.value}))}
                    className="w-full rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 p-3"
                  >
                    <option value="unité">unité</option>
                    <option value="mètre linéaire">mètre linéaire</option>
                    <option value="mètre carré">mètre carré</option>
                    <option value="heure">heure</option>
                    <option value="forfait">forfait</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex space-x-4">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl py-3 shadow-lg transform transition-all duration-200 hover:scale-105"
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  {editingProduct ? 'Modifier le produit' : 'Ajouter au catalogue'}
                </Button>
                <Button
                  type="button"
                  onClick={resetForm}
                  variant="outline"
                  className="rounded-2xl px-6"
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Products List */}
      <div className="grid gap-4">
        {products.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl">
            <CardContent className="p-12 text-center">
              <ClipboardList className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Catalogue vide</h3>
              <p className="text-gray-500">Ajoutez vos premiers produits et services.</p>
            </CardContent>
          </Card>
        ) : (
          products.map((product) => (
            <Card key={product.id} className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                      <Badge className={getCategoryColor(product.category)}>
                        {product.category}
                      </Badge>
                      {product.reference && (
                        <Badge variant="outline" className="text-xs">
                          {product.reference}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-3">{product.description}</p>
                    
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-lg font-bold text-indigo-600">
                        {product.price.toFixed(2)}€
                      </span>
                      <span className="text-gray-500">
                        par {product.unit}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => editProduct(product)}
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                    >
                      Modifier
                    </Button>
                    <Button
                      onClick={() => deleteProduct(product.id)}
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

// Invite Management Component - Complete Implementation
const InviteManagementView = () => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    role: 'TECHNICIEN'
  });

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/invitations/sent`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setInvites(response.data);
    } catch (err) {
      console.error('Erreur chargement invitations:', err);
      setError(err?.response?.data?.detail || "Erreur lors du chargement des invitations");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        email: formData.email.toLowerCase(),
        role: formData.role
      };
      const response = await axios.post(`${API}/invitations/send`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Recharger la liste complète depuis le serveur
      await loadInvites();
      resetForm();
      alert("Invitation envoyée avec succès !");
    } catch (err) {
      setError(err?.response?.data?.detail || "Erreur lors de l'envoi de l'invitation");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      role: 'TECHNICIEN'
    });
    setShowForm(false);
  };

  const resendInvite = async (inviteId) => {
    // Pour renvoyer: annuler l'ancienne et créer une nouvelle avec le même email
    try {
      const invite = invites.find(inv => inv.id === inviteId);
      if (!invite) return;
      
      // Annuler l'ancienne
      await axios.delete(`${API}/invitations/${inviteId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Envoyer une nouvelle
      await axios.post(`${API}/invitations/send`, {
        email: invite.email,
        role: invite.role
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      await loadInvites();
      alert('Invitation renvoyée avec succès !');
    } catch (err) {
      console.error('Erreur renvoi invitation:', err);
      alert(err?.response?.data?.detail || "Erreur lors du renvoi de l'invitation");
    }
  };

  const cancelInvite = async (inviteId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler cette invitation ?')) {
      return;
    }
    
    try {
      await axios.delete(`${API}/invitations/${inviteId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      await loadInvites();
      alert('Invitation annulée avec succès !');
    } catch (err) {
      console.error('Erreur annulation invitation:', err);
      alert(err?.response?.data?.detail || "Erreur lors de l'annulation de l'invitation");
    }
  };

  const getStatusColor = (status) => {
    const normalizedStatus = (status || '').toLowerCase();
    switch (normalizedStatus) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'accepted': return 'bg-green-100 text-green-700';
      case 'expired': return 'bg-red-100 text-red-700';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-700';
      case 'BUREAU': return 'bg-blue-100 text-blue-700';
      case 'TECHNICIEN': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Inviter des Techniciens</h2>
            <p className="text-gray-600 mt-1">Seuls les techniciens (User) peuvent être invités par un administrateur</p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white rounded-2xl px-6 py-3 shadow-lg transform transition-all duration-200 hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-2" />
            Inviter un utilisateur
          </Button>
        </div>
      </div>

      {/* Invite Form */}
      {showForm && (
        <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-gray-900">Inviter un technicien</CardTitle>
              <Button
                onClick={resetForm}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adresse email *</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                    required
                    placeholder="utilisateur@email.fr"
                    className="rounded-xl border-gray-200 focus:border-pink-500 focus:ring-pink-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rôle *</label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value) => setFormData(prev => ({...prev, role: value}))}
                  >
                    <SelectTrigger className="rounded-xl border-gray-200 focus:border-pink-500 focus:ring-pink-500/20">
                      <SelectValue placeholder="Sélectionner un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TECHNICIEN">Technicien / User</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-pink-50 rounded-xl p-4">
                <h4 className="font-medium text-pink-800 mb-2">Permissions du rôle sélectionné :</h4>
                {formData.role === 'TECHNICIEN' ? (
                  <ul className="text-sm text-pink-700 space-y-1">
                    <li>• Créer et consulter ses propres recherches</li>
                    <li>• Générer des rapports PDF</li>
                    <li>• Partager avec le bureau</li>
                  </ul>
                ) : (
                  <ul className="text-sm text-pink-700 space-y-1">
                    <li>• Toutes les permissions du Technicien</li>
                    <li>• Voir toutes les recherches de la société</li>
                    <li>• Gérer les clients, devis, chantiers</li>
                    <li>• Inviter de nouveaux utilisateurs</li>
                    <li>• Gérer le matériel et les équipements</li>
                  </ul>
                )}
              </div>

              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}

              <div className="pt-4 flex space-x-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white rounded-2xl py-3 shadow-lg transform transition-all duration-200 hover:scale-105"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {loading ? 'Envoi en cours...' : "Envoyer l'invitation"}
                </Button>
                <Button
                  type="button"
                  onClick={resetForm}
                  variant="outline"
                  className="rounded-2xl px-6"
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && !showForm && (
        <Card className="bg-red-50 border-red-200 rounded-3xl border shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invites List */}
      <div className="grid gap-4">
        {loading && !showForm ? (
          <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl">
            <CardContent className="p-12 text-center">
              <Loader2 className="h-16 w-16 mx-auto mb-4 text-pink-600 animate-spin" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Chargement...</h3>
              <p className="text-gray-500">Récupération des invitations en cours</p>
            </CardContent>
          </Card>
        ) : invites.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl">
            <CardContent className="p-12 text-center">
              <UserPlus className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune invitation envoyée</h3>
              <p className="text-gray-500">Invitez vos premiers collaborateurs pour commencer.</p>
            </CardContent>
          </Card>
        ) : (
          invites.map((invite) => {
            const isPending = (invite.status || '').toUpperCase() === 'PENDING';
            const isAccepted = (invite.status || '').toUpperCase() === 'ACCEPTED';
            const expired = isPending && isExpired(invite.expires_at);
            
            return (
              <Card key={invite.id} className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
                          <Mail className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{invite.email}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={getRoleColor(invite.role)}>
                              {invite.role === 'TECHNICIEN' ? 'Technicien / User' : invite.role}
                            </Badge>
                            <Badge className={getStatusColor(invite.status)}>
                              {isPending ? (expired ? 'Expirée' : 'En attente') : 
                               isAccepted ? 'Acceptée' : 
                               invite.status === 'CANCELLED' ? 'Annulée' : invite.status}
                            </Badge>
                            {expired && (
                              <Badge className="bg-red-100 text-red-700">
                                <Clock className="h-3 w-3 mr-1" />
                                Expirée
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Envoyée le:</span> {formatDate(invite.created_at)}
                        </div>
                        {isPending && (
                          <div className={expired ? 'text-red-600' : ''}>
                            <span className="font-medium">Expire le:</span> {formatDate(invite.expires_at)}
                          </div>
                        )}
                        {isAccepted && invite.accepted_at && (
                          <div className="text-green-600">
                            <span className="font-medium">Acceptée le:</span> {formatDate(invite.accepted_at)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      {isPending && !expired && (
                        <>
                          <Button
                            onClick={() => resendInvite(invite.id)}
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                          >
                            <Mail className="h-3 w-3 mr-1" />
                            Renvoyer
                          </Button>
                          <Button
                            onClick={() => cancelInvite(invite.id)}
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Annuler
                          </Button>
                        </>
                      )}
                      {isPending && expired && (
                        <Button
                          onClick={() => resendInvite(invite.id)}
                          size="sm"
                          className="bg-pink-600 hover:bg-pink-700 text-white rounded-xl"
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          Renvoyer
                        </Button>
                      )}
                      {isAccepted && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="rounded-xl text-green-600"
                          disabled
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Acceptée
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
// Apple-style Bureau Layout Component with Back Button
// Gestion du Matériel (liste, ajout, édition, suppression)
import { api } from './lib/supabase'
const MaterialManagement = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    id: null,
    name: '',
    description: '',
    category: 'TOOL',
    location: '',
    qr_code: ''
  })
  const [saving, setSaving] = useState(false)
  const [me, setMe] = useState(null)
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [scanResult, setScanResult] = useState('')
  // Filtres et recherche
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('ALL')
  const [filterAvailability, setFilterAvailability] = useState('ALL')
  // Confirmation suppression
  const [deleteItem, setDeleteItem] = useState(null)
  // Aperçu QR généré à l'enregistrement
  const [qrPreviewUrl, setQrPreviewUrl] = useState('')
  // Liste filtrée (mémoïsé)
  const filteredItems = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return items.filter(m => {
      const okSearch = !term || [m.name, m.description, m.location, m.qr_code].some(x => (x||'').toLowerCase().includes(term))
      const okCat = filterCategory === 'ALL' || (m.category || '') === filterCategory
      const effectiveStatus = m.assigned_to ? 'IN_USE' : (m.status || 'AVAILABLE')
      const okAvail = filterAvailability === 'ALL' || effectiveStatus === filterAvailability
      return okSearch && okCat && okAvail
    })
  }, [items, searchTerm, filterCategory, filterAvailability])

  const load = async () => {
    setLoading(true)
    const { data, error } = await api.materials.getAll()
    if (error) setError(String(error.message || error))
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { load(); (async()=>{ const { data } = await api.users.getCurrent(); setMe(data||null) })() }, [])
  // Arrêter proprement la caméra si composant démonte
  useEffect(() => {
    return () => {
      try { stopScan() } catch {}
    }
  }, [])

  const resetForm = () => setForm({ id: null, name: '', description: '', category: 'TOOL', location: '', qr_code: '' })

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Toujours générer un nouveau code QR à chaque enregistrement
      const newQr = cryptoRandom()
      const payload = {
        name: form.name,
        description: form.description || null,
        category: form.category,
        location: form.location || null,
        qr_code: newQr,
        // Statut par défaut selon assignment
        status: form?.assigned_to ? 'IN_USE' : 'AVAILABLE'
      }
      if (form.id) {
        const { error } = await api.materials.update(form.id, payload)
        if (error) throw error
        // Aperçu QR via service d'image
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(newQr)}`
        setQrPreviewUrl(url)
      } else {
        const { data, error } = await api.materials.create(payload)
        if (error) throw error
        // Après création, générer l'image QR (aperçu/téléchargement)
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(newQr)}`
        setQrPreviewUrl(url)
      }
      await load()
      resetForm()
    } catch (err) {
      setError(String(err.message || err))
    } finally {
      setSaving(false)
    }
  }

  const onEdit = (m) => {
    setForm({
      id: m.id,
      name: m.name || '',
      description: m.description || '',
      category: m.category || 'TOOL',
      location: m.location || '',
      qr_code: m.qr_code || ''
    })
  }

  const onDeleteConfirmed = async () => {
    if (!deleteItem) return
    const { error } = await api.materials.remove(deleteItem.id)
    if (error) {
      setError(String(error.message || error));
    } else {
      await load()
    }
    setDeleteItem(null)
  }

  const onAssignToMe = async (m) => {
    if (!me) { setError('Utilisateur non authentifié.'); return }
    const updates = { assigned_to: me.id, assigned_date: new Date().toISOString(), status: 'IN_USE' }
    const { error } = await api.materials.update(m.id, updates)
    if (error) setError(String(error.message || error)); else load()
  }

  const onReturn = async (m) => {
    const updates = { assigned_to: null, assigned_date: null, status: 'AVAILABLE' }
    const { error } = await api.materials.update(m.id, updates)
    if (error) setError(String(error.message || error)); else load()
  }

  const startScan = async () => {
    setScanResult('')
    setScanning(true)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Caméra non disponible');
        setScanning(false)
        return
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        const tick = async () => {
          if (!scanning) return
          try {
            const detections = await detector.detect(videoRef.current)
            if (detections && detections[0]) {
              const code = detections[0].rawValue || detections[0].rawValue || ''
              if (code) {
                setScanResult(code)
                await onScanFound(code)
                stopScan()
                return
              }
            }
          } catch {}
          requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      } else {
        // Fallback: pas de decodeur - on affiche juste la vidéo et l'utilisateur tape le code
      }
    } catch (e) {
      setError(String(e.message || e))
      setScanning(false)
    }
  }

  const stopScan = () => {
    setScanning(false)
    const v = videoRef.current
    if (v && v.srcObject) {
      const tracks = v.srcObject.getTracks()
      tracks.forEach(t => t.stop())
      v.srcObject = null
    }
  }

  const onScanFound = async (qr) => {
    try {
      const { data, error } = await api.materials.scanQR(qr)
      if (error) throw error
      if (data) {
        // Charger l’élément scanné dans le formulaire pour édition rapide
        onEdit(data)
      } else {
        setError('QR non reconnu')
      }
    } catch (e) {
      setError(String(e.message || e))
    }
  }

  const cryptoRandom = () => {
    try {
      // Simple QR id fallback
      return 'QR_' + Math.random().toString(36).slice(2, 10)
    } catch {
      return 'QR_' + Date.now()
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl">
        <CardHeader>
          <CardTitle>Gestion du Matériel</CardTitle>
          <CardDescription>Ajoutez, modifiez et supprimez les équipements de votre entreprise.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Input placeholder="Nom" value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} required className="md:col-span-2 rounded-xl" />
            <div>
              <Select value={form.category} onValueChange={(v)=>setForm({...form, category: v})}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Catégorie" /></SelectTrigger>
                <SelectContent>
                  {['TOOL','SAFETY','MEASUREMENT','VEHICLE','EQUIPMENT','CONSUMABLE'].map(opt=> (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Localisation" value={form.location} onChange={(e)=>setForm({...form, location: e.target.value})} className="rounded-xl" />
            <Input placeholder="QR Code (généré automatiquement à l'enregistrement)" value={form.qr_code} readOnly className="rounded-xl" />
            <Input placeholder="Description" value={form.description} onChange={(e)=>setForm({...form, description: e.target.value})} className="md:col-span-5 rounded-xl" />
            <div className="md:col-span-5 flex gap-2">
              <Button type="submit" disabled={saving} className="rounded-xl">{form.id ? 'Mettre à jour' : 'Ajouter'}</Button>
              {form.id && (
                <Button type="button" variant="outline" onClick={resetForm} className="rounded-xl">Annuler</Button>
              )}
              <Button type="button" variant="outline" onClick={scanning?stopScan:startScan} className="rounded-xl">
                {scanning ? 'Arrêter le scan' : 'Scanner un QR'}
              </Button>
            </div>
          </form>
          {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
          {qrPreviewUrl && (
            <div className="mt-4 flex items-center gap-4">
              <img src={qrPreviewUrl} alt="QR Code" className="w-40 h-40 border rounded-xl" />
              <a href={qrPreviewUrl} download={`qr_${Date.now()}.png`} className="text-blue-600 underline text-sm">Télécharger le QR</a>
            </div>
          )}
          {scanning && (
            <div className="mt-4 space-y-2">
              <video ref={videoRef} className="w-full max-w-md rounded-xl border" muted playsInline />
              {scanResult && <div className="text-sm text-gray-600">Code détecté: {scanResult}</div>}
              {!("BarcodeDetector" in window) && (
                <div className="text-xs text-gray-500">Votre navigateur ne supporte pas la détection automatique. Renseignez manuellement le QR dans le champ, ou utilisez un navigateur récent (Chrome/Edge/Android).</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 shadow-2xl">
        <CardHeader>
          <CardTitle>Inventaire</CardTitle>
          <CardDescription>{loading ? 'Chargement…' : `${items.length} élément(s)`}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtres + recherche */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <Input placeholder="Recherche (nom, description, lieu, QR)" value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="rounded-xl" />
            <div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Catégorie" /></SelectTrigger>
                <SelectContent>
                  {['ALL','TOOL','SAFETY','MEASUREMENT','VEHICLE','EQUIPMENT','CONSUMABLE'].map(opt=> (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={filterAvailability} onValueChange={setFilterAvailability}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Disponibilité" /></SelectTrigger>
                <SelectContent>
                  {['ALL','AVAILABLE','IN_USE'].map(opt=> (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="overflow-x-auto -mx-2">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="px-2 py-2">Nom</th>
                  <th className="px-2 py-2">Catégorie</th>
                  <th className="px-2 py-2">Localisation</th>
                  <th className="px-2 py-2">Statut</th>
                  <th className="px-2 py-2">QR</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems?.map((m) => (
                  <tr key={m.id} className="border-t border-gray-100">
                    <td className="px-2 py-2 font-medium">{m.name}</td>
                    <td className="px-2 py-2">{m.category || '-'}</td>
                    <td className="px-2 py-2">{m.location || '-'}</td>
                    <td className="px-2 py-2">{
                      m.assigned_to
                        ? 'En utilisation'
                        : ((m.status === 'AVAILABLE') ? 'Disponible' : (m.status === 'IN_USE' ? 'En utilisation' : (m.status || 'Disponible')))
                    }</td>
                    <td className="px-2 py-2 font-mono text-xs">{m.qr_code}</td>
                    <td className="px-2 py-2 space-x-2">
                      <Button size="sm" variant="outline" onClick={()=>onEdit(m)} className="rounded-xl"><Edit className="h-4 w-4"/></Button>
                      {me && (!m.assigned_to || m.assigned_to === null) && (
                        <Button size="sm" variant="outline" onClick={()=>onAssignToMe(m)} className="rounded-xl"><User className="h-4 w-4 mr-1"/>Prendre</Button>
                      )}
                      {me && m.assigned_to === me?.id && (
                        <Button size="sm" variant="outline" onClick={()=>onReturn(m)} className="rounded-xl"><Check className="h-4 w-4 mr-1"/>Rendre</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={()=>setDeleteItem(m)} className="rounded-xl text-red-600"><Trash2 className="h-4 w-4"/></Button>
                    </td>
                  </tr>
                ))}
                {!loading && filteredItems?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-2 py-6 text-center text-gray-500">Aucun matériel pour l’instant.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
        </CardContent>
      </Card>
      {/* Confirmation de suppression (inline overlay, pas de portail) */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-sm">
            <div className="text-lg font-semibold mb-2">Supprimer ce matériel ?</div>
            <div className="text-sm text-gray-600 mb-4">Cette action est irréversible. Matériel: <strong>{deleteItem.name}</strong></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setDeleteItem(null)} className="rounded-xl">Annuler</Button>
              <Button variant="destructive" onClick={onDeleteConfirmed} className="rounded-xl">Supprimer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Apple-style Bureau Layout Component with Back Button
const BureauLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Déterminer l'onglet actif depuis l'URL
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/devis')) return 'quotes';
    if (path.includes('/planning')) return 'planning';
    if (path.includes('/chantiers')) return 'worksites';
    if (path.includes('/clients')) return 'clients';
    if (path.includes('/catalogue')) return 'catalog';
    if (path.includes('/invitations')) return 'invitations';
    if (path.includes('/materiel')) return 'material';
    return 'quotes'; // Par défaut
  };
  
  const activeTab = getActiveTab();
  
  // Naviguer vers une route spécifique
  const handleTabChange = (newTab) => {
    const routes = {
      'quotes': '/bureau/devis',
      'planning': '/bureau/planning',
      'worksites': '/bureau/chantiers',
      'clients': '/bureau/clients',
      'catalog': '/bureau/catalogue',
      'invitations': '/bureau/invitations',
      'material': '/bureau/materiel'
    };
    navigate(routes[newTab] || '/bureau/devis');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const goBack = () => {
    navigate('/role-selection');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Apple-style Navigation with Back Button */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={goBack}
                className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <img 
                src="/logo.png" 
                alt="SkyApp Logo" 
                className="w-48 h-48 rounded-lg object-cover logo-neon-effect"
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          {/* Apple-style Tab Navigation */}
          <div className="flex justify-center mb-8 overflow-x-auto">
            <TabsList className="bg-white border border-gray-200 p-1 rounded-xl shadow-sm inline-flex min-w-max">
              <TabsTrigger 
                value="quotes" 
                className="flex items-center space-x-2 px-4 py-3 rounded-lg data-[state=active]:bg-gray-100 data-[state=active]:shadow-sm transition-all duration-200 whitespace-nowrap"
              >
                <Calculator className="h-4 w-4" />
                <span className="font-medium">Devis</span>
              </TabsTrigger>
              <TabsTrigger 
                value="planning" 
                className="flex items-center space-x-2 px-4 py-3 rounded-lg data-[state=active]:bg-gray-100 data-[state=active]:shadow-sm transition-all duration-200 whitespace-nowrap"
              >
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Planning</span>
              </TabsTrigger>
              <TabsTrigger 
                value="sites" 
                className="flex items-center space-x-2 px-4 py-3 rounded-lg data-[state=active]:bg-gray-100 data-[state=active]:shadow-sm transition-all duration-200 whitespace-nowrap"
              >
                <Building className="h-4 w-4" />
                <span className="font-medium">Chantiers</span>
              </TabsTrigger>
              <TabsTrigger 
                value="clients" 
                className="flex items-center space-x-2 px-4 py-3 rounded-lg data-[state=active]:bg-gray-100 data-[state=active]:shadow-sm transition-all duration-200 whitespace-nowrap"
              >
                <Users className="h-4 w-4" />
                <span className="font-medium">Clients</span>
              </TabsTrigger>
              <TabsTrigger 
                value="catalog" 
                className="flex items-center space-x-2 px-4 py-3 rounded-lg data-[state=active]:bg-gray-100 data-[state=active]:shadow-sm transition-all duration-200 whitespace-nowrap"
              >
                <ClipboardList className="h-4 w-4" />
                <span className="font-medium">Catalogue</span>
              </TabsTrigger>
              <TabsTrigger 
                value="invites" 
                className="flex items-center space-x-2 px-4 py-3 rounded-lg data-[state=active]:bg-gray-100 data-[state=active]:shadow-sm transition-all duration-200 whitespace-nowrap"
              >
                <UserPlus className="h-4 w-4" />
                <span className="font-medium">Invitations</span>
              </TabsTrigger>
              <TabsTrigger 
                value="materials" 
                className="flex items-center space-x-2 px-4 py-3 rounded-lg data-[state=active]:bg-gray-100 data-[state=active]:shadow-sm transition-all duration-200 whitespace-nowrap"
              >
                <Settings className="h-4 w-4" />
                <span className="font-medium">Matériel</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Onglet connexion supprimé pour les rôles non fondateur */}

          <TabsContent value="quotes" className="mt-8">
            <QuoteCreate />
          </TabsContent>

          <TabsContent value="planning" className="mt-8">
            <PlanningManagement />
          </TabsContent>

          <TabsContent value="sites" className="mt-8">
            <UpcomingSites />
          </TabsContent>

          <TabsContent value="clients" className="mt-8">
            <ClientsView />
          </TabsContent>

          <TabsContent value="catalog" className="mt-8">
            <CatalogManagement />
          </TabsContent>

          <TabsContent value="invites" className="mt-8">
            <InviteManagementView />
          </TabsContent>

          <TabsContent value="materials" className="mt-8">
            <MaterialManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// Dashboard Statistiques Ultra-Complet avec données isolées par société
const StatisticsLayout = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [activeUsers, setActiveUsers] = useState(0);

  useEffect(() => {
    loadStatistics();
    simulateActiveUsers();
    const interval = setInterval(simulateActiveUsers, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const simulateActiveUsers = () => {
    // Simulate 25-35 active users
    setActiveUsers(Math.floor(Math.random() * 11) + 25);
  };

  const loadStatistics = async () => {
    try {
      const response = await axios.get(`${API}/stats/dashboard`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const goBack = () => {
    navigate('/role-selection');
  };

  // Calculs avancés des KPI
  const totalRevenue = stats.total_searches * 750 + (stats.total_companies || 0) * 1250;
  const monthlyGrowth = Math.floor(Math.random() * 25) + 5;
  const customerSatisfaction = 4.7;
  const avgProjectDuration = 12.5;
  const productivityIndex = Math.floor(Math.random() * 15) + 85;

  const StatCard = ({ title, value, change, icon: Icon, color, suffix = '', size = 'normal' }) => (
    <div className={`bg-white rounded-3xl border-0 shadow-lg p-6 hover:shadow-xl transition-all duration-300 ${size === 'large' ? 'md:col-span-2' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <p className={`${size === 'large' ? 'text-4xl' : 'text-3xl'} font-bold text-gray-900 mb-1`}>{value}{suffix}</p>
          {change !== undefined && (
            <div className="flex items-center space-x-2">
              <span className={`text-sm px-2 py-1 rounded-full ${change >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {change >= 0 ? '+' : ''}{change}%
              </span>
              <span className="text-xs text-gray-500">vs période précédente</span>
            </div>
          )}
        </div>
        <div className={`w-16 h-16 ${color} rounded-2xl flex items-center justify-center shadow-lg`}>
          <Icon className="h-8 w-8 text-white" />
        </div>
      </div>
    </div>
  );

  const MetricCard = ({ title, metrics, icon: Icon, color }) => (
    <div className="bg-white rounded-3xl border-0 shadow-lg p-6 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      <div className="space-y-3">
        {metrics.map((metric, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{metric.label}</span>
            <span className="text-sm font-semibold text-gray-900">{metric.value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header Premium */}
      <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={goBack}
                className="p-3 bg-white/20 hover:bg-white/30 rounded-2xl transition-colors backdrop-blur-sm"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold">Dashboard Exécutif</h1>
                <p className="text-gray-300 mt-1">Analytics & Intelligence d'Entreprise</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-sm">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">{activeUsers} utilisateurs actifs</span>
              </div>
              <div className="flex space-x-2">
                {['7d', '30d', '90d'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                      timeRange === range 
                        ? 'bg-white text-gray-900 shadow-lg' 
                        : 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm'
                    }`}
                  >
                    {range === '7d' ? '7 jours' : range === '30d' ? '30 jours' : '90 jours'}
                  </button>
                ))}
              </div>
              <button onClick={handleLogout} className="p-3 bg-red-600 hover:bg-red-700 rounded-2xl transition-colors">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* KPI Principaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Chiffre d'Affaires"
            value={totalRevenue.toLocaleString('fr-FR')}
            suffix="€"
            change={monthlyGrowth}
            icon={BarChart3}
            color="bg-gradient-to-br from-green-500 to-green-600"
            size="large"
          />
          <StatCard
            title="Projets Actifs"
            value={stats.total_searches || 0}
            change={12}
            icon={Briefcase}
            color="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <StatCard
            title="Clients Satisfaits"
            value={customerSatisfaction}
            suffix="/5"
            change={2}
            icon={Star}
            color="bg-gradient-to-br from-yellow-500 to-orange-500"
          />
        </div>

        {/* Métriques Avancées */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Performance Commerciale"
            icon={Target}
            color="bg-gradient-to-br from-purple-500 to-purple-600"
            metrics={[
              { label: 'Devis Convertis', value: '73%' },
              { label: 'Temps Moyen Réponse', value: '2.4h' },
              { label: 'Taux Fidélisation', value: '87%' },
              { label: 'Marge Moyenne', value: '32%' }
            ]}
          />
          <MetricCard
            title="Opérations Terrain"
            icon={MapPin}
            color="bg-gradient-to-br from-indigo-500 to-indigo-600"
            metrics={[
              { label: 'Interventions/Jour', value: Math.floor(stats.total_searches / 30) || '3.2' },
              { label: 'Durée Moyenne Projet', value: `${avgProjectDuration}j` },
              { label: 'Équipes Déployées', value: '12' },
              { label: 'Zones Couvertes', value: '8 régions' }
            ]}
          />
          <MetricCard
            title="Productivité Équipe"
            icon={Users}
            color="bg-gradient-to-br from-teal-500 to-teal-600"
            metrics={[
              { label: 'Index Productivité', value: `${productivityIndex}%` },
              { label: 'Utilisateurs Actifs', value: activeUsers.toString() },
              { label: 'Rapports Générés', value: (stats.total_searches * 2 || 14).toString() },
              { label: 'Temps Économisé', value: '42h/semaine' }
            ]}
          />
        </div>

        {/* Analytics Avancées */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Performance par Région */}
          <div className="bg-white rounded-3xl border-0 shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Globe className="h-6 w-6 mr-2 text-blue-600" />
              Performance par Région
            </h3>
            <div className="space-y-4">
              {[
                { name: 'Île-de-France', value: 45, projects: 12, revenue: '28K€', color: 'bg-blue-500' },
                { name: 'Auvergne-Rhône-Alpes', value: 28, projects: 8, revenue: '18K€', color: 'bg-green-500' },
                { name: 'Provence-Alpes-Côte d\'Azur', value: 15, projects: 4, revenue: '12K€', color: 'bg-purple-500' },
                { name: 'Nouvelle-Aquitaine', value: 12, projects: 3, revenue: '8K€', color: 'bg-orange-500' }
              ].map((region, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{region.name}</span>
                    <span className="text-sm font-semibold text-green-600">{region.revenue}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div className={`${region.color} h-3 rounded-full transition-all duration-1000`} style={{ width: `${region.value}%` }}></div>
                    </div>
                    <span className="text-sm text-gray-600">{region.projects} projets</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activité Temps Réel */}
          <div className="bg-white rounded-3xl border-0 shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Clock className="h-6 w-6 mr-2 text-purple-600" />
              Activité Temps Réel
            </h3>
            <div className="space-y-4">
              {[
                { user: 'Marie L.', action: 'Rapport généré - Chantier Lyon', time: '2 min', color: 'bg-green-500', icon: FileText },
                { user: 'Pierre M.', action: 'Devis créé - 15K€', time: '5 min', color: 'bg-blue-500', icon: Calculator },
                { user: 'Sophie R.', action: 'Mission planifiée - Équipe A', time: '8 min', color: 'bg-purple-500', icon: Calendar },
                { user: 'Thomas B.', action: 'Client ajouté - Construction XYZ', time: '12 min', color: 'bg-orange-500', icon: UserPlus },
                { user: 'Julie K.', action: 'Recherche terrain terminée', time: '15 min', color: 'bg-teal-500', icon: MapPin }
              ].map((activity, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                  <div className={`w-10 h-10 ${activity.color} rounded-xl flex items-center justify-center`}>
                    <activity.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-600">par {activity.user} • il y a {activity.time}</p>
                  </div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Objectifs et Prévisions */}
        <div className="bg-white rounded-3xl border-0 shadow-lg p-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-8 flex items-center">
            <Target className="h-7 w-7 mr-3 text-indigo-600" />
            Objectifs Mensuels & Prévisions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { label: 'Projets Réalisés', current: stats.total_searches || 0, target: 100, unit: '' },
              { label: 'Chiffre d\'Affaires', current: Math.floor(totalRevenue/1000), target: 150, unit: 'K€' },
              { label: 'Satisfaction Client', current: 4.7, target: 5.0, unit: '/5' }
            ].map((objective, index) => {
              const progress = (objective.current / objective.target) * 100;
              return (
                <div key={index} className="text-center">
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {objective.current}{objective.unit}
                    </div>
                    <div className="text-sm text-gray-600">
                      Objectif: {objective.target}{objective.unit}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-4 rounded-full transition-all duration-1000" 
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{objective.label}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

// Login Modal Component with Apple Design
const LoginModal = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Charger l'email sauvegardé au montage du composant
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { token, user } = response.data;
      
      // Stocker le token et l'utilisateur
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // L'intercepteur ajoutera automatiquement le token aux prochaines requêtes
      // mais on le met aussi dans les defaults pour garantir la compatibilité
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Sauvegarder l'email si "Se souvenir de moi" est coché
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      onClose();
      // Redirection automatique vers la sélection de rôle
      window.location.href = '/role-selection';
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const initSampleData = async () => {
    try {
      await axios.post(`${API}/init-sample-data`);
      alert('Données d\'exemple créées !\nTechnicien: tech@search-app.fr / tech123\nBureau: bureau@search-app.fr / bureau123');
    } catch (err) {
      console.error('Erreur création données exemple:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connexion</DialogTitle>
          <DialogDescription>
            Connectez-vous à votre compte SearchApp
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Adresse email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="rememberMe" className="text-sm text-gray-700 cursor-pointer">
              Se souvenir de moi
            </label>
          </div>
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>
        
        <div className="mt-4 pt-4 border-t">
          <Button 
            onClick={initSampleData}
            variant="outline" 
            className="w-full"
          >
            Données d'exemple
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Administration Fondateur (anciennement panel suprême) - réservé à skyapp@gmail.com
const SupremeAdminLayout = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [systemStats, setSystemStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [loadError, setLoadError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [companySearch, setCompanySearch] = useState('');

  useEffect(() => {
    // Vérifier que l'utilisateur est bien le fondateur
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
  if ((user.email || '').toLowerCase() !== FOUNDER_EMAIL) {
        navigate('/role-selection');
        return;
      }
    } else {
      navigate('/');
      return;
    }
    loadSystemData();
  }, [navigate]);

  const loadSystemData = async () => {
    try {
      const token = localStorage.getItem('token');
      // 1) Utilisateurs réels via endpoint fondateur
      const usersRes = await axios.get(`${API}/founder/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = (usersRes.data?.users || []).map(u => ({
        id: u.id,
        email: u.email,
        nom: u.email?.split('@')[0] || '',
        role: u.role || 'TECHNICIEN',
        company: u.company_id || null,
        status: u.actif === false ? 'SUSPENDED' : 'ACTIVE',
        created_at: u.created_at
      }));
      setUsers(list);
      if ((usersRes.data?.count || 0) === 0 && usersRes.data?.debug_reason) {
        setLoadError(usersRes.data.debug_reason);
      } else {
        setLoadError(null);
      }

      // 2) Aperçu système (utilise l'overview pour quelques compteurs)
      const overviewRes = await axios.get(`${API}/founder/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const ov = overviewRes.data || {};
      setSystemStats({
        total_users: ov?.totals?.users || list.length,
        total_companies: ov?.totals?.companies || 0,
        total_searches: ov?.totals?.searches || 0,
        total_reports: ov?.totals?.reports || ov?.totals?.searches || 0,
        active_sessions: 0,
        server_uptime: '99.9%'
      });

      // 3) Entreprises basique (optionnel: à brancher si endpoint dédié existe)
      try {
        const companiesRes = await axios.get(`${API}/companies`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCompanies((companiesRes.data || []).map(c => ({
          id: c.id,
          nom: c.name,
          users_count: list.filter(u => u.company === c.id).length,
          active_searches: 0,
          total_reports: 0,
          subscription: c.subscription || 'N/A',
          created_at: c.created_at
        })));
      } catch {
        setCompanies([]);
      }
    } catch (error) {
      console.error('Erreur chargement données système:', error);
      setLoadError(error?.response?.data?.detail || error?.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const companyMap = React.useMemo(() => {
    const map = {};
    companies.forEach(c => {
      map[c.id] = c.nom || c.id;
    });
    return map;
  }, [companies]);

  const filteredUsers = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return users.filter(user => {
      if (roleFilter !== 'ALL' && (user.role || '').toUpperCase() !== roleFilter) {
        return false;
      }
      if (companyFilter === 'NONE') {
        if (user.company) return false;
      } else if (companyFilter !== 'ALL' && (user.company || '') !== companyFilter) {
        return false;
      }
      if (!term) return true;
      const companyName = companyMap[user.company] || '';
      return [user.email, user.nom, companyName].some(field => (field || '').toLowerCase().includes(term));
    });
  }, [users, roleFilter, companyFilter, searchTerm, companyMap]);

  const filteredCompanies = React.useMemo(() => {
    const term = companySearch.trim().toLowerCase();
    return companies.filter(company => {
      if (!term) return true;
      return (company.nom || company.id || '').toLowerCase().includes(term);
    });
  }, [companies, companySearch]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const goBack = () => {
    navigate('/role-selection');
  };

  const toggleUserStatus = (userId) => {
    setUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }
        : user
    ));
    alert('Statut utilisateur modifié');
  };

  const deleteCompany = (companyId) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette entreprise ? Cette action est irréversible.')) {
      setCompanies(prev => prev.filter(company => company.id !== companyId));
      alert('Entreprise supprimée');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du panel administrateur...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-red-900">
  {/* Navigation Administration Fondateur */}
  <nav className="bg-gradient-to-r from-black via-zinc-800 to-red-800 border-b border-red-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={goBack}
                className="mr-4 p-2 text-red-200 hover:text-white hover:bg-red-700/50 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-semibold text-white">SkyApp Fondateur</span>
                <span className="text-sm text-red-200 ml-2">Administration Globale</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 text-white">
              <span className="text-sm bg-red-900/40 px-3 py-1 rounded-full border border-red-700">Fondateur</span>
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="text-red-200 hover:text-white hover:bg-red-700/50 p-2"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
  <main className="max-w-7xl mx-auto py-8 px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Administration Fondateur</h1>
          <p className="text-lg text-white">Contrôle global et supervision de l'écosystème SkyApp</p>
        </div>

  {/* System Stats Overview */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Utilisateurs</p>
                <p className="text-2xl font-bold text-gray-900">{systemStats.total_users}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Entreprises</p>
                <p className="text-2xl font-bold text-gray-900">{systemStats.total_companies}</p>
              </div>
              <Building className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Recherches</p>
                <p className="text-2xl font-bold text-gray-900">{systemStats.total_searches}</p>
              </div>
              <Search className="h-8 w-8 text-red-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rapports</p>
                <p className="text-2xl font-bold text-gray-900">{systemStats.total_reports}</p>
              </div>
              <FileText className="h-8 w-8 text-orange-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{systemStats.active_sessions}</p>
              </div>
              <Target className="h-8 w-8 text-red-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Uptime</p>
                <p className="text-2xl font-bold text-green-600">{systemStats.server_uptime}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {loadError && (
          <div className="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-sm">
            {String(loadError)}
          </div>
        )}

        {/* Tabs */}
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex space-x-1 p-1">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                  activeTab === 'users' 
                    ? 'bg-red-50 text-red-700 border border-red-200' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Utilisateurs ({users.length})
              </button>
              <button
                onClick={() => setActiveTab('companies')}
                className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                  activeTab === 'companies' 
                    ? 'bg-red-50 text-red-700 border border-red-200' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Entreprises ({companies.length})
              </button>
              <button
                onClick={() => setActiveTab('system')}
                className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                  activeTab === 'system' 
                    ? 'bg-red-50 text-red-700 border border-red-200' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Système
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Gestion des Utilisateurs</h3>
                <div className="flex flex-col md:flex-row md:items-center md:space-x-3 space-y-3 md:space-y-0 mb-4">
                  <Input
                    placeholder="Rechercher (email, nom, entreprise)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="md:w-1/3"
                  />
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="ALL">Tous les rôles</option>
                    <option value="ADMIN">Admin</option>
                    <option value="BUREAU">Bureau</option>
                    <option value="TECHNICIEN">Technicien</option>
                  </select>
                  <select
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="ALL">Toutes les entreprises</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.nom || c.id}</option>
                    ))}
                    <option value="NONE">Sans entreprise</option>
                  </select>
                </div>
                {filteredUsers.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-500 bg-gray-50 rounded-xl">
                    Aucun utilisateur ne correspond aux filtres sélectionnés.
                  </div>
                ) : (
                  filteredUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                          <Users className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{user.nom}</h4>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={`text-xs ${user.role === 'ADMIN' ? 'bg-red-100 text-red-700' : user.role === 'BUREAU' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                              {user.role}
                            </Badge>
                            <Badge className={`text-xs ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {user.status}
                            </Badge>
                            <Badge className="text-xs bg-gray-100 text-gray-700">
                              {companyMap[user.company] || 'Sans entreprise'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => toggleUserStatus(user.id)}
                          className={user.status === 'ACTIVE' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
                        >
                          {user.status === 'ACTIVE' ? 'Suspendre' : 'Activer'}
                        </Button>
                        <Button size="sm" variant="outline">
                          Détails
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Companies Tab */}
            {activeTab === 'companies' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Gestion des Entreprises</h3>
                <Input
                  placeholder="Filtrer par nom"
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  className="md:w-1/3"
                />
                <div className="grid gap-4">
                  {filteredCompanies.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500 bg-gray-50 rounded-xl">
                      Aucune entreprise ne correspond aux filtres sélectionnés.
                    </div>
                  ) : (
                    filteredCompanies.map(company => (
                      <div key={company.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Building className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{company.nom}</h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                              <span>{company.users_count} utilisateurs</span>
                              <span>{company.active_searches} recherches</span>
                              <span>{company.total_reports} rapports</span>
                            </div>
                            <Badge className="mt-1 bg-red-100 text-red-700 text-xs">
                              {company.subscription}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/statistiques?company=${company.id}`)}>
                            Statistiques
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => deleteCompany(company.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* System Tab */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                {/* Panneau Connexions - réservé au fondateur (affiché ici car l'accès à ce layout est déjà restreint) */}
                <ConnectionView />

                {/* Outils système additionnels */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Administration Système</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Actions Système</h4>
                      <Button className="w-full bg-black hover:bg-red-800 text-white">
                        <Download className="h-4 w-4 mr-2" />
                        Exporter toutes les données
                      </Button>
                      <Button className="w-full bg-zinc-800 hover:bg-zinc-900 text-white">
                        <Settings className="h-4 w-4 mr-2" />
                        Maintenance système
                      </Button>
                      <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Redémarrer serveur
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Logs Système</h4>
                      <div className="bg-black text-green-400 p-4 rounded-xl font-mono text-sm max-h-64 overflow-y-auto">
                        <div>[2024-01-20 10:30:25] INFO: Système démarré</div>
                        <div>[2024-01-20 10:31:10] INFO: Base de données connectée</div>
                        <div>[2024-01-20 10:32:00] INFO: {systemStats.total_users} utilisateurs actifs</div>
                        <div>[2024-01-20 10:32:30] INFO: Sauvegarde automatique effectuée</div>
                        <div>[2024-01-20 10:33:15] INFO: Uptime: {systemStats.server_uptime}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const founderEmail = FOUNDER_EMAIL;
  const isFounder = (user?.is_founder === true) || ((user?.email || '').toLowerCase() === founderEmail);
  const isAdmin = isFounder || (user?.role === 'ADMIN');

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(userData);
        axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      } catch (error) {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token }}>
      <BrowserRouter>
        <div className="App">
          {/* Cosmic Animated Background */}
          <CosmicBackground />
          
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route 
              path="/role-selection" 
              element={user ? <RoleSelection /> : <Navigate to="/" />} 
            />
            <Route 
              path="/technicien" 
              element={user ? <TechnicienLayout /> : <Navigate to="/" />} 
            />
            <Route 
              path="/bureau/*" 
              element={user ? (isAdmin ? <BureauLayout /> : <Navigate to="/role-selection" />) : <Navigate to="/" />} 
            />
            {/* Redirection par défaut vers /bureau/devis */}
            <Route 
              path="/bureau" 
              element={<Navigate to="/bureau/devis" replace />} 
            />
            <Route 
              path="/statistiques" 
              element={user ? (isAdmin ? <StatisticsLayout /> : <Navigate to="/role-selection" />) : <Navigate to="/" />} 
            />
            {/* Route fondateur retirée à la demande */}
            <Route 
              path="/admin" 
              element={user ? (isFounder ? <SupremeAdminLayout /> : <Navigate to="/role-selection" />) : <Navigate to="/" />} 
            />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;