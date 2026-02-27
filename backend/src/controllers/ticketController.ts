import { Request, Response } from 'express';
import Ticket from '../models/ticket';

export const createTicket = async (req: Request, res: Response) => {
  try {
    const { subject, description, priority, battalion, personId, personName } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ error: 'Subject and description are required' });
    }

    const ticket = await Ticket.create({
      subject,
      description,
      priority: priority || 'medium',
      status: 'open',
      battalion: battalion || null,
      personId: personId || null,
      personName: personName || null,
      createdBy: req.userId!,
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getTickets = async (req: Request, res: Response) => {
  try {
    const { myTickets } = req.query;

    const where: any = {};
    if (myTickets === 'true') {
      where.createdBy = req.userId;
    }

    const tickets = await Ticket.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    res.json(tickets);
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
