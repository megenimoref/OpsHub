import AuditLog from '../models/auditLog';

interface ChangeSet {
  [fieldName: string]: {
    oldValue: any;
    newValue: any;
  };
}

export const logAudit = async (
  userId: number,
  entityType: string,
  entityId: number,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  changes?: ChangeSet
) => {
  try {
    await AuditLog.create({
      userId,
      entityType,
      entityId,
      action,
      changes: changes || null,
    });
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't throw - audit logging failure shouldn't break the main operation
  }
};

export const getAuditLog = async (
  entityType: string,
  entityId: number,
  limit: number = 50,
  offset: number = 0
) => {
  try {
    const { count, rows } = await AuditLog.findAndCountAll({
      where: {
        entityType,
        entityId,
      },
      attributes: ['id', 'userId', 'action', 'changes', 'createdAt'],
      include: [
        {
          association: 'changedBy',
          attributes: ['id', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      total: count,
      logs: rows,
    };
  } catch (error) {
    console.error('Get audit log error:', error);
    return {
      total: 0,
      logs: [],
    };
  }
};

/**
 * Helper function to detect changes between old and new values
 */
export const detectChanges = (
  oldData: Record<string, any>,
  newData: Record<string, any>,
  fieldsToTrack?: string[]
): ChangeSet => {
  const changes: ChangeSet = {};
  const fieldsToCheck = fieldsToTrack || Object.keys(newData);

  fieldsToCheck.forEach((field) => {
    const oldValue = oldData[field];
    const newValue = newData[field];

    // Only log if value actually changed
    if (oldValue !== newValue) {
      changes[field] = {
        oldValue,
        newValue,
      };
    }
  });

  return changes;
};
