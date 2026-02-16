import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import User from './user';

class Person extends Model {
  public id!: number;
  public firstName!: string;
  public lastName!: string;
  public email!: string;
  public phone!: string;
  public battalion!: string;
  public userId!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Person.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [1, 100],
      },
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [1, 100],
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    battalion: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [1, 100],
      },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
  },
  {
    sequelize,
    tableName: 'people',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['battalion'] },
      { fields: ['firstName', 'lastName'] },
    ],
  }
);

// Relationships
Person.belongsTo(User, { foreignKey: 'userId', as: 'creator' });
User.hasMany(Person, { foreignKey: 'userId', as: 'people' });

export default Person;
