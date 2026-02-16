import sequelize from '../config/database';
import User from '../models/user';
import Person from '../models/person';

async function runMigrations() {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('✓ Connection successful');

    console.log('Syncing database models...');
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✓ Database synced');

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
