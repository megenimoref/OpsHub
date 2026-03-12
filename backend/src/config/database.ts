import { Sequelize } from 'sequelize';
import { logger } from '../services/logger';

const sequelize = new Sequelize(
  process.env.DB_NAME || 'crm',
  process.env.DB_USER || 'crm_user',
  process.env.DB_PASSWORD || '1qaz!QAZ',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: (sql) => logger.info(`[DB] ${sql}`),
  }
);

export default sequelize;
