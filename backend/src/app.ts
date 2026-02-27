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
import { logger } from './services/logger';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected');

    await sequelize.sync({ alter: true });
    console.log('✓ Models synced');

    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

start();

export default app;
