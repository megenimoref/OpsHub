import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class FinancialDocument extends Model {
  public id!: number;
  public type!: 'payslip' | 'insurance';
  public originalName!: string;
  public fileName!: string; // stored file name on disk
  public soldierPersonalNumber!: string;
  public soldierName!: string | null;
  public battalion!: string;
  public uploadedBy!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

FinancialDocument.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM('payslip', 'insurance'),
      allowNull: false,
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    soldierPersonalNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    soldierName: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    battalion: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'financial_documents',
    timestamps: true,
  }
);

export default FinancialDocument;
