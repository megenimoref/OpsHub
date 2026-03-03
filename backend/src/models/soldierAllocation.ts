import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import User from './user';

class SoldierAllocation extends Model {
  public id!: number;
  public user_id!: number | null;
  public battalion_name!: string;
  public soldier_personal_number!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

SoldierAllocation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    battalion_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    soldier_personal_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'soldier_allocations',
    timestamps: true,
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['battalion_name'],
      },
      {
        fields: ['battalion_name', 'soldier_personal_number'],
        unique: true,
      },
    ],
  }
);

// Relationships
SoldierAllocation.belongsTo(User, {
  foreignKey: 'user_id',
  onDelete: 'SET NULL',
});

export default SoldierAllocation;
