import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './ChatInterface.css';

const API = process.env.REACT_APP_API_BASE_URL || `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'}/api`;

const ChatInterface = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Bonjour ! Je suis votre assistant IA SkyApp.\n\nJe peux vous aider à :\n• 🎙️ Rechercher avec la voix : "recherche moi le devis Dupont"\n• Générer des devis automatiquement\n• Analyser vos rapports\n• Optimiser votre planning\n\nComment puis-je vous aider aujourd\'hui ?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenCount, setTokenCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll vers le bas
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus sur l'input à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // 🎙️ Initialiser la reconnaissance vocale (Web Speech API)
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'fr-FR';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsRecording(false);
        
        // Auto-envoyer si la phrase commence par "recherche"
        if (transcript.toLowerCase().startsWith('recherche')) {
          setTimeout(() => {
            const form = document.querySelector('.chat-input-form');
            if (form) form.requestSubmit();
          }, 500);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Erreur reconnaissance vocale:', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Démarrer/arrêter l'enregistrement vocal
  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      alert('❌ La reconnaissance vocale n\'est pas supportée par votre navigateur.\nUtilisez Chrome ou Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  // Envoyer un message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Appel à l'API IA
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/ai/query`,
        { query: inputValue },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const aiMessage = {
        role: 'assistant',
        content: response.data.response?.choices?.[0]?.message?.content || 'Désolé, je n\'ai pas pu traiter votre demande.',
        timestamp: new Date(),
        tokens: response.data.tokens
      };

      setMessages(prev => [...prev, aiMessage]);
      setTokenCount(prev => prev + (response.data.tokens || 0));

    } catch (error) {
      console.error('Erreur IA:', error);
      
      const errorMessage = {
        role: 'assistant',
        content: '❌ Désolé, une erreur s\'est produite. Veuillez réessayer.\n\n' + 
                 (error.response?.data?.detail || error.message),
        timestamp: new Date(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Exemples de questions
  const exampleQueries = [
    "Devis Dupont > 5000€",
    "Générer un devis pour rénovation cuisine",
    "Chantiers en retard",
    "Analyser mes rapports"
  ];

  const handleExampleClick = (query) => {
    setInputValue(query);
    inputRef.current?.focus();
  };

  // Formater l'heure
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`chat-interface ${isOpen ? 'open' : ''}`}>
      {/* En-tête */}
      <div className="chat-header">
        <div className="chat-header-content">
          <div className="chat-header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div>
            <h3>Assistant IA SkyApp</h3>
            <p>Premier Logiciel BTP Intelligent</p>
          </div>
        </div>
        <button className="chat-close-btn" onClick={onClose} aria-label="Fermer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Zone de messages */}
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`chat-message ${message.role} ${message.isError ? 'error' : ''}`}
          >
            <div className="message-avatar">
              {message.role === 'assistant' ? '🤖' : '👤'}
            </div>
            <div className="message-content">
              <div className="message-text">
                {message.content}
              </div>
              <div className="message-meta">
                <span className="message-time">{formatTime(message.timestamp)}</span>
                {message.tokens && (
                  <span className="message-tokens">{message.tokens} tokens</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="chat-message assistant loading">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Exemples de questions (si vide) */}
      {messages.length === 1 && (
        <div className="chat-examples">
          <p className="examples-title">Essayez par exemple :</p>
          <div className="examples-grid">
            {exampleQueries.map((query, index) => (
              <button
                key={index}
                className="example-btn"
                onClick={() => handleExampleClick(query)}
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Zone de saisie */}
      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <div className="chat-input-wrapper">
          {/* 🎙️ Bouton micro pour IA vocale */}
          <button
            type="button"
            className={`voice-btn ${isRecording ? 'recording' : ''}`}
            onClick={toggleVoiceRecording}
            disabled={isLoading}
            aria-label={isRecording ? "Arrêter l'enregistrement" : "Commande vocale"}
            title={isRecording ? "🎙️ Enregistrement en cours..." : "🎙️ Utiliser la voix"}
          >
            {isRecording ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2"></rect>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            )}
          </button>

          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder={isRecording ? "🎙️ Parlez maintenant... (ex: recherche moi le devis Dupont)" : "Tapez ou 🎙️ parlez..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading || isRecording}
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!inputValue.trim() || isLoading}
            aria-label="Envoyer"
          >
            {isLoading ? (
              <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            )}
          </button>
        </div>
        
        {/* Compteur de tokens */}
        {tokenCount > 0 && (
          <div className="chat-stats">
            <span>Total: {tokenCount.toLocaleString()} tokens</span>
            <span>≈ {(tokenCount * 0.15 / 1000000).toFixed(4)}€</span>
          </div>
        )}
      </form>
    </div>
  );
};

export default ChatInterface;
