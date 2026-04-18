import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class MessageCampaign extends Model {
  public id!: number;
  public channel!: 'whatsapp' | 'sms';
  public battalion!: string | null;
  public message_preview!: string;
  public recipient_count!: number;
  public succeeded!: number;
  public failed!: number;
  public sent_by!: string;
  public createdAt!: Date;
}

MessageCampaign.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    channel: { type: DataTypes.ENUM('whatsapp', 'sms'), allowNull: false },
    battalion: { type: DataTypes.STRING(100), allowNull: true },
    message_preview: { type: DataTypes.STRING(160), allowNull: false },
    recipient_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    succeeded: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    failed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    sent_by: { type: DataTypes.STRING(255), allowNull: false },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'message_campaigns',
    timestamps: false,
    indexes: [{ fields: ['channel'] }, { fields: ['createdAt'] }],
  }
);

export default MessageCampaign;
