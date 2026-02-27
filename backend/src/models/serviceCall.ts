import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class ServiceCall extends Model {
  public id!: number;
  public subject!: string;
  public description!: string;
  public status!: 'open' | 'closed';
  public priority!: 'low' | 'medium' | 'high';
  public battalion!: string | null;
  public personId!: number | null;
  public personName!: string | null;
  public notes!: string | null;
  public updates!: any[] | null;
  public closedAt!: Date | null;
  public createdBy!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

ServiceCall.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('open', 'closed'),
      defaultValue: 'open',
      allowNull: false,
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      defaultValue: 'medium',
      allowNull: false,
    },
    battalion: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    personId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    personName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    updates: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'service_calls',
    timestamps: true,
  }
);

export default ServiceCall;
