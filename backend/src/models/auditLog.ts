import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import User from './user';

class AuditLog extends Model {
  public id!: number;
  public userId!: number;
  public entityType!: string;
  public entityId!: number;
  public action!: string;
  public changes!: Record<string, { oldValue: any; newValue: any }>;
  public createdAt!: Date;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Type of entity being modified (e.g., "person", "user")',
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID of the entity being modified',
    },
    action: {
      type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE'),
      allowNull: false,
    },
    changes: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'JSON object containing field changes: { fieldName: { oldValue, newValue } }',
    },
  },
  {
    sequelize,
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['userId'] },
      { fields: ['entityType', 'entityId'] },
      { fields: ['createdAt'] },
    ],
  }
);

// Relationships
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'changedBy' });
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });

export default AuditLog;
