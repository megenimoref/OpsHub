import { Request, Response } from 'express';
import crypto from 'crypto';
import User from '../models/user';
import { logger } from '../services/logger';

// Issues a short-lived signed URL into the TimeTable microservice. The browser
// opens the returned URL in a new tab; TimeTable's /api/login-by-email then
// verifies the HMAC and (if role==='admin') promotes the user. The signing
// secret is shared between this service and the timetable container via
// TIMETABLE_SSO_SECRET in docker-compose.prod.yml.
//
// Why a server-issued signed URL rather than just `?email=…&role=admin`?
// Because the browser must not be trusted to assert its own role — anyone
// could append `&role=admin` to the URL otherwise. Signing it server-side,
// after checking req.userRole here, is the gate that prevents that.

const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes — long enough for new-tab open, short enough to limit replay

export const issueTimetableSso = async (req: Request, res: Response): Promise<void> => {
  try {
    const requestedRole = req.body?.role === 'admin' ? 'admin' : 'user';

    // Admin button is gated to OpsHub admins/super only. Staff/manager hitting
    // this with role:'admin' is a 403 — the frontend should not even render
    // the button for them, but we double-check on the server.
    if (requestedRole === 'admin' && req.userRole !== 'admin' && req.userRole !== 'super') {
      logger.error('timetable-sso: 403 - admin role requested by non-admin', {
        userId: req.userId,
        role: req.userRole,
      });
      res.status(403).json({ error: 'Admin role required for TimeTable admin link' });
      return;
    }

    const secret = process.env.TIMETABLE_SSO_SECRET;
    if (!secret) {
      logger.error('timetable-sso: TIMETABLE_SSO_SECRET not configured');
      res.status(500).json({ error: 'TimeTable SSO not configured' });
      return;
    }

    const user = await User.findByPk(req.userId);
    if (!user || !user.email) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const email = user.email.trim().toLowerCase();
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    const exp = Date.now() + TOKEN_TTL_MS;

    // Sign canonical string. Include exp inside the payload so a stolen URL
    // can't be replayed past the 5-minute window. Order matters and must
    // match the verifier in timetable/server.js.
    const payload = `${email}|${requestedRole}|${exp}`;
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const qs = new URLSearchParams({ email, role: requestedRole, exp: String(exp), sig });
    if (name) qs.set('name', name);

    const url = `/timetable/?${qs.toString()}`;

    logger.info('timetable-sso: issued', {
      userId: req.userId,
      email,
      requestedRole,
      expIso: new Date(exp).toISOString(),
    });

    res.json({ url });
  } catch (error: any) {
    logger.error('timetable-sso: error', { errorMessage: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to issue TimeTable SSO link' });
  }
};
