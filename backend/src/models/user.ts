import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcryptjs';

class User extends Model {
  public id!: number;
  public email!: string;
  public firstName!: string;
  public lastName!: string;
  public password!: string;
  public role!: 'admin' | 'staff' | 'super' | 'manager';
  public mobilePhone!: string | null;
  public totpSecret!: string | null;
  public totpEnabled!: boolean;
  public passwordResetToken!: string | null;
  public passwordResetExpires!: Date | null;
  public totpResetToken!: string | null;
  public totpResetExpires!: Date | null;
  public totpPendingSecret!: string | null;
  public hidePersonalNumber!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: '',
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: '',
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('admin', 'staff', 'super', 'manager'),
      defaultValue: 'staff',
      allowNull: false,
    },
    mobilePhone: {
      type: DataTypes.STRING(30),
      allowNull: true,
      defaultValue: null,
    },
    totpSecret: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    totpEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    passwordResetToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    totpResetToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    totpResetExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    totpPendingSecret: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    hidePersonalNumber: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    hooks: {},
  }
);

export default User;
