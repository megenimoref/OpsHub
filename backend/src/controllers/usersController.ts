import { Request, Response } from 'express';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import User from '../models/user';
import validator from 'validator';
import { sendTotpResetEmail } from '../services/emailService';

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, role, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = await User.create({
      email,
      password,
      firstName: firstName || '',
      lastName: lastName || '',
      role: ['admin', 'super', 'staff', 'manager'].includes(role) ? role : 'staff',
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'totpEnabled', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (targetId === req.userId) {
      return res.status(400).json({ error: 'לא ניתן למחוק את עצמך' });
    }

    const user = await User.findByPk(targetId);
    if (!user) {
      return res.status(404).json({ error: 'משתמש לא נמצא' });
    }

    await user.destroy();
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const { password } = req.body;

    if (isNaN(targetId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findByPk(targetId);
    if (!user) {
      return res.status(404).json({ error: 'משתמש לא נמצא' });
    }

    await user.update({ password });

    res.json({ success: true, message: 'הסיסמה אופסה בהצלחה' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const sendTotpSetupEmail = async (req: Request, res: Response) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await User.findByPk(targetId);
    if (!user) {
      return res.status(404).json({ error: 'משתמש לא נמצא' });
    }

    const secret = speakeasy.generateSecret({ name: `CRM (${user.email})`, length: 20 });
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await user.update({
      totpResetToken: tokenHash,
      totpResetExpires: expires,
      totpPendingSecret: secret.base32,
    });

    const confirmUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/confirm-totp-reset?token=${rawToken}`;
    await sendTotpResetEmail(user.email, qrCodeDataUrl, confirmUrl);

    res.json({ success: true, message: `מייל Google Authenticator נשלח אל ${user.email}` });
  } catch (error) {
    console.error('Send TOTP setup email error:', error);
    res.status(500).json({ error: 'שגיאה בשליחת המייל' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const { firstName, lastName, role, email } = req.body;

    if (isNaN(targetId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await User.findByPk(targetId);
    if (!user) {
      return res.status(404).json({ error: 'משתמש לא נמצא' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      user.email = email;
    }

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (role !== undefined) user.role = ['admin', 'super', 'staff', 'manager'].includes(role) ? role : 'staff';

    await user.save();

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      success: true,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
