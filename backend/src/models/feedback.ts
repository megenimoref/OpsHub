import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class Feedback extends Model {
  public id!: number;
  public userId!: number;
  public title!: string;
  public description!: string;
  public category!: 'bug' | 'improvement' | 'feature' | 'other';
  public priority!: 'low' | 'medium' | 'high';
  public status!: 'new' | 'reviewed' | 'in_progress' | 'done' | 'rejected';
  public adminNote!: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Feedback.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM('bug', 'improvement', 'feature', 'other'),
      defaultValue: 'improvement',
      allowNull: false,
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      defaultValue: 'medium',
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('new', 'reviewed', 'in_progress', 'done', 'rejected'),
      defaultValue: 'new',
      allowNull: false,
    },
    adminNote: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'feedbacks',
    timestamps: true,
  }
);

export default Feedback;
