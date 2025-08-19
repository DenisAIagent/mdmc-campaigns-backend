# MDMC Music Ads - Guide de Déploiement

## 🚀 Démarrage Rapide

### 1. Prérequis
- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+
- npm ou yarn

### 2. Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer l'environnement
cp .env.example .env
# ⚠️ IMPORTANT: Configurer toutes les variables dans .env

# 3. Valider la configuration
npm run validate

# 4. Préparer la base de données
npm run generate
npm run migrate
npm run seed  # Optionnel

# 5. Démarrer en développement
npm run dev
```

### 3. Vérification

Le serveur démarre sur `http://localhost:3001`

✅ **Health check**: `GET /health`
✅ **Documentation**: `GET /v1/docs`
✅ **Test auth**: `POST /auth/signup`

## 🌍 Déploiement Production

### Railway / Vercel

1. **Variables d'environnement requises**:
```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=super-secure-secret-min-32-chars
JWT_REFRESH_SECRET=super-secure-refresh-secret-min-32-chars
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
# ... (voir .env.example pour la liste complète)
```

2. **Commandes de build**:
```bash
# Build command
npm run build

# Start command  
npm start

# Health check
/health
```

### Docker

```bash
# Build
docker build -t mdmc-backend .

# Run
docker run -p 3001:3001 --env-file .env mdmc-backend
```

### Docker Compose

```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: mdmc_campaigns
      POSTGRES_USER: mdmc
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## 🔧 Configuration Stripe

### 1. Webhooks
Configurer l'endpoint webhook dans Stripe Dashboard:
- URL: `https://your-domain.com/api/webhooks/stripe`
- Events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `invoice.finalized`

### 2. Produits
Créer les produits dans Stripe Dashboard ou ils seront créés automatiquement lors des premiers paiements.

## 🛡️ Sécurité Production

### Variables sensibles
- Générer des JWT secrets aléatoires de 64+ caractères
- Utiliser des clés Stripe Live uniquement en production
- Configurer CORS pour votre domaine uniquement
- Activer HTTPS obligatoire

### Rate Limiting
Les limites par défaut:
- 1000 req/15min global
- 100 req/15min auth
- 50 req/15min campaigns  
- 10 req/hour checkout

### Monitoring
- Logs dans `/logs` ou stdout pour containers
- Health check sur `/health`
- Métriques dans les logs Winston

## 📊 Base de Données

### Migrations
```bash
# Appliquer les migrations
npm run migrate:deploy

# Reset complet (DANGER)
npm run migrate:reset
```

### Sauvegarde
```bash
# PostgreSQL dump
pg_dump $DATABASE_URL > backup.sql

# Restoration
psql $DATABASE_URL < backup.sql
```

## 🔍 Debugging

### Logs
```bash
# Voir les logs en temps réel
tail -f logs/app.log

# Filtrer les erreurs
grep ERROR logs/app.log
```

### Tests
```bash
# Tests unitaires
npm test

# Tests d'intégration
npm run test:integration

# Coverage
npm run test:coverage
```

### Validation
```bash
# Valider la config
npm run validate

# Vérifier les types
npm run typecheck

# Linter
npm run lint
```

## 🚨 Troubleshooting

### Erreurs communes

**Database connection failed**
- Vérifier `DATABASE_URL`
- S'assurer que PostgreSQL est démarré
- Tester la connexion: `psql $DATABASE_URL`

**Redis connection failed**  
- Vérifier `REDIS_URL`
- S'assurer que Redis est démarré
- Tester: `redis-cli ping`

**JWT errors**
- Vérifier que `JWT_SECRET` fait au moins 32 caractères
- S'assurer que les secrets sont différents entre dev/prod

**Stripe webhook errors**
- Vérifier `STRIPE_WEBHOOK_SECRET`
- S'assurer que l'endpoint est configuré dans Stripe
- Tester avec Stripe CLI: `stripe listen --forward-to localhost:3001/api/webhooks/stripe`

### Support

Logs détaillés disponibles avec:
```bash
DEBUG=* npm run dev
```

Pour aide: contacter l'équipe technique MDMC.