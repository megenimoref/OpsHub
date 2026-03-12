import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/user';
import validator from 'validator';
import { sendWelcomeEmail } from '../services/emailService';
import { PASSWORD_REGEX, PASSWORD_ERROR } from './authController';
import { logger } from '../services/logger';

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, role, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({ error: PASSWORD_ERROR });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      email,
      password: hashedPassword,
      firstName: firstName || '',
      lastName: lastName || '',
      role: ['admin', 'super', 'staff', 'manager'].includes(role) ? role : 'staff',
    }, { hooks: false });

    // Send welcome email with password setup link
    try {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.update({ passwordResetToken: tokenHash, passwordResetExpires: resetExpires }, { hooks: false });
      const setupUrl = `${process.env.CORS_ORIGIN}/reset-password?token=${resetToken}`;
      await sendWelcomeEmail(email, firstName || '', setupUrl);
    } catch (emailError) {
      console.error('Welcome email failed (non-fatal):', emailError);
    }

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

    logger.info(`resetUserPassword called`, { callerUserId: req.userId, callerRole: req.userRole, targetId });

    if (isNaN(targetId)) {
      logger.error(`resetUserPassword invalid targetId`, { raw: req.params.id });
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (!password) {
      logger.error(`resetUserPassword missing password`, { targetId });
      return res.status(400).json({ error: 'Password is required' });
    }

    if (!PASSWORD_REGEX.test(password)) {
      logger.error(`resetUserPassword password failed regex`, { targetId });
      return res.status(400).json({ error: PASSWORD_ERROR });
    }

    const user = await User.findByPk(targetId);
    if (!user) {
      logger.error(`resetUserPassword user not found`, { targetId });
      return res.status(404).json({ error: 'משתמש לא נמצא' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    logger.info(`resetUserPassword hashing`, { targetId, hashPrefix: hashedPassword.substring(0, 10) });

    await user.update({ password: hashedPassword }, { hooks: false });

    // Re-fetch from DB and verify the hash was saved and matches
    const freshUser = await User.findByPk(targetId);
    if (!freshUser) {
      logger.error(`resetUserPassword verify: user disappeared after update`, { targetId });
      return res.status(500).json({ error: 'שגיאה פנימית' });
    }
    const verifyMatch = await bcrypt.compare(password, freshUser.password);
    logger.info(`resetUserPassword VERIFY`, {
      targetId,
      email: freshUser.email,
      hashInDB: freshUser.password.substring(0, 10) + '...',
      bcryptCompareResult: verifyMatch,
    });

    if (!verifyMatch) {
      logger.error(`resetUserPassword CRITICAL: hash saved but compare returns false!`, { targetId });
      return res.status(500).json({ error: 'שגיאה פנימית באיפוס סיסמה' });
    }

    logger.info(`resetUserPassword SUCCESS`, { targetId, email: freshUser.email });
    res.json({ success: true, message: 'הסיסמה אופסה בהצלחה' });
  } catch (error) {
    logger.error(`resetUserPassword unhandled error`, { error: String(error) });
    res.status(500).json({ error: 'Server error' });
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
