require('dotenv').config({ path: '.env' });

import sequelize from './config/database';
import User from './models/user';

async function seed() {
  try {
    console.log('Connecting to:', process.env.DB_HOST, process.env.DB_NAME);
    await sequelize.authenticate();
    console.log('✓ Database connected');

    // Check if admin already exists
    const admin = await User.findOne({ where: { email: 'admin@crm.com' } });

    if (admin) {
      console.log('✓ Admin user already exists');
      return;
    }

    // Create admin user
    await User.create({
      email: 'admin@crm.com',
      password: 'admin123', // Will be auto-hashed by the model
      role: 'admin',
    });

    console.log('✓ Admin user created: admin@crm.com / admin123');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
