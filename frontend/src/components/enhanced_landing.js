// Enhanced Landing Page Component with Advanced Animations
const EnhancedLandingPage = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState({});

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
      description: "Interface mobile optimisée pour les techniciens sur le terrain avec géolocalisation GPS précise et mode hors-ligne.",
      gradient: "from-blue-500 to-cyan-500",
      delay: "delay-100"
    },
    {
      icon: FileBarChart,
      title: "Rapports Automatisés",
      description: "Génération automatique de rapports PDF professionnels avec photos géolocalisées et observations détaillées.",
      gradient: "from-green-500 to-emerald-500",
      delay: "delay-200"
    },
    {
      icon: Calculator,
      title: "Gestion des Devis",
      description: "Création et suivi des devis avec intégration catalogue produits et calculs automatiques.",
      gradient: "from-purple-500 to-violet-500",
      delay: "delay-300"
    },
    {
      icon: MapPinIcon,
      title: "Cartographie Interactive",
      description: "Visualisation des chantiers sur carte avec informations en temps réel et navigation GPS intégrée.",
      gradient: "from-orange-500 to-red-500",
      delay: "delay-400"
    },
    {
      icon: Users,
      title: "Gestion Clients",
      description: "Base de données clients complète avec historique des interventions et suivi commercial avancé.",
      gradient: "from-indigo-500 to-blue-500",
      delay: "delay-500"
    },
    {
      icon: BarChart3,
      title: "Analytics Avancés",
      description: "Tableau de bord analytique avec métriques de performance et insights prédictifs pour optimiser vos opérations.",
      gradient: "from-pink-500 to-rose-500",
      delay: "delay-600"
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
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50"></div>
        <div 
          className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-purple-600/10 rounded-full blur-3xl animate-pulse"
          style={{ transform: `translateY(${scrollY * 0.5}px)` }}
        ></div>
        <div 
          className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-tr from-green-400/10 to-blue-600/10 rounded-full blur-3xl animate-pulse"
          style={{ transform: `translateY(${-scrollY * 0.3}px)` }}
        ></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-indigo-400/5 to-purple-600/5 rounded-full blur-2xl animate-ping"></div>
      </div>

      {/* Enhanced Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrollY > 50 
          ? 'bg-white/90 backdrop-blur-2xl border-b border-white/20 shadow-xl shadow-black/5' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Animated Logo */}
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl flex items-center justify-center shadow-2xl transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  <Search className="h-6 w-6 text-white" />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-2xl"></div>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-500"></div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent">
                SkyApp
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {['Fonctionnalités', 'À propos', 'Tarifs', 'Contact'].map((item, index) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace('à ', '').replace('é', 'e')}`}
                  className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-500 relative group py-2 transform hover:scale-105"
                >
                  {item}
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 group-hover:w-full transition-all duration-500"></div>
                  <div className="absolute inset-0 bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                </a>
              ))}
              <Button
                variant="ghost"
                onClick={() => setShowLoginModal(true)}
                className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 transform hover:scale-105 notranslate"
                translate="no"
              >
                Connexion
              </Button>
              <Button
                onClick={() => setShowRegisterModal(true)}
                className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white shadow-xl shadow-blue-500/25 rounded-2xl transform hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/40 notranslate"
                translate="no"
              >
                Inscription
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="transform hover:scale-105 transition-all duration-300"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Enhanced Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t bg-white/95 backdrop-blur-2xl py-4 animate-in slide-in-from-top duration-300">
              <div className="flex flex-col space-y-4">
                {['Fonctionnalités', 'À propos', 'Tarifs', 'Contact'].map((item, index) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase().replace('à ', '').replace('é', 'e')}`}
                    className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-blue-50 transition-all duration-300 transform hover:translate-x-2"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {item}
                  </a>
                ))}
                <div className="px-4 space-y-2">
                  <Button
                    variant="ghost"
                    onClick={() => setShowLoginModal(true)}
                    className="w-full justify-start hover:bg-blue-50"
                  >
                    Connexion
                  </Button>
                  <Button
                    onClick={() => setShowRegisterModal(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800"
                  >
                    Inscription
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Ultra-Enhanced Hero Section */}
      <section 
        id="hero"
        className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 min-h-screen flex items-center"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center space-y-12">
            {/* Animated Badge */}
            <div 
              className={`transform transition-all duration-1000 ${
                isVisible.hero ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
              }`}
              style={{ transitionDelay: '200ms' }}
            >
              <div className="inline-flex items-center space-x-3 bg-white/60 backdrop-blur-2xl border border-white/30 rounded-full px-8 py-4 shadow-2xl shadow-black/5 hover:shadow-3xl hover:shadow-black/10 transition-all duration-700 group cursor-pointer">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                    🚀 Nouveau : Interface terrain révolutionnaire
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-500 group-hover:translate-x-2 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-pink-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            </div>
            
            {/* Animated Main Title */}
            <div 
              className={`space-y-6 transform transition-all duration-1000 ${
                isVisible.hero ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
              }`}
              style={{ transitionDelay: '400ms' }}
            >
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight">
                <div className="overflow-hidden">
                  <span className="inline-block bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                    Recherche et Rapport
                  </span>
                </div>
                <div className="overflow-hidden mt-2">
                  <span className="inline-block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent animate-pulse">
                    Terrain
                  </span>
                  <span className="inline-block bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                    {' '}Simplifié
                  </span>
                </div>
              </h1>
              
              <p className="text-xl md:text-2xl lg:text-3xl text-gray-600 leading-relaxed max-w-5xl mx-auto font-medium">
                L'application qui révolutionne le travail terrain : recherches géolocalisées, 
                rapports automatiques et gestion centralisée pour les équipes BTP.
              </p>
            </div>

            {/* Enhanced CTA Buttons */}
            <div 
              className={`flex flex-col sm:flex-row items-center justify-center space-y-6 sm:space-y-0 sm:space-x-8 transform transition-all duration-1000 ${
                isVisible.hero ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
              }`}
              style={{ transitionDelay: '1400ms' }}
            >
              <button
                onClick={() => setShowRegisterModal(true)}
                className="group relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white font-bold text-xl px-12 py-6 rounded-3xl shadow-2xl shadow-blue-500/25 transform hover:scale-110 transition-all duration-700 hover:shadow-3xl hover:shadow-blue-500/40 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1500"></div>
                <div className="relative flex items-center space-x-4">
                  <span>Commencer gratuitement</span>
                  <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform duration-500" />
                </div>
              </button>
            </div>

            {/* Animated Trust Indicators */}
            <div 
              className={`flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500 transform transition-all duration-1000 ${
                isVisible.hero ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
              }`}
              style={{ transitionDelay: '1600ms' }}
            >
              {[
                { icon: Check, text: 'Essai gratuit 14 jours', color: 'text-green-500' },
                { icon: Shield, text: 'Sans engagement', color: 'text-blue-500' },
                { icon: Clock, text: 'Support 24/7', color: 'text-purple-500' }
              ].map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-center space-x-3 bg-white/40 backdrop-blur-2xl rounded-2xl px-6 py-3 hover:bg-white/70 transition-all duration-500 transform hover:scale-105"
                  style={{ animationDelay: `${1800 + index * 200}ms` }}
                >
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                  <span className="font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating Elements Animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-10 w-4 h-4 bg-blue-400 rounded-full opacity-20 animate-float"></div>
          <div className="absolute top-1/3 right-20 w-6 h-6 bg-purple-400 rounded-full opacity-20 animate-float-delayed"></div>
          <div className="absolute bottom-1/4 left-1/4 w-3 h-3 bg-green-400 rounded-full opacity-20 animate-float-slow"></div>
          <div className="absolute bottom-1/3 right-1/3 w-5 h-5 bg-pink-400 rounded-full opacity-20 animate-float"></div>
        </div>
      </section>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onRegisterClick={() => {
          setShowLoginModal(false);
          setShowRegisterModal(true);
        }}
      />

      {/* Register Modal */}
      <RegisterModal 
        isOpen={showRegisterModal} 
        onClose={() => setShowRegisterModal(false)}
        onLoginClick={() => {
          setShowRegisterModal(false);
          setShowLoginModal(true);
        }}
      />
    </div>
  );
};

export default EnhancedLandingPage;