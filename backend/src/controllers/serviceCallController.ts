import { Request, Response } from 'express';
import ServiceCall from '../models/serviceCall';

export const getServiceCalls = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) {
      where.status = status;
    }
    const calls = await ServiceCall.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
    res.json(calls);
  } catch (error) {
    console.error('Get service calls error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const createServiceCall = async (req: Request, res: Response) => {
  try {
    const { subject, description, priority, battalion, personId, personName } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ error: 'Subject and description are required' });
    }

    const call = await ServiceCall.create({
      subject,
      description,
      priority: priority || 'medium',
      battalion: battalion || null,
      personId: personId || null,
      personName: personName || null,
      createdBy: req.userId!,
    });

    res.status(201).json(call);
  } catch (error) {
    console.error('Create service call error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateServiceCall = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes, status } = req.body;

    const call = await ServiceCall.findByPk(id);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Only the creator can close the call
    if (status === 'closed' && call.createdBy !== req.userId) {
      return res.status(403).json({ error: 'Only the creator can close this call' });
    }

    // Update fields
    if (notes !== undefined) {
      call.notes = notes;
    }
    if (status !== undefined) {
      call.status = status;
      if (status === 'closed') {
        call.closedAt = new Date();
      }
    }

    await call.save();
    res.json(call);
  } catch (error) {
    console.error('Update service call error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
