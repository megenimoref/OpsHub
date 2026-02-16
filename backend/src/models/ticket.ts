import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class Ticket extends Model {
  public id!: number;
  public subject!: string;
  public description!: string;
  public priority!: 'low' | 'medium' | 'high';
  public status!: 'open' | 'in_progress' | 'closed';
  public battalion!: string;
  public personId!: number | null;
  public personName!: string | null;
  public createdBy!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Ticket.init(
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
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      defaultValue: 'medium',
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('open', 'in_progress', 'closed'),
      defaultValue: 'open',
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
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'tickets',
    timestamps: true,
  }
);

export default Ticket;
