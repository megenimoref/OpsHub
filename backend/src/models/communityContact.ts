import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class CommunityContact extends Model {
  public id!: number;
  public battalion!: string;
  public personal_number!: string | null;
  public soldier_name!: string | null;
  public spouse_name!: string | null;
  public spouse_phone!: string | null;
  public contact_by!: number | null;
  public notes!: string | null;
  public call_summary!: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

CommunityContact.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    battalion: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    personal_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    soldier_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    spouse_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    spouse_phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    contact_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    call_summary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'community_contacts',
    timestamps: true,
    indexes: [{ unique: true, fields: ['battalion', 'personal_number'] }],
  }
);

export default CommunityContact;
