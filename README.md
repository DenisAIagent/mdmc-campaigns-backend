# MDMC Music Ads - Backend API

Backend API sécurisé pour la plateforme MDMC Music Ads, permettant aux artistes indépendants de créer et gérer leurs campagnes publicitaires YouTube.

## 🚀 Technologies

- **Node.js** + **Express** + **TypeScript**
- **PostgreSQL** avec **Prisma ORM**
- **JWT** + **bcrypt** pour l'authentification
- **Stripe** pour les paiements
- **Redis** pour le cache
- **Winston** pour le logging
- **Zod** pour la validation
- **Docker** pour le déploiement

## 🔧 Installation

1. **Cloner et installer les dépendances**
```bash
cd backend
npm install
```

2. **Configurer les variables d'environnement**
```bash
cp .env.example .env
# Configurer toutes les variables dans .env
```

3. **Configurer la base de données**
```bash
# Générer le client Prisma
npm run generate

# Lancer les migrations
npm run migrate

# (Optionnel) Seed initial
npm run seed
```

4. **Démarrer le serveur de développement**
```bash
npm run dev
```

## 📋 Variables d'environnement requises

### Application
- `NODE_ENV` - Environnement (development/production)
- `API_PORT` - Port du serveur (défaut: 3001)
- `API_BASE_URL` - URL de base de l'API

### Base de données
- `DATABASE_URL` - URL PostgreSQL
- `REDIS_URL` - URL Redis

### Sécurité
- `JWT_SECRET` - Clé secrète JWT (min 32 caractères)
- `JWT_REFRESH_SECRET` - Clé secrète refresh token
- `BCRYPT_ROUNDS` - Rounds bcrypt (défaut: 12)

### Google APIs
- `GOOGLE_CLIENT_ID` - ID client OAuth Google
- `GOOGLE_CLIENT_SECRET` - Secret client OAuth Google
- `MCC_CUSTOMER_ID` - ID compte Google Ads MCC
- `GOOGLE_ADS_DEVELOPER_TOKEN` - Token développeur Google Ads

### Stripe
- `STRIPE_SECRET_KEY` - Clé secrète Stripe
- `STRIPE_WEBHOOK_SECRET` - Secret webhook Stripe

### Email (SMTP)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

## 🛡️ Sécurité implémentée

### Authentification & Autorisation
- JWT avec refresh token rotation
- Hash des mots de passe avec bcrypt (cost 12+)
- Middleware d'authentification sur toutes les routes protégées
- Gestion des rôles utilisateur (CLIENT, ADMIN, ACCOUNT_MANAGER)

### Protection des données
- Validation Zod sur toutes les entrées
- Protection contre les injections SQL (Prisma)
- Rate limiting par endpoint
- CORS configuré pour les domaines autorisés uniquement
- Helmet avec CSP (Content Security Policy)

### Logging & Monitoring
- Logging Winston de toutes les actions sensibles
- Audit trail complet dans la base de données
- Health check endpoint
- Monitoring des erreurs

## 📡 Endpoints API

### Authentification
- `POST /auth/signup` - Création de compte
- `POST /auth/login` - Connexion
- `POST /auth/logout` - Déconnexion
- `POST /auth/refresh` - Rafraîchissement de token
- `GET /auth/me` - Profil utilisateur
- `PUT /auth/profile` - Mise à jour profil
- `POST /auth/change-password` - Changement de mot de passe
- `POST /auth/request-password-reset` - Demande de reset
- `POST /auth/reset-password` - Reset de mot de passe

### Campagnes
- `GET /campaigns` - Liste des campagnes utilisateur
- `POST /campaigns` - Création de campagne
- `GET /campaigns/:id` - Détails d'une campagne
- `PUT /campaigns/:id` - Modification de campagne
- `PUT /campaigns/:id/launch` - Lancement de campagne
- `PUT /campaigns/:id/pause` - Pause de campagne
- `PUT /campaigns/:id/end` - Arrêt de campagne
- `GET /campaigns/:id/kpis` - KPIs et analytics
- `DELETE /campaigns/:id` - Suppression de campagne

### Facturation
- `POST /api/create-checkout-session` - Session Stripe
- `GET /payments` - Historique des paiements
- `GET /payments/:id` - Détails d'un paiement
- `GET /payments/:id/invoice` - Téléchargement facture
- `GET /stats` - Statistiques de facturation
- `POST /webhooks/stripe` - Webhook Stripe

### Système
- `GET /health` - Status de santé du serveur

## 🗄️ Structure de la base de données

### Tables principales
- **users** - Utilisateurs du système
- **client_accounts** - Comptes clients liés à Google Ads
- **campaign_requests** - Campagnes publicitaires
- **kpi_daily** - Métriques quotidiennes des campagnes
- **payments** - Historique des paiements
- **refresh_tokens** - Tokens de rafraîchissement

### Tables de support
- **alerts** - Système d'alertes
- **audit_logs** - Journal d'audit complet
- **documents** - Gestion des fichiers
- **app_settings** - Configuration application

## 🔄 Rate Limiting

- **Global**: 1000 requêtes/15min par IP
- **Auth**: 100 requêtes/15min par IP
- **Campaigns**: 50 requêtes/15min par utilisateur
- **Checkout**: 10 créations/heure par utilisateur

## 📝 Scripts disponibles

```bash
# Développement
npm run dev          # Serveur de développement avec hot reload
npm run typecheck    # Vérification TypeScript

# Base de données
npm run migrate      # Migrations Prisma
npm run generate     # Génération client Prisma
npm run seed         # Seed initial
npm run db:studio    # Interface Prisma Studio

# Production
npm run build        # Build production
npm run start        # Démarrage production

# Tests
npm run test         # Tests unitaires
npm run test:watch   # Tests en mode watch
npm run test:coverage # Couverture de code

# Code quality
npm run lint         # ESLint
npm run lint:fix     # Fix automatique ESLint
```

## 🐳 Déploiement Docker

```bash
# Build de l'image
docker build -t mdmc-backend .

# Lancement avec docker-compose
docker-compose up -d
```

## 📊 Monitoring de production

- Logs structurés avec Winston
- Health check endpoint pour load balancer
- Métriques de performance dans les logs
- Audit trail complet de toutes les actions

## 🔐 Conformité RGPD

- Hashage sécurisé des mots de passe
- Logging minimal des données sensibles
- Audit trail pour la traçabilité
- Possibilité de suppression complète des données utilisateur

## 📞 Support

Pour toute question technique, contacter l'équipe de développement MDMC.