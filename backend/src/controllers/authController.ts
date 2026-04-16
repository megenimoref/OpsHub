import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/user';
import validator from 'validator';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../services/emailService';
import { logger } from '../services/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;
export const PASSWORD_ERROR = 'הסיסמה חייבת להכיל לפחות 8 תווים, אות גדולה אחת, ספרה אחת וסימן מיוחד אחד';

export const refreshToken = (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const newToken = jwt.sign(
      { userId: decoded.userId, role: decoded.role, email: decoded.email, firstName: decoded.firstName, lastName: decoded.lastName },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    return res.json({ token: newToken });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      logger.error(`login failed: user not found`, { email });
      return res.status(401).json({ error: 'פרטי ההתחברות שגויים' });
    }

    logger.info(`login attempt`, { email, userId: user.id, hashPrefix: user.password.substring(0, 10) });
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      logger.error(`login failed: password mismatch`, { email, userId: user.id, hashPrefix: user.password.substring(0, 10) });
      return res.status(401).json({ error: 'פרטי ההתחברות שגויים' });
    }
    logger.info(`login success`, { email, userId: user.id });

    // @ts-ignore
    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email, firstName: user.firstName, lastName: user.lastName },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      token,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const user = await User.findOne({ where: { email } });

    // Return error if email doesn't exist
    if (!user) {
      return res.status(404).json({ error: 'אימייל לא קיים' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set expiration to 1 hour
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    // Save to database
    await user.update({
      passwordResetToken: tokenHash,
      passwordResetExpires: resetExpires,
    });

    // Send email with reset link
    const resetUrl = `${process.env.CORS_ORIGIN}/reset-password?token=${resetToken}`;
    try {
      await sendPasswordResetEmail(email, resetUrl);
    } catch (emailError) {
      console.error('Email send error:', emailError);
      // Clear token if email failed
      await user.update({
        passwordResetToken: null,
        passwordResetExpires: null,
      });
      return res.status(500).json({ error: 'Failed to send password reset email' });
    }

    res.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({ error: PASSWORD_ERROR });
    }

    // Hash the provided token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with matching token and valid expiration
    const user = await User.findOne({
      where: {
        passwordResetToken: tokenHash,
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Check if token has expired
    if (!user.passwordResetExpires || new Date() > user.passwordResetExpires) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Hash manually and skip hooks to avoid double-hashing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await user.update({
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    }, { hooks: false });

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
