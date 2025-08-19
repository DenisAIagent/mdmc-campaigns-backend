import { PrismaClient, UserRole, LinkStatus, CampaignStatus, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { env } from '@/config/env';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data in development
  if (env.NODE_ENV === 'development') {
    console.log('🗑️  Clearing existing data...');
    
    await prisma.kpiDaily.deleteMany();
    await prisma.alert.deleteMany();
    await prisma.document.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.campaignRequest.deleteMany();
    await prisma.clientAccount.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.googleTokens.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.user.deleteMany();
    await prisma.appSettings.deleteMany();
  }

  // Create app settings
  console.log('⚙️  Creating app settings...');
  await prisma.appSettings.createMany({
    data: [
      {
        key: 'campaign_price_eur',
        value: '200',
        type: 'number',
        description: 'Prix par campagne en euros (HT)',
      },
      {
        key: 'vat_rate',
        value: '0.22',
        type: 'number',
        description: 'Taux de TVA estonienne',
      },
      {
        key: 'campaign_duration_days',
        value: '30',
        type: 'number',
        description: 'Durée des campagnes en jours',
      },
      {
        key: 'max_campaigns_per_user',
        value: '10',
        type: 'number',
        description: 'Nombre maximum de campagnes par utilisateur',
      },
      {
        key: 'email_notifications_enabled',
        value: 'true',
        type: 'boolean',
        description: 'Activer les notifications email',
      },
    ],
  });

  // Create admin user
  console.log('👤 Creating admin user...');
  const adminPasswordHash = await bcrypt.hash('Admin123!', env.BCRYPT_ROUNDS);
  
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@mdmc.fr',
      firstName: 'Admin',
      lastName: 'MDMC',
      role: UserRole.ADMIN,
      passwordHash: adminPasswordHash,
      isActive: true,
    },
  });

  // Create account manager
  console.log('👤 Creating account manager...');
  const amPasswordHash = await bcrypt.hash('Manager123!', env.BCRYPT_ROUNDS);
  
  const amUser = await prisma.user.create({
    data: {
      email: 'am@mdmc.fr',
      firstName: 'Account',
      lastName: 'Manager',
      role: UserRole.ACCOUNT_MANAGER,
      passwordHash: amPasswordHash,
      isActive: true,
    },
  });

  // Create demo client users
  console.log('👤 Creating demo client users...');
  const clientPasswordHash = await bcrypt.hash('Client123!', env.BCRYPT_ROUNDS);

  const demoClient1 = await prisma.user.create({
    data: {
      email: 'artist@example.com',
      firstName: 'Jean',
      lastName: 'Artiste',
      role: UserRole.CLIENT,
      passwordHash: clientPasswordHash,
      isActive: true,
      lastLoginAt: new Date(),
    },
  });

  const demoClient2 = await prisma.user.create({
    data: {
      email: 'label@example.com',
      firstName: 'Marie',
      lastName: 'Label',
      role: UserRole.CLIENT,
      passwordHash: clientPasswordHash,
      isActive: true,
      lastLoginAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    },
  });

  // Create client accounts
  console.log('🔗 Creating client accounts...');
  const clientAccount1 = await prisma.clientAccount.create({
    data: {
      userId: demoClient1.id,
      googleCustomerId: '1234567890',
      linkStatus: LinkStatus.LINKED,
      linkRequestedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      linkedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      lastSyncAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    },
  });

  const clientAccount2 = await prisma.clientAccount.create({
    data: {
      userId: demoClient2.id,
      googleCustomerId: '0987654321',
      linkStatus: LinkStatus.PENDING,
      linkRequestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
  });

  // Create demo campaigns
  console.log('🎬 Creating demo campaigns...');
  const campaign1 = await prisma.campaignRequest.create({
    data: {
      clientAccountId: clientAccount1.id,
      clipUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      clipTitle: 'Mon Premier Clip',
      artistsList: 'Daft Punk\nJustice\nModerat',
      countries: ['FR', 'BE', 'CH', 'CA'],
      status: CampaignStatus.RUNNING,
      startsAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      endsAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
      actualStartedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      googleCampaignId: 'gads_campaign_123',
      googleAdGroupId: 'gads_adgroup_123',
      googleAdIds: ['gads_ad_123', 'gads_ad_124'],
      targetingConfig: {
        ageRanges: ['AGE_RANGE_18_24', 'AGE_RANGE_25_34'],
        interests: ['music', 'electronic'],
        keywords: ['electronic music', 'french house'],
      },
      budgetConfig: {
        dailyBudgetMicros: 50000000, // 50€ per day
        biddingStrategy: 'TARGET_CPV',
        targetCpvMicros: 20000, // 0.02€ target CPV
      },
    },
  });

  const campaign2 = await prisma.campaignRequest.create({
    data: {
      clientAccountId: clientAccount2.id,
      clipUrl: 'https://www.youtube.com/watch?v=example123',
      clipTitle: 'Nouveau Single 2024',
      artistsList: 'PNL\nOrelsan\nAngèle',
      countries: ['FR', 'BE'],
      status: CampaignStatus.DRAFT,
    },
  });

  // Create demo payments
  console.log('💳 Creating demo payments...');
  await prisma.payment.create({
    data: {
      userId: demoClient1.id,
      campaignId: campaign1.id,
      stripePaymentId: 'pi_demo_payment_123',
      stripeSessionId: 'cs_demo_session_123',
      amountCents: 20000, // 200€
      vatRate: 0.22,
      vatCents: 4400, // 44€
      totalCents: 24400, // 244€
      status: PaymentStatus.PAID,
      paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      invoiceNumber: 'INV-2024-001',
      invoiceUrl: 'https://files.mdmc.fr/invoices/INV-2024-001.pdf',
    },
  });

  await prisma.payment.create({
    data: {
      userId: demoClient2.id,
      campaignId: campaign2.id,
      amountCents: 20000,
      vatRate: 0.22,
      vatCents: 4400,
      totalCents: 24400,
      status: PaymentStatus.PENDING,
    },
  });

  // Create demo KPIs for running campaign
  console.log('📊 Creating demo KPIs...');
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    await prisma.kpiDaily.create({
      data: {
        campaignId: campaign1.id,
        date,
        views: BigInt(Math.floor(Math.random() * 10000) + 5000),
        likes: Math.floor(Math.random() * 500) + 100,
        subscribers: Math.floor(Math.random() * 50) + 10,
        comments: Math.floor(Math.random() * 100) + 20,
        shares: Math.floor(Math.random() * 200) + 50,
        watchTime: BigInt(Math.floor(Math.random() * 50000) + 20000),
        impressions: BigInt(Math.floor(Math.random() * 100000) + 50000),
        clicks: Math.floor(Math.random() * 1000) + 200,
        costMicros: BigInt(Math.floor(Math.random() * 50000000) + 30000000), // 30-80€
        averageCpvMicros: BigInt(Math.floor(Math.random() * 30000) + 15000), // 0.015-0.045€
        ctr: Math.random() * 2 + 1, // 1-3%
        viewRate: Math.random() * 10 + 5, // 5-15%
        conversions: Math.floor(Math.random() * 20) + 5,
        conversionValue: BigInt(Math.floor(Math.random() * 1000000) + 500000),
      },
    });
  }

  // Create demo alerts
  console.log('🚨 Creating demo alerts...');
  await prisma.alert.createMany({
    data: [
      {
        userId: demoClient1.id,
        campaignId: campaign1.id,
        type: 'PERFORMANCE_ALERT',
        severity: 'WARNING',
        audience: 'CLIENT',
        title: 'CPV au-dessus de la cible',
        message: 'Le CPV de votre campagne "Mon Premier Clip" est 15% au-dessus de la cible depuis 2 jours.',
        metadata: {
          currentCpv: 0.035,
          targetCpv: 0.02,
          deviation: 0.15,
        },
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        userId: demoClient2.id,
        type: 'LINK_STATUS',
        severity: 'INFO',
        audience: 'CLIENT',
        title: 'Demande de liaison en attente',
        message: 'Votre demande de liaison Google Ads est en attente d\'acceptation. Vérifiez votre compte Google Ads.',
        isRead: true,
        readAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      },
      {
        userId: amUser.id,
        campaignId: campaign1.id,
        type: 'CAMPAIGN_STATUS',
        severity: 'INFO',
        audience: 'MANAGER',
        title: 'Campagne lancée avec succès',
        message: 'La campagne "Mon Premier Clip" pour Jean Artiste a été lancée avec succès.',
        isRead: false,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // Create demo documents
  console.log('📄 Creating demo documents...');
  await prisma.document.createMany({
    data: [
      {
        campaignId: campaign1.id,
        type: 'REPORT_PDF',
        filename: 'report-campaign-1.pdf',
        originalName: 'Rapport_Campagne_Mon_Premier_Clip.pdf',
        url: 'https://files.mdmc.fr/reports/report-campaign-1.pdf',
        size: 2048576, // 2MB
        mimeType: 'application/pdf',
        metadata: {
          reportType: 'monthly',
          period: '2024-01',
          generatedBy: 'system',
        },
      },
    ],
  });

  // Create audit logs
  console.log('📝 Creating audit logs...');
  await prisma.auditLog.createMany({
    data: [
      {
        userId: demoClient1.id,
        action: 'CREATE',
        resource: 'Campaign',
        resourceId: campaign1.id,
        newValues: {
          clipTitle: 'Mon Premier Clip',
          status: 'DRAFT',
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        userId: amUser.id,
        action: 'UPDATE',
        resource: 'Campaign',
        resourceId: campaign1.id,
        oldValues: {
          status: 'QUEUED',
        },
        newValues: {
          status: 'RUNNING',
          actualStartedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
        ipAddress: '192.168.1.200',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('✅ Database seeding completed successfully!');
  console.log('\n📋 Demo accounts created:');
  console.log('Admin: admin@mdmc.fr / Admin123!');
  console.log('Account Manager: am@mdmc.fr / Manager123!');
  console.log('Client 1: artist@example.com / Client123!');
  console.log('Client 2: label@example.com / Client123!');
  console.log('\n🎯 Demo data includes:');
  console.log('- 2 client accounts (1 linked, 1 pending)');
  console.log('- 2 campaigns (1 running, 1 draft)');
  console.log('- 1 completed payment');
  console.log('- 6 days of KPI data');
  console.log('- 3 alerts');
  console.log('- 1 report document');
  console.log('- Audit logs');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });