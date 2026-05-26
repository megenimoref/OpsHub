import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class WhatsAppLog extends Model {
  public id!: number;
  public soldierPersonalNumber!: string;
  public soldierName!: string | null;
  public battalion!: string | null;
  public phone!: string;
  public messagePreview!: string;
  public sentByName!: string;
  public createdAt!: Date;
}

WhatsAppLog.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  soldierPersonalNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'soldier_personal_number' },
  soldierName: { type: DataTypes.STRING(200), allowNull: true, field: 'soldier_name' },
  battalion: { type: DataTypes.STRING(100), allowNull: true },
  phone: { type: DataTypes.STRING(50), allowNull: false },
  messagePreview: { type: DataTypes.STRING(160), allowNull: false, field: 'message_preview' },
  sentByName: { type: DataTypes.STRING(255), allowNull: false, field: 'sent_by_name' },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
}, { sequelize, tableName: 'whatsapp_logs', timestamps: false });

export default WhatsAppLog;
