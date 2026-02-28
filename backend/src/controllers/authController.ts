import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import User from '../models/user';
import validator from 'validator';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../services/emailService';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

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
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // User has not set up TOTP yet — give full token but flag setup required
    if (!user.totpEnabled) {
      // @ts-ignore
      const token = jwt.sign(
        { userId: user.id, role: user.role, email: user.email, firstName: user.firstName, lastName: user.lastName },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      return res.json({
        token,
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, totpEnabled: false },
        requiresTotpSetup: true,
      });
    }

    // TOTP enabled — issue short-lived pre-auth token
    // @ts-ignore
    const preAuthToken = jwt.sign(
      { userId: user.id, preAuth: true },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    return res.json({ requiresTotp: true, preAuthToken });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
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

    const user = await User.create({ email, password, role: 'staff' });

    // @ts-ignore
    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email, firstName: user.firstName, lastName: user.lastName },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, totpEnabled: false },
      requiresTotpSetup: true,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /auth/setup-totp — requires full auth (not pre-auth)
export const setupTotp = async (req: Request, res: Response) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Reuse existing secret if already generated (prevents React StrictMode double-call issues)
    let base32Secret = user.totpSecret;
    if (!base32Secret) {
      const secret = speakeasy.generateSecret({
        name: `CRM (${user.email})`,
        length: 20,
      });
      base32Secret = secret.base32;
      await user.update({ totpSecret: base32Secret });
    }

    const otpauthUrl = speakeasy.otpauthURL({
      secret: base32Secret,
      label: `CRM (${user.email})`,
      encoding: 'base32',
    });
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    return res.json({
      qrCodeUrl,
      manualCode: base32Secret,
    });
  } catch (error) {
    console.error('Setup TOTP error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /auth/confirm-totp — requires full auth, verifies and enables TOTP
export const confirmTotp = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code required' });
    }

    const user = await User.findByPk(req.userId);
    if (!user || !user.totpSecret) {
      return res.status(400).json({ error: 'TOTP not set up. Call /auth/setup-totp first.' });
    }

    const isValid = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid code' });
    }

    await user.update({ totpEnabled: true });

    return res.json({ success: true });
  } catch (error) {
    console.error('Confirm TOTP error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /auth/verify-totp — no auth, completes login with TOTP code
export const verifyTotp = async (req: Request, res: Response) => {
  try {
    const { preAuthToken, code } = req.body;

    if (!preAuthToken || !code) {
      return res.status(400).json({ error: 'preAuthToken and code required' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(preAuthToken, JWT_SECRET) as any;
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (!decoded.preAuth) {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const user = await User.findByPk(decoded.userId);
    if (!user || !user.totpSecret) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid code' });
    }

    // @ts-ignore
    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email, firstName: user.firstName, lastName: user.lastName },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      token,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, totpEnabled: true },
    });
  } catch (error) {
    console.error('Verify TOTP error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /auth/reset-totp/:userId — admin only
export const resetTotp = async (req: Request, res: Response) => {
  try {
    const targetId = parseInt(req.params.userId, 10);
    if (isNaN(targetId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await User.findByPk(targetId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.update({ totpSecret: null, totpEnabled: false });

    return res.json({ success: true });
  } catch (error) {
    console.error('Reset TOTP error:', error);
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

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
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

    // Hash the new password (beforeUpdate hook doesn't work, so we do it manually)
    const salt = await require('bcryptjs').genSalt(10);
    const hashedPassword = await require('bcryptjs').hash(password, salt);

    // Update password and clear reset fields
    await user.update({
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
