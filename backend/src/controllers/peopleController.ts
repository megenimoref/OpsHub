import { Request, Response } from 'express';
import Person from '../models/person';
import { Op } from 'sequelize';
import validator from 'validator';

// GET /people - List with search, filter, pagination
export const getPeople = async (req: Request, res: Response) => {
  try {
    const { search, battalion, page = 1, limit = 20, sort = 'createdAt' } = req.query;

    const where: any = { userId: req.userId };

    // Search filter
    if (search && typeof search === 'string') {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    // Battalion filter
    if (battalion && typeof battalion === 'string') {
      where.battalion = battalion;
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const { count, rows } = await Person.findAndCountAll({
      where,
      offset,
      limit: parseInt(limit as string),
      order: [[sort as string, 'ASC']],
    });

    res.json({
      total: count,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      data: rows,
    });
  } catch (error) {
    console.error('Get people error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /people/:id
export const getPersonById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!validator.isNumeric(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const person = await Person.findOne({
      where: { id: parseInt(id), userId: req.userId },
    });

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    res.json(person);
  } catch (error) {
    console.error('Get person error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /people - Create new person
export const createPerson = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, battalion } = req.body;

    // Validation
    if (!firstName || !lastName || !battalion) {
      return res.status(400).json({
        error: 'firstName, lastName, and battalion are required',
      });
    }

    if (firstName.length > 100 || lastName.length > 100 || battalion.length > 100) {
      return res.status(400).json({ error: 'Field length exceeds limit' });
    }

    if (email && !validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (phone && !validator.isMobilePhone(phone as string)) {
      return res.status(400).json({ error: 'Invalid phone format' });
    }

    const person = await Person.create({
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      battalion,
      userId: req.userId,
    });

    res.status(201).json(person);
  } catch (error) {
    console.error('Create person error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /people/:id - Update person
export const updatePerson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, battalion } = req.body;

    if (!validator.isNumeric(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const person = await Person.findOne({
      where: { id: parseInt(id), userId: req.userId },
    });

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Validation
    if (firstName && firstName.length > 100) {
      return res.status(400).json({ error: 'firstName exceeds limit' });
    }

    if (lastName && lastName.length > 100) {
      return res.status(400).json({ error: 'lastName exceeds limit' });
    }

    if (battalion && battalion.length > 100) {
      return res.status(400).json({ error: 'battalion exceeds limit' });
    }

    if (email && !validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (phone && !validator.isMobilePhone(phone as string)) {
      return res.status(400).json({ error: 'Invalid phone format' });
    }

    await person.update({
      firstName: firstName || person.firstName,
      lastName: lastName || person.lastName,
      email: email !== undefined ? email : person.email,
      phone: phone !== undefined ? phone : person.phone,
      battalion: battalion || person.battalion,
    });

    res.json(person);
  } catch (error) {
    console.error('Update person error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /people/battalions - Get distinct battalion list
export const getBattalions = async (req: Request, res: Response) => {
  try {
    const rows = await Person.findAll({
      attributes: ['battalion'],
      where: { userId: req.userId },
      group: ['battalion'],
      order: [['battalion', 'ASC']],
    });
    res.json(rows.map((r) => r.battalion));
  } catch (error) {
    console.error('Get battalions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /people/:id
export const deletePerson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!validator.isNumeric(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const person = await Person.findOne({
      where: { id: parseInt(id), userId: req.userId },
    });

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    await person.destroy();

    res.json({ message: 'Person deleted' });
  } catch (error) {
    console.error('Delete person error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
