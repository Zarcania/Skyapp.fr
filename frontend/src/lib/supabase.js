// Configuration Supabase pour React
// src/lib/supabase.js

import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

const API = process.env.REACT_APP_API_URL || process.env.REACT_APP_API_BASE_URL || `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'}/api`

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Types (JSDoc) pour l'éditeur
/** @typedef {Object} User 
 * @property {string} id
 * @property {string} email
 * @property {string} nom
 * @property {string} prenom
 * @property {'ADMIN'|'BUREAU'|'TECHNICIEN'} role
 * @property {string} company_id
 * @property {boolean} actif
 * @property {string} created_at
 * @property {string} updated_at
 */

/** @typedef {Object} Search 
 * @property {string} id
 * @property {string} user_id
 * @property {string} company_id
 * @property {string} location
 * @property {string} description
 * @property {string=} observations
 * @property {number=} latitude
 * @property {number=} longitude
 * @property {any[]} photos
 * @property {'ACTIVE'|'SHARED'|'SHARED_TO_BUREAU'|'PROCESSED'|'ARCHIVED'} status
 * @property {string} timestamp
 * @property {string} created_at
 * @property {string} updated_at
 */

// Fonctions utilitaires d'authentification
export const auth = {
  // Connexion
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  // Inscription
  signUp: async (email, password, userData) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    return { data, error }
  },

  // Déconnexion
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Récupérer l'utilisateur actuel
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Écouter les changements d'authentification
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Fonctions pour les données
export const api = {
  // Recherches
  searches: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('searches')
        .select('*')
        .order('created_at', { ascending: false })
      return { data, error }
    },

  create: async (search) => {
      const { data, error } = await supabase
        .from('searches')
        .insert([search])
        .select()
      return { data, error }
    },

  update: async (id, updates) => {
      const { data, error } = await supabase
        .from('searches')
        .update(updates)
        .eq('id', id)
        .select()
      return { data, error }
    },

    delete: async (id) => {
      const { error } = await supabase
        .from('searches')
        .delete()
        .eq('id', id)
      return { error }
    }
  },

  // Clients
  clients: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('nom', { ascending: true })
      return { data, error }
    },

  create: async (client) => {
      const { data, error } = await supabase
        .from('clients')
        .insert([client])
        .select()
      return { data, error }
    },

  update: async (id, updates) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
      return { data, error }
    },

    delete: async (id) => {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
      return { error }
    }
  },

  // Devis
  quotes: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          clients (
            nom,
            email
          )
        `)
        .order('created_at', { ascending: false })
      return { data, error }
    },

  create: async (quote) => {
      const { data, error } = await supabase
        .from('quotes')
        .insert([quote])
        .select()
      return { data, error }
    }
  },

  // Chantiers
  worksites: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('worksites')
        .select(`
          *,
          clients (
            nom,
            email
          )
        `)
        .order('created_at', { ascending: false })
      return { data, error }
    },

  create: async (worksite) => {
      const { data, error } = await supabase
        .from('worksites')
        .insert([worksite])
        .select()
      return { data, error }
    }
  },

  // Matériaux (via backend API pour éviter les problèmes RLS)
  materials: {
    getAll: async () => {
      try {
        const r = await axios.get(`${API}/materials`)
        return { data: r.data.data || r.data, error: null }
      } catch (e) { return { data: null, error: e.response?.data?.detail || e.message } }
    },

    create: async (material) => {
      try {
        const r = await axios.post(`${API}/materials`, material)
        return { data: r.data.data || r.data, error: null }
      } catch (e) { return { data: null, error: e.response?.data?.detail || e.message } }
    },

    update: async (id, updates) => {
      try {
        const r = await axios.put(`${API}/materials/${id}`, updates)
        return { data: r.data.data || r.data, error: null }
      } catch (e) { return { data: null, error: e.response?.data?.detail || e.message } }
    },

    remove: async (id) => {
      try {
        await axios.delete(`${API}/materials/${id}`)
        return { error: null }
      } catch (e) { return { error: e.response?.data?.detail || e.message } }
    },

    scanQR: async (qrCode) => {
      try {
        const r = await axios.get(`${API}/materials/qr/${encodeURIComponent(qrCode)}`)
        return { data: r.data.data || r.data, error: null }
      } catch (e) { return { data: null, error: e.response?.data?.detail || e.message } }
    },

    // Historique de maintenance
    getMaintenanceLogs: async (materialId) => {
      try {
        const r = await axios.get(`${API}/materials/${materialId}/maintenance-logs`)
        return { data: r.data.data || r.data, error: null }
      } catch (e) { return { data: null, error: e.response?.data?.detail || e.message } }
    },

    addMaintenanceLog: async (log) => {
      try {
        const r = await axios.post(`${API}/materials/${log.material_id}/maintenance-logs`, log)
        return { data: r.data.data || r.data, error: null }
      } catch (e) { return { data: null, error: e.response?.data?.detail || e.message } }
    },

    deleteMaintenanceLog: async (id) => {
      try {
        await axios.delete(`${API}/maintenance-logs/${id}`)
        return { error: null }
      } catch (e) { return { error: e.response?.data?.detail || e.message } }
    }
  },

  // Inventaire (Emprunt/Retour de matériel)
  inventory: {
    getMyCheckouts: async () => {
      try {
        const r = await axios.get(`${API}/inventory/my-checkouts`)
        return r.data.data || []
      } catch (e) { throw e }
    },

    getHistory: async () => {
      try {
        const r = await axios.get(`${API}/inventory/history`)
        return r.data.data || []
      } catch (e) { throw e }
    },

    getAvailable: async () => {
      try {
        const r = await axios.get(`${API}/inventory/available`)
        return r.data.data || []
      } catch (e) { throw e }
    },

    checkout: async (data) => {
      try {
        const r = await axios.post(`${API}/inventory/checkout`, data)
        return r.data
      } catch (e) { throw e }
    },

    checkin: async (checkoutId, data) => {
      try {
        const r = await axios.post(`${API}/inventory/checkin/${checkoutId}`, data)
        return r.data
      } catch (e) { throw e }
    },

    getCompanyCheckouts: async () => {
      try {
        const r = await axios.get(`${API}/inventory/company-checkouts`)
        return r.data.data || []
      } catch (e) { throw e }
    }
  },

  // Utilisateurs
  users: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          companies (
            name
          )
        `)
        .order('nom', { ascending: true })
      return { data, error }
    },

    getCurrent: async () => {
      // Utiliser le user stocké en localStorage (rempli au login via backend)
      const stored = localStorage.getItem('user')
      if (stored) {
        try { return { data: JSON.parse(stored), error: null } } catch {}
      }
      // Fallback: essayer via Supabase Auth si session existe
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { data: null, error: 'Not authenticated' }
        const { data, error } = await supabase
          .from('users')
          .select('*, companies(name)')
          .eq('id', user.id)
          .single()
        return { data, error }
      } catch (e) {
        return { data: null, error: e.message || 'Not authenticated' }
      }
    }
  }
}

// Hook personnalisé pour l'authentification
export const useAuth = () => {
  const [user, setUser] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [session, setSession] = React.useState(null)

  React.useEffect(() => {
    // Récupérer la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return {
    user: session?.user ?? null,
    session,
    loading,
    signIn: auth.signIn,
    signUp: auth.signUp,
    signOut: auth.signOut
  }
}

// Hook pour les données en temps réel
export const useRealtime = (table, callback) => {
  React.useEffect(() => {
    const subscription = supabase
      .channel(`public:${table}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: table },
        callback
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [table, callback])
}

export default supabase