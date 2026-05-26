import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class DistributionListMember extends Model {
  public id!: number;
  public soldierPersonalNumber!: string;
  public soldierName!: string;
  public battalion!: string;
  public phone!: string;
  public addedByName!: string;
  public createdAt!: Date;
}

DistributionListMember.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  soldierPersonalNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true, field: 'soldier_personal_number' },
  soldierName: { type: DataTypes.STRING(200), allowNull: false, field: 'soldier_name' },
  battalion: { type: DataTypes.STRING(100), allowNull: false },
  phone: { type: DataTypes.STRING(50), allowNull: false },
  addedByName: { type: DataTypes.STRING(255), allowNull: false, field: 'added_by_name' },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
}, { sequelize, tableName: 'distribution_list', timestamps: false });

export default DistributionListMember;
