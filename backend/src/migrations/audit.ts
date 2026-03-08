/**
 * Migration script to add audit_logs table
 * Run this to set up the audit logging infrastructure
 */

import sequelize from '../config/database';
import AuditLog from '../models/auditLog';

export const runAuditMigration = async () => {
  try {
    // Sync the AuditLog model to create the table
    await AuditLog.sync({ alter: false });
    console.log('✓ audit_logs table created successfully');
  } catch (error) {
    console.error('✗ Error creating audit_logs table:', error);
    throw error;
  }
};

// If running this file directly
if (require.main === module) {
  runAuditMigration()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
