import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import sequelize from './config/database';
import authRoutes from './routes/auth';
import peopleRoutes from './routes/people';
import ticketsRoutes from './routes/tickets';
import usersRoutes from './routes/users';
import battalionRoutes from './routes/battalion';
import logsRoutes from './routes/logs';
import chatRoutes from './routes/chat';
import openaiRoutes from './routes/openai';
import whatsappRoutes from './routes/whatsapp';
import serviceCallsRoutes from './routes/serviceCalls';
import backupRoutes from './routes/backup';
import notificationsRoutes from './routes/notifications';
import './models/notification'; // ensure model is synced
import { startScheduler } from './services/backupService';
import { logger } from './services/logger';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const meta = { method: req.method, url: req.url, status: res.statusCode, ms };
    if (res.statusCode >= 400) {
      logger.error(`HTTP ${req.method} ${req.url} → ${res.statusCode}`, meta);
    } else {
      logger.info(`HTTP ${req.method} ${req.url} → ${res.statusCode}`, meta);
    }
  });
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/people', peopleRoutes);
app.use('/tickets', ticketsRoutes);
app.use('/users', usersRoutes);
app.use('/battalion', battalionRoutes);
app.use('/logs', logsRoutes);
app.use('/chat', chatRoutes);
app.use('/openai', openaiRoutes);
app.use('/whatsapp', whatsappRoutes);
app.use('/service-calls', serviceCallsRoutes);
app.use('/backup', backupRoutes);
app.use('/notifications', notificationsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Global error logging middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled server error', {
    method: req.method,
    url: req.url,
    errorMessage: err.message,
    stack: err.stack,
  });
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// Start server
const PORT = process.env.PORT || 3000;

// Remove duplicate UNIQUE indexes on users.email accumulated by repeated alter:true syncs
async function cleanupDuplicateEmailIndexes(): Promise<void> {
  try {
    const [results]: any = await sequelize.query(`
      SELECT GROUP_CONCAT(DISTINCT CONCAT('DROP INDEX \`', INDEX_NAME, '\`') SEPARATOR ', ') AS drops
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
        AND INDEX_NAME != 'PRIMARY' AND COLUMN_NAME = 'email'
      HAVING drops IS NOT NULL
    `);
    if (results[0]?.drops) {
      await sequelize.query(`ALTER TABLE users ${results[0].drops}`);
      console.log('✓ Cleaned up duplicate email indexes on users table');
    }
  } catch {
    // Table may not exist yet on first run — safe to ignore
  }
}

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected');

    await cleanupDuplicateEmailIndexes();
    await sequelize.sync({ alter: true });
    console.log('✓ Models synced');

    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
    });

    // Start backup scheduler
    await startScheduler();
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

start();

export default app;
