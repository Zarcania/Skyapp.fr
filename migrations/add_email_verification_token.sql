-- Migration: Ajouter la colonne email_verification_token à la table users
-- Pour le système de vérification email custom (inscription)
-- Exécuter dans Supabase Dashboard > SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT;

-- Index pour rechercher rapidement par token
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token 
ON users(email_verification_token) 
WHERE email_verification_token IS NOT NULL;
