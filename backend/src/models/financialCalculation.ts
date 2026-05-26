import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class FinancialCalculation extends Model {
  public id!: number;
  public soldierPersonalNumber!: string;
  public soldierName!: string | null;
  public battalion!: string;
  public reserveDays!: number;
  public estimatedCompensation!: number;
  public dailyAverage!: number;
  public monthsJson!: string;
  public notes!: string | null;
  public calculatedByName!: string;
  public createdAt!: Date;
}

FinancialCalculation.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  soldierPersonalNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'soldier_personal_number' },
  soldierName: { type: DataTypes.STRING(200), allowNull: true, field: 'soldier_name' },
  battalion: { type: DataTypes.STRING(100), allowNull: false },
  reserveDays: { type: DataTypes.INTEGER, allowNull: false, field: 'reserve_days' },
  estimatedCompensation: { type: DataTypes.INTEGER, allowNull: false, field: 'estimated_compensation' },
  dailyAverage: { type: DataTypes.FLOAT, allowNull: false, field: 'daily_average' },
  monthsJson: { type: DataTypes.TEXT, allowNull: false, field: 'months_json' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  calculatedByName: { type: DataTypes.STRING(255), allowNull: false, field: 'calculated_by_name' },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
}, { sequelize, tableName: 'financial_calculations', timestamps: false });

export default FinancialCalculation;
