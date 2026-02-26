import { Request, Response } from 'express';
import User from '../models/user';
import validator from 'validator';

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
      role: role === 'admin' ? 'admin' : 'staff',
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
