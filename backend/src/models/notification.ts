import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import User from './user';

class Notification extends Model {
  public id!: number;
  public user_id!: number;
  public message!: string;
  public is_read!: boolean;
  public createdAt!: Date;
}

Notification.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    message: { type: DataTypes.TEXT, allowNull: false },
    is_read: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'notifications',
    timestamps: false,
    indexes: [{ fields: ['user_id'] }],
  }
);

Notification.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE' });

export default Notification;
