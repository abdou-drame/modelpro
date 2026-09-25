import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { apiLimiter } from './middlewares/rateLimitMiddleware';

// Importation de tous les modèles pour la synchronisation PostgreSQL / tests
import './models/User';
import './models/Client';
import './models/Pack';
import './models/Artisan';
import './models/Creation';
import './models/Appointment';
import './models/Order';
import './models/Review';
import './models/Metier';
import './models/Claim';
import './models/Message';
import './models/Notification';
import './models/Payment';
import './models/WalletTransaction';
import './models/Company';
import './models/Customer';
import './models/Contact';
import './models/PipelineStage';
import './models/Opportunity';
import './models/CrmTask';
import './models/Product';
import './models/DocumentCounter';
import './models/Quote';
import './models/QuoteLine';
import './models/SalesOrder';
import './models/SalesOrderLine';
import './models/Invoice';
import './models/InvoiceLine';
import './models/InvoicePayment';
import './models/Supplier';
import './models/SupplierContact';
import './models/SupplierProduct';
import './models/PurchaseOrder';
import './models/PurchaseOrderLine';
import './models/PurchaseOrderPayment';
import './models/Site';
import './models/StockItem';
import './models/StockMovement';
import './models/ProfitabilitySimulation';
import './models/ProfitabilityCost';
import './models/AuditLog';
import './models/SubscriptionPlan';
import './models/CompanySubscription';
import './models/SubscriptionEvent';
import './models/PaytrackTransaction';
import './models/PaytrackEvent';
import './models/SupportTicket';
import './models/SupportTicketMessage';

// Importation des routes v1
import authRoutes from './routes/authRoutes';
import artisanRoutes from './routes/artisanRoutes';
import modelRoutes from './routes/modelRoutes';
import clientRoutes from './routes/clientRoutes';
import adminRoutes from './routes/adminRoutes';
import messageRoutes from './routes/messageRoutes';
import notificationRoutes from './routes/notificationRoutes';
import userRoutes from './routes/userRoutes';
import paymentRoutes from './routes/paymentRoutes';
import companyRoutes from './routes/companyRoutes';
import crmRoutes from './routes/crmRoutes';
import supplierRoutes from './routes/supplierRoutes';
import stockRoutes from './routes/stockRoutes';
import profitabilityRoutes from './routes/profitabilityRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import backofficeRoutes from './routes/backofficeRoutes';
import integrationRoutes from './routes/integrationRoutes';
import supportRoutes from './routes/supportRoutes';

dotenv.config();

const app: Application = express();

app.use(cors());
// rawBody conservé pour vérifier la signature HMAC des webhooks (intégration PayTrack).
app.use(express.json({
  limit: '50mb',
  verify: (req: any, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Servir les fichiers téléversés de façon statique
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Garde-fou anti-abus global (Phase 5) — les endpoints sensibles (login/2FA) ont en plus leur
// propre limite, plus stricte, posée directement dans authRoutes.ts.
app.use('/api/v1', apiLimiter);

// Points de terminaison (Endpoints)s de l'application
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/artisans', artisanRoutes);
app.use('/api/v1/models', modelRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/crm', crmRoutes);
app.use('/api/v1/crm', supplierRoutes);
app.use('/api/v1/crm', stockRoutes);
app.use('/api/v1/crm/profitability', profitabilityRoutes);
app.use('/api/v1/crm/dashboard', dashboardRoutes);
app.use('/api/v1/backoffice', backofficeRoutes);
app.use('/api/v1/integrations', integrationRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1', clientRoutes);

// Route de test pour la santé de l'API
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Le serveur répond et le routage est actif.' });
});

export default app;