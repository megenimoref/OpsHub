import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcryptjs';

class User extends Model {
  public id!: number;
  public email!: string;
  public firstName!: string;
  public lastName!: string;
  public password!: string;
  public role!: 'admin' | 'staff' | 'super';
  public totpSecret!: string | null;
  public totpEnabled!: boolean;
  public passwordResetToken!: string | null;
  public passwordResetExpires!: Date | null;
  public totpResetToken!: string | null;
  public totpResetExpires!: Date | null;
  public totpPendingSecret!: string | null;
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
      type: DataTypes.ENUM('admin', 'staff', 'super'),
      defaultValue: 'staff',
      allowNull: false,
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
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      },
    },
  }
);

export default User;
