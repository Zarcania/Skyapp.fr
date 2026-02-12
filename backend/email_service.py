"""
Service d'envoi d'emails pour SkyApp
Supporte Gmail SMTP et SendGrid
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Service d'envoi d'emails avec support Gmail SMTP et SendGrid"""
    
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("SMTP_FROM_EMAIL", "noreply@skyapp.fr")
        self.from_name = os.getenv("SMTP_FROM_NAME", "SkyApp BTP")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3002")
        self.app_name = os.getenv("APP_NAME", "SkyApp BTP")
        
        # Vérifier si SendGrid est configuré
        self.sendgrid_api_key = os.getenv("SENDGRID_API_KEY")
        self.use_sendgrid = bool(self.sendgrid_api_key)
        
        if not self.smtp_user and not self.use_sendgrid:
            logger.warning("⚠️ Aucune configuration email détectée - Les emails ne seront pas envoyés")
    
    def send_invitation_email(
        self, 
        to_email: str, 
        company_name: str, 
        role: str,
        invited_by: str,
        invitation_token: str
    ) -> bool:
        """
        Envoie un email d'invitation à rejoindre une entreprise
        
        Args:
            to_email: Email du destinataire
            company_name: Nom de l'entreprise
            role: Rôle attribué (TECHNICIEN, BUREAU, ADMIN)
            invited_by: Nom de la personne qui invite
            invitation_token: Token unique pour accepter l'invitation
        
        Returns:
            bool: True si envoyé avec succès, False sinon
        """
        try:
            # URL d'acceptation de l'invitation
            accept_url = f"{self.frontend_url}/accept-invitation?token={invitation_token}"
            
            # Traduction du rôle
            role_names = {
                "TECHNICIEN": "Technicien Terrain",
                "BUREAU": "Personnel Bureau",
                "ADMIN": "Administrateur"
            }
            role_display = role_names.get(role, role)
            
            # Sujet de l'email
            subject = f"Invitation à rejoindre {company_name} sur {self.app_name}"
            
            # Corps de l'email (HTML)
            html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation {self.app_name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #0f172a;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0f172a; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.4);">
                    
                    <!-- Header avec logo -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #000000 0%, #1e293b 100%); padding: 50px 40px; text-align: center; border-bottom: 2px solid #334155;">
                            <img src="{self.frontend_url}/logo.png" 
                                 alt="Skyapp Logo" 
                                 style="width: 80px; height: 80px; margin: 0 auto 20px; display: block; border-radius: 50%; background-color: #ffffff; padding: 10px; box-shadow: 0 4px 12px rgba(255,255,255,0.1);" />
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: 1px;">
                                Skyapp
                            </h1>
                            <p style="margin: 10px 0 0; color: #94a3b8; font-size: 15px; letter-spacing: 0.5px;">
                                Plateforme de Gestion BTP Intelligente
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 50px 40px; background-color: #1e293b;">
                            <h2 style="margin: 0 0 25px; color: #ffffff; font-size: 26px; font-weight: 600;">
                                Vous êtes invité à rejoindre une équipe !
                            </h2>
                            
                            <p style="margin: 0 0 20px; color: #cbd5e1; font-size: 16px; line-height: 1.7;">
                                Bonjour,
                            </p>
                            
                            <p style="margin: 0 0 30px; color: #cbd5e1; font-size: 16px; line-height: 1.7;">
                                <strong style="color: #ffffff;">{invited_by}</strong> vous invite à rejoindre l'entreprise 
                                <strong style="color: #ffffff;">{company_name}</strong> sur Skyapp.
                            </p>
                            
                            <div style="background: linear-gradient(135deg, #334155 0%, #475569 100%); border-left: 4px solid #ffffff; padding: 20px 25px; margin: 30px 0; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                                <p style="margin: 0; color: #f1f5f9; font-size: 15px;">
                                    <strong style="color: #ffffff;">Rôle attribué :</strong> <span style="color: #94a3b8;">{role_display}</span>
                                </p>
                                <p style="margin: 15px 0 0; color: #f1f5f9; font-size: 15px;">
                                    <strong style="color: #ffffff;">Entreprise :</strong> <span style="color: #94a3b8;">{company_name}</span>
                                </p>
                            </div>
                            
                            <p style="margin: 0 0 30px; color: #cbd5e1; font-size: 16px; line-height: 1.7;">
                                Cliquez sur le bouton ci-dessous pour accepter l'invitation et créer votre compte :
                            </p>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{accept_url}" 
                                           style="display: inline-block; background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%); 
                                                  color: #000000; text-decoration: none; padding: 18px 50px; 
                                                  border-radius: 10px; font-size: 17px; font-weight: bold; 
                                                  box-shadow: 0 6px 20px rgba(255,255,255,0.2); 
                                                  transition: transform 0.2s;">
                                            ✨ Accepter l'invitation
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 30px 0 10px; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                                Ou copiez ce lien dans votre navigateur :
                            </p>
                            <p style="margin: 0; padding: 15px; background-color: #0f172a; border-radius: 6px; color: #64748b; font-size: 13px; word-break: break-all; border: 1px solid #334155;">
                                {accept_url}
                            </p>
                            
                            <div style="margin-top: 35px; padding-top: 25px; border-top: 1px solid #334155;">
                                <p style="margin: 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                                    ⚠️ <strong style="color: #cbd5e1;">Note importante :</strong> Cette invitation expire dans 7 jours.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #0f172a; padding: 30px 40px; text-align: center; border-top: 2px solid #334155;">
                            <p style="margin: 0 0 12px; color: #64748b; font-size: 13px;">
                                Cet email a été envoyé par <strong style="color: #94a3b8;">Skyapp BTP</strong>
                            </p>
                            <p style="margin: 0; color: #475569; font-size: 12px; line-height: 1.5;">
                                Si vous n'êtes pas concerné par cette invitation, vous pouvez ignorer cet email.
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            """
            
            # Corps de l'email (texte brut pour clients email basiques)
            text_body = f"""
{self.app_name} - Invitation à rejoindre une équipe

Bonjour,

{invited_by} vous invite à rejoindre l'entreprise {company_name} sur {self.app_name}.

Rôle attribué : {role_display}
Entreprise : {company_name}

Pour accepter l'invitation et créer votre compte, cliquez sur ce lien :
{accept_url}

Note : Cette invitation expire dans 7 jours.

Si vous n'êtes pas concerné par cette invitation, vous pouvez ignorer cet email.

---
{self.app_name}
Plateforme de Gestion BTP Intelligente
            """
            
            # Envoi de l'email
            if self.use_sendgrid:
                return self._send_via_sendgrid(to_email, subject, html_body, text_body)
            else:
                return self._send_via_smtp(to_email, subject, html_body, text_body)
                
        except Exception as e:
            logger.error(f"❌ Erreur envoi email invitation: {str(e)}")
            return False
    
    def _send_via_smtp(
        self, 
        to_email: str, 
        subject: str, 
        html_body: str, 
        text_body: str
    ) -> bool:
        """Envoie un email via SMTP (Gmail)"""
        try:
            if not self.smtp_user or not self.smtp_password:
                logger.warning("⚠️ SMTP non configuré - Email non envoyé")
                return False
            
            # Créer le message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            
            # Ajouter les parties texte et HTML
            part1 = MIMEText(text_body, 'plain', 'utf-8')
            part2 = MIMEText(html_body, 'html', 'utf-8')
            msg.attach(part1)
            msg.attach(part2)
            
            # Connexion au serveur SMTP
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            server.starttls()
            server.login(self.smtp_user, self.smtp_password)
            
            # Envoi
            server.send_message(msg)
            server.quit()
            
            logger.info(f"✅ Email d'invitation envoyé à {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur SMTP: {str(e)}")
            return False
    
    def _send_via_sendgrid(
        self, 
        to_email: str, 
        subject: str, 
        html_body: str, 
        text_body: str
    ) -> bool:
        """Envoie un email via SendGrid API"""
        try:
            import requests
            
            url = "https://api.sendgrid.com/v3/mail/send"
            
            payload = {
                "personalizations": [{
                    "to": [{"email": to_email}],
                    "subject": subject
                }],
                "from": {
                    "email": self.from_email,
                    "name": self.from_name
                },
                "content": [
                    {"type": "text/plain", "value": text_body},
                    {"type": "text/html", "value": html_body}
                ]
            }
            
            headers = {
                "Authorization": f"Bearer {self.sendgrid_api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(url, json=payload, headers=headers)
            
            if response.status_code == 202:
                logger.info(f"✅ Email d'invitation envoyé à {to_email} via SendGrid")
                return True
            else:
                logger.error(f"❌ Erreur SendGrid: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erreur SendGrid: {str(e)}")
            return False


# Instance globale du service email
email_service = EmailService()
