import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../services/logger';

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userRole?: 'admin' | 'staff' | 'super' | 'manager';
      userEmail?: string;
      userFirstName?: string;
      userLastName?: string;
    }
  }
}

// Decode the JWT payload WITHOUT verifying the signature. Used for
// diagnostics only — when verify() rejects a token, we still want to
// know which user it belonged to so we can correlate with their session.
function unsafeDecode(token: string): any | null {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
}

function clientInfo(req: Request) {
  return {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    ua: req.headers['user-agent'],
  };
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    logger.error('auth: 401 - no token', { reason: 'no_token', ...clientInfo(req) });
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.userEmail = decoded.email;
    req.userFirstName = decoded.firstName;
    req.userLastName = decoded.lastName;
    next();
  } catch (error: any) {
    // Distinguish the failure modes — every one of these throws the user
    // back to /login mid-typing if not handled by the frontend, so we want
    // to know which one is happening in production.
    const errName = error?.name || 'UnknownError';
    const decoded = unsafeDecode(token);
    const expiredAt = error?.expiredAt instanceof Date ? error.expiredAt.toISOString() : undefined;

    logger.error('auth: 401 - jwt verify failed', {
      reason:
        errName === 'TokenExpiredError'
          ? 'expired'
          : errName === 'JsonWebTokenError'
          ? 'invalid_signature_or_malformed'
          : errName === 'NotBeforeError'
          ? 'not_active_yet'
          : 'unknown',
      jwtErrorName: errName,
      jwtErrorMessage: error?.message,
      expiredAt,
      tokenUserId: decoded?.userId,
      tokenEmail: decoded?.email,
      tokenIat: decoded?.iat,
      tokenExp: decoded?.exp,
      ...clientInfo(req),
    });
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.userRole !== 'admin') {
    logger.error('auth: 403 - admin required', {
      reason: 'role_admin_required',
      userId: req.userId,
      role: req.userRole,
      ...clientInfo(req),
    });
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Allows admin or super roles
export const adminOrSuperMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.userRole !== 'admin' && req.userRole !== 'super') {
    logger.error('auth: 403 - admin/super required', {
      reason: 'role_admin_or_super_required',
      userId: req.userId,
      role: req.userRole,
      ...clientInfo(req),
    });
    return res.status(403).json({ error: 'Access required' });
  }
  next();
};

export const superMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.userRole !== 'super') {
    logger.error('auth: 403 - super required', {
      reason: 'role_super_required',
      userId: req.userId,
      role: req.userRole,
      ...clientInfo(req),
    });
    return res.status(403).json({ error: 'Super access required' });
  }
  next();
};

// Allows admin, super, or manager roles (for allocation + stats)
export const allocateMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.userRole !== 'admin' && req.userRole !== 'super' && req.userRole !== 'manager') {
    logger.error('auth: 403 - allocate role required', {
      reason: 'role_allocate_required',
      userId: req.userId,
      role: req.userRole,
      ...clientInfo(req),
    });
    return res.status(403).json({ error: 'Access required' });
  }
  next();
};
