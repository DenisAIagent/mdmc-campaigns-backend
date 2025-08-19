"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("@/config/env");
const logger_1 = require("@/utils/logger");
const errors_1 = require("@/utils/errors");
class EmailService {
    transporter;
    constructor() {
        this.transporter = nodemailer_1.default.createTransport({
            host: env_1.env.SMTP_HOST,
            port: env_1.env.SMTP_PORT,
            secure: env_1.env.SMTP_SECURE,
            auth: env_1.env.SMTP_USER && env_1.env.SMTP_PASS ? {
                user: env_1.env.SMTP_USER,
                pass: env_1.env.SMTP_PASS,
            } : undefined,
            tls: {
                rejectUnauthorized: false, // For development
            },
        });
        // Verify connection on startup
        this.verifyConnection();
    }
    async verifyConnection() {
        try {
            await this.transporter.verify();
            logger_1.logger.info('✅ Email service connected successfully');
        }
        catch (error) {
            logger_1.logger.error('❌ Email service connection failed:', error);
        }
    }
    async sendWelcomeEmail(data) {
        const template = this.getWelcomeTemplate(data);
        await this.sendEmail({
            to: data.user.email,
            subject: template.subject,
            html: template.html,
            text: template.text,
        });
    }
    async sendLinkRequestEmail(data) {
        const template = this.getLinkRequestTemplate(data);
        await this.sendEmail({
            to: data.user.email,
            subject: template.subject,
            html: template.html,
            text: template.text,
        });
    }
    async sendCampaignLaunchedEmail(data) {
        const template = this.getCampaignLaunchedTemplate(data);
        await this.sendEmail({
            to: data.user.email,
            subject: template.subject,
            html: template.html,
            text: template.text,
        });
    }
    async sendPaymentConfirmationEmail(data) {
        const template = this.getPaymentConfirmationTemplate(data);
        await this.sendEmail({
            to: data.user.email,
            subject: template.subject,
            html: template.html,
            text: template.text,
        });
    }
    async sendPasswordResetEmail(data) {
        const template = this.getPasswordResetTemplate(data);
        await this.sendEmail({
            to: data.user.email,
            subject: template.subject,
            html: template.html,
            text: template.text,
        });
    }
    async sendEmail(options) {
        try {
            const mailOptions = {
                from: env_1.env.EMAIL_FROM,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
                attachments: options.attachments,
            };
            const result = await this.transporter.sendMail(mailOptions);
            logger_1.logger.info('Email sent successfully', {
                to: options.to,
                subject: options.subject,
                messageId: result.messageId,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to send email:', error);
            throw new errors_1.ExternalServiceError('Email', 'Failed to send email', error);
        }
    }
    // Template generators
    getWelcomeTemplate(data) {
        const { user } = data;
        const dashboardUrl = `${env_1.env.API_BASE_URL}/dashboard`;
        return {
            subject: 'Bienvenue sur MDMC Music Ads ! 🎵',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Bienvenue sur MDMC Music Ads</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0ea5e9, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
            .highlight { background: #fef3c7; padding: 2px 6px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎵 Bienvenue sur MDMC Music Ads !</h1>
            <p>Votre plateforme self-serve pour les campagnes YouTube Ads</p>
          </div>
          
          <div class="content">
            <h2>Bonjour ${user.firstName || 'Artiste'} !</h2>
            
            <p>Nous sommes ravis de vous accueillir sur MDMC Music Ads, la première plateforme française dédiée aux campagnes YouTube Ads pour artistes et labels musicaux.</p>
            
            <h3>🚀 Pour commencer :</h3>
            <ol>
              <li><strong>Connectez votre compte Google Ads</strong> - Liaison sécurisée via notre MCC</li>
              <li><strong>Créez votre première campagne</strong> - Configuration simple en 3 étapes</li>
              <li><strong>Lancez et suivez vos résultats</strong> - Dashboard temps réel avec KPIs détaillés</li>
            </ol>
            
            <div style="text-align: center;">
              <a href="${dashboardUrl}" class="button">Accéder à mon dashboard</a>
            </div>
            
            <h3>📋 Ce qui vous attend :</h3>
            <ul>
              <li>Campagnes de <span class="highlight">30 jours</span> optimisées pour la musique</li>
              <li>Ciblage précis par pays et audiences similaires</li>
              <li>Tarif fixe <span class="highlight">200€ HT par campagne</span></li>
              <li>Support dédié avec votre Account Manager</li>
              <li>Rapports détaillés et insights exclusifs</li>
            </ul>
            
            <p><strong>Besoin d'aide ?</strong> Notre équipe est là pour vous accompagner :</p>
            <ul>
              <li>📧 Email : <a href="mailto:support@mdmc.fr">support@mdmc.fr</a></li>
              <li>📚 Documentation : <a href="https://docs.mdmc.fr">docs.mdmc.fr</a></li>
              <li>💬 Chat en direct depuis votre dashboard</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>MDMC Music Ads - Propulsez votre musique sur YouTube</p>
            <p><a href="https://mdmc.fr">mdmc.fr</a> • <a href="https://mdmc.fr/unsubscribe">Se désabonner</a></p>
          </div>
        </body>
        </html>
      `,
            text: `
        Bienvenue sur MDMC Music Ads !
        
        Bonjour ${user.firstName || 'Artiste'} !
        
        Nous sommes ravis de vous accueillir sur MDMC Music Ads, la première plateforme française dédiée aux campagnes YouTube Ads pour artistes et labels musicaux.
        
        Pour commencer :
        1. Connectez votre compte Google Ads - Liaison sécurisée via notre MCC
        2. Créez votre première campagne - Configuration simple en 3 étapes  
        3. Lancez et suivez vos résultats - Dashboard temps réel avec KPIs détaillés
        
        Accédez à votre dashboard : ${dashboardUrl}
        
        Ce qui vous attend :
        • Campagnes de 30 jours optimisées pour la musique
        • Ciblage précis par pays et audiences similaires
        • Tarif fixe 200€ HT par campagne
        • Support dédié avec votre Account Manager
        • Rapports détaillés et insights exclusifs
        
        Besoin d'aide ?
        • Email : support@mdmc.fr
        • Documentation : docs.mdmc.fr
        • Chat en direct depuis votre dashboard
        
        MDMC Music Ads - Propulsez votre musique sur YouTube
        mdmc.fr
      `
        };
    }
    getLinkRequestTemplate(data) {
        const { user, customerId } = data;
        const maskedCustomerId = `${customerId.slice(0, 3)}-${customerId.slice(3, 6)}-${customerId.slice(6)}`;
        return {
            subject: 'Demande de liaison Google Ads envoyée ✅',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Demande de liaison Google Ads</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .status-box { background: #ecfccb; border: 1px solid #84cc16; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .steps { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>✅ Demande de liaison envoyée</h1>
            <p>Compte Google Ads ${maskedCustomerId}</p>
          </div>
          
          <div class="content">
            <h2>Bonjour ${user.firstName || 'Artiste'} !</h2>
            
            <div class="status-box">
              <p><strong>🟡 Statut :</strong> En attente d'acceptation</p>
              <p>Votre demande de liaison a été envoyée avec succès au compte Google Ads <strong>${maskedCustomerId}</strong>.</p>
            </div>
            
            <h3>📋 Prochaines étapes :</h3>
            <div class="steps">
              <ol>
                <li><strong>Connectez-vous à votre compte Google Ads</strong> (ads.google.com)</li>
                <li><strong>Allez dans "Outils et paramètres" → "Accès au compte"</strong></li>
                <li><strong>Acceptez la demande de liaison de "MDMC Music Ads"</strong></li>
                <li><strong>Revenez sur votre dashboard MDMC</strong> pour vérifier le statut</li>
              </ol>
            </div>
            
            <p><strong>⏱️ Délai d'acceptation :</strong> Généralement sous 24h. Vous recevrez un email de confirmation une fois la liaison acceptée.</p>
            
            <p><strong>❓ Problème avec la liaison ?</strong></p>
            <ul>
              <li>Vérifiez que vous êtes administrateur du compte Google Ads</li>
              <li>Assurez-vous que le compte est actif et vérifié</li>
              <li>Contactez notre support : <a href="mailto:support@mdmc.fr">support@mdmc.fr</a></li>
            </ul>
          </div>
          
          <div class="footer">
            <p>MDMC Music Ads - Support technique</p>
            <p><a href="https://docs.mdmc.fr/google-ads-link">Guide de liaison Google Ads</a></p>
          </div>
        </body>
        </html>
      `,
            text: `
        Demande de liaison Google Ads envoyée
        
        Bonjour ${user.firstName || 'Artiste'} !
        
        Statut : En attente d'acceptation
        Votre demande de liaison a été envoyée avec succès au compte Google Ads ${maskedCustomerId}.
        
        Prochaines étapes :
        1. Connectez-vous à votre compte Google Ads (ads.google.com)
        2. Allez dans "Outils et paramètres" → "Accès au compte"  
        3. Acceptez la demande de liaison de "MDMC Music Ads"
        4. Revenez sur votre dashboard MDMC pour vérifier le statut
        
        Délai d'acceptation : Généralement sous 24h. Vous recevrez un email de confirmation une fois la liaison acceptée.
        
        Problème avec la liaison ?
        • Vérifiez que vous êtes administrateur du compte Google Ads
        • Assurez-vous que le compte est actif et vérifié  
        • Contactez notre support : support@mdmc.fr
        
        MDMC Music Ads - Support technique
        Guide de liaison : https://docs.mdmc.fr/google-ads-link
      `
        };
    }
    getCampaignLaunchedTemplate(data) {
        const { user, campaign } = data;
        const dashboardUrl = `${env_1.env.API_BASE_URL}/dashboard/campaigns/${campaign.id}`;
        return {
            subject: `🚀 Campagne "${campaign.clipTitle}" lancée avec succès !`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Campagne lancée</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .campaign-box { background: white; border: 2px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .timeline { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🚀 Campagne lancée !</h1>
            <p>Votre clip est maintenant diffusé sur YouTube</p>
          </div>
          
          <div class="content">
            <h2>Félicitations ${user.firstName || 'Artiste'} !</h2>
            
            <div class="campaign-box">
              <h3>📹 ${campaign.clipTitle}</h3>
              <p><strong>Pays ciblés :</strong> ${campaign.countries.join(', ')}</p>
              <p><strong>Durée :</strong> 30 jours</p>
              <p><strong>Statut :</strong> ✅ En cours</p>
            </div>
            
            <p>Votre campagne YouTube Ads a été lancée avec succès ! Vos annonces sont maintenant diffusées auprès de votre audience cible.</p>
            
            <div class="timeline">
              <h3>📅 Calendrier des résultats :</h3>
              <ul>
                <li><strong>J+1 à J+3 :</strong> Premières impressions et vues</li>
                <li><strong>J+7 :</strong> Tendances et optimisations automatiques</li>
                <li><strong>J+10 :</strong> Résultats stabilisés - Rapport intermédiaire</li>
                <li><strong>J+30 :</strong> Rapport final complet</li>
              </ul>
            </div>
            
            <div style="text-align: center;">
              <a href="${dashboardUrl}" class="button">Suivre ma campagne</a>
            </div>
            
            <h3>📊 Suivi en temps réel :</h3>
            <ul>
              <li>Vues et impressions quotidiennes</li>
              <li>Coût par vue (CPV) et optimisations</li>
              <li>Nouveaux abonnés générés</li>
              <li>Interactions (likes, commentaires, partages)</li>
            </ul>
            
            <p><strong>💡 Conseil :</strong> Les performances se stabilisent généralement vers J+10. Nous vous tiendrons informé des optimisations en cours.</p>
          </div>
          
          <div class="footer">
            <p>MDMC Music Ads - Votre Account Manager</p>
            <p>Questions ? <a href="mailto:support@mdmc.fr">support@mdmc.fr</a></p>
          </div>
        </body>
        </html>
      `,
            text: `
        Campagne lancée !
        
        Félicitations ${user.firstName || 'Artiste'} !
        
        Votre campagne YouTube Ads "${campaign.clipTitle}" a été lancée avec succès !
        
        Détails de la campagne :
        • Clip : ${campaign.clipTitle}
        • Pays ciblés : ${campaign.countries.join(', ')}
        • Durée : 30 jours
        • Statut : En cours
        
        Calendrier des résultats :
        • J+1 à J+3 : Premières impressions et vues
        • J+7 : Tendances et optimisations automatiques
        • J+10 : Résultats stabilisés - Rapport intermédiaire
        • J+30 : Rapport final complet
        
        Suivez votre campagne : ${dashboardUrl}
        
        Suivi en temps réel :
        • Vues et impressions quotidiennes
        • Coût par vue (CPV) et optimisations
        • Nouveaux abonnés générés
        • Interactions (likes, commentaires, partages)
        
        Conseil : Les performances se stabilisent généralement vers J+10. Nous vous tiendrons informé des optimisations en cours.
        
        MDMC Music Ads - Votre Account Manager
        Questions ? support@mdmc.fr
      `
        };
    }
    getPaymentConfirmationTemplate(data) {
        const { user, payment, invoiceUrl } = data;
        const amount = (payment.totalCents / 100).toFixed(2);
        return {
            subject: '✅ Paiement confirmé - Facture MDMC Music Ads',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Confirmation de paiement</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .payment-box { background: white; border: 2px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 5px; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>✅ Paiement confirmé</h1>
            <p>Merci pour votre confiance !</p>
          </div>
          
          <div class="content">
            <h2>Bonjour ${user.firstName || 'Artiste'} !</h2>
            
            <p>Nous avons bien reçu votre paiement. Votre campagne va être lancée dans les plus brefs délais par notre équipe.</p>
            
            <div class="payment-box">
              <h3>💳 Détails du paiement</h3>
              <p><strong>Montant :</strong> ${amount} €</p>
              <p><strong>Date :</strong> ${new Date(payment.paidAt || payment.createdAt).toLocaleDateString('fr-FR')}</p>
              <p><strong>Statut :</strong> ✅ Payé</p>
              ${payment.invoiceNumber ? `<p><strong>Facture :</strong> ${payment.invoiceNumber}</p>` : ''}
            </div>
            
            <h3>🚀 Prochaines étapes :</h3>
            <ol>
              <li><strong>Validation technique</strong> - Vérification de votre campagne (sous 24h)</li>
              <li><strong>Lancement</strong> - Mise en ligne de vos annonces</li>
              <li><strong>Suivi</strong> - Monitoring et optimisations quotidiennes</li>
              <li><strong>Reporting</strong> - Rapports réguliers sur les performances</li>
            </ol>
            
            <div style="text-align: center;">
              <a href="${env_1.env.API_BASE_URL}/dashboard" class="button">Mon Dashboard</a>
              ${invoiceUrl ? `<a href="${invoiceUrl}" class="button">Télécharger la facture</a>` : ''}
            </div>
            
            <p><strong>📞 Besoin d'aide ?</strong> Notre équipe est disponible pour répondre à toutes vos questions :</p>
            <ul>
              <li>Email : <a href="mailto:support@mdmc.fr">support@mdmc.fr</a></li>
              <li>Chat : Depuis votre dashboard</li>
              <li>Documentation : <a href="https://docs.mdmc.fr">docs.mdmc.fr</a></li>
            </ul>
          </div>
          
          <div class="footer">
            <p>MDMC Music Ads - Équipe Facturation</p>
            <p>Facture émise depuis l'Estonie • TVA FR13879145512</p>
          </div>
        </body>
        </html>
      `,
            text: `
        Paiement confirmé
        
        Bonjour ${user.firstName || 'Artiste'} !
        
        Nous avons bien reçu votre paiement. Votre campagne va être lancée dans les plus brefs délais par notre équipe.
        
        Détails du paiement :
        • Montant : ${amount} €
        • Date : ${new Date(payment.paidAt || payment.createdAt).toLocaleDateString('fr-FR')}
        • Statut : Payé
        ${payment.invoiceNumber ? `• Facture : ${payment.invoiceNumber}` : ''}
        
        Prochaines étapes :
        1. Validation technique - Vérification de votre campagne (sous 24h)
        2. Lancement - Mise en ligne de vos annonces
        3. Suivi - Monitoring et optimisations quotidiennes
        4. Reporting - Rapports réguliers sur les performances
        
        Dashboard : ${env_1.env.API_BASE_URL}/dashboard
        ${invoiceUrl ? `Facture : ${invoiceUrl}` : ''}
        
        Besoin d'aide ?
        • Email : support@mdmc.fr
        • Chat : Depuis votre dashboard
        • Documentation : docs.mdmc.fr
        
        MDMC Music Ads - Équipe Facturation
        Facture émise depuis l'Estonie • TVA FR13879145512
      `
        };
    }
    getPasswordResetTemplate(data) {
        const { user, resetToken } = data;
        const resetUrl = `${env_1.env.API_BASE_URL}/auth/reset-password?token=${resetToken}`;
        return {
            subject: '🔒 Réinitialisation de votre mot de passe MDMC',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Réinitialisation mot de passe</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .warning { background: #fef2f2; border: 1px solid #f87171; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔒 Réinitialisation de mot de passe</h1>
            <p>Demande de changement de mot de passe</p>
          </div>
          
          <div class="content">
            <h2>Bonjour ${user.firstName || 'Utilisateur'} !</h2>
            
            <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte MDMC Music Ads.</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
            </div>
            
            <div class="warning">
              <p><strong>⚠️ Important :</strong></p>
              <ul>
                <li>Ce lien est valide pendant <strong>1 heure</strong> seulement</li>
                <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
                <li>Votre mot de passe actuel reste inchangé tant que vous n'en définissez pas un nouveau</li>
              </ul>
            </div>
            
            <p><strong>🔗 Lien de réinitialisation :</strong><br>
            Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
            <a href="${resetUrl}">${resetUrl}</a></p>
            
            <p><strong>🛡️ Sécurité :</strong> Pour votre sécurité, nous recommandons de :</p>
            <ul>
              <li>Choisir un mot de passe fort (12 caractères minimum)</li>
              <li>Utiliser une combinaison de lettres, chiffres et symboles</li>
              <li>Ne pas réutiliser d'anciens mots de passe</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>MDMC Music Ads - Équipe Sécurité</p>
            <p>Si vous avez des problèmes, contactez-nous : <a href="mailto:support@mdmc.fr">support@mdmc.fr</a></p>
          </div>
        </body>
        </html>
      `,
            text: `
        Réinitialisation de mot de passe
        
        Bonjour ${user.firstName || 'Utilisateur'} !
        
        Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte MDMC Music Ads.
        
        Réinitialisez votre mot de passe : ${resetUrl}
        
        Important :
        • Ce lien est valide pendant 1 heure seulement
        • Si vous n'avez pas demandé cette réinitialisation, ignorez cet email
        • Votre mot de passe actuel reste inchangé tant que vous n'en définissez pas un nouveau
        
        Sécurité : Pour votre sécurité, nous recommandons de :
        • Choisir un mot de passe fort (12 caractères minimum)
        • Utiliser une combinaison de lettres, chiffres et symboles
        • Ne pas réutiliser d'anciens mots de passe
        
        MDMC Music Ads - Équipe Sécurité
        Problèmes ? support@mdmc.fr
      `
        };
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
//# sourceMappingURL=emailService.js.map