# Audit Logging System Documentation

## Overview

The audit logging system tracks all changes made to soldier/person records in the CRM. Every time a record is created, updated, or deleted, a detailed audit trail is automatically recorded with:

- **Who** made the change (user ID and email)
- **When** the change was made (timestamp)
- **What** changed (old values → new values for each field)

## Why This Design?

✅ **Easy Timeline UI** - Display a clean activity feed/timeline to users without extra queries  
✅ **Clean Main Tables** - Doesn't clutter the `people` table with extra columns  
✅ **Complete History** - Full traceability of all changes over time  
✅ **Performance** - Uses JSON storage for flexible field tracking  

## Database Structure

### audit_logs Table

```sql
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,                    -- Who made the change
  entityType VARCHAR(50) NOT NULL,        -- Type of entity (e.g., "person")
  entityId INT NOT NULL,                  -- ID of the entity changed
  action ENUM('CREATE', 'UPDATE', 'DELETE'),  -- Type of change
  changes JSON,                           -- Field changes in JSON format
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- When
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

### Changes JSON Format

When a field is updated, it's recorded as:

```json
{
  "firstName": {
    "oldValue": "David",
    "newValue": "Dan"
  },
  "phone": {
    "oldValue": "0501234567",
    "newValue": "0509876543"
  }
}
```

For CREATE operations, `oldValue` is `null`:

```json
{
  "firstName": {
    "oldValue": null,
    "newValue": "Israel"
  },
  "battalion": {
    "oldValue": null,
    "newValue": "גולני"
  }
}
```

## API Endpoints

### Get Audit Trail for a Person

**Request:**
```
GET /api/people/:id/audit-log?limit=50&offset=0
```

**Response:**
```json
{
  "total": 5,
  "logs": [
    {
      "id": 1,
      "userId": 1,
      "action": "UPDATE",
      "changes": {
        "firstName": {
          "oldValue": "David",
          "newValue": "Dan"
        }
      },
      "createdAt": "2026-02-23T10:30:45Z",
      "changedBy": {
        "id": 1,
        "email": "admin@crm.com"
      }
    },
    {
      "id": 2,
      "userId": 1,
      "action": "CREATE",
      "changes": {
        "firstName": {
          "oldValue": null,
          "newValue": "David"
        },
        "lastName": {
          "oldValue": null,
          "newValue": "Cohen"
        },
        "battalion": {
          "oldValue": null,
          "newValue": "גולני"
        }
      },
      "createdAt": "2026-02-23T09:15:22Z",
      "changedBy": {
        "id": 1,
        "email": "admin@crm.com"
      }
    }
  ]
}
```

## Usage in Code

### Service Layer

The `auditService.ts` provides helper functions:

```typescript
import { logAudit, detectChanges, getAuditLog } from '../services/auditService';

// Log a change
await logAudit(userId, 'person', personId, 'UPDATE', changes);

// Detect what changed
const changes = detectChanges(oldData, newData, ['firstName', 'lastName']);

// Get audit history
const { total, logs } = await getAuditLog('person', personId, limit, offset);
```

### In Controllers

Changes are logged automatically in `peopleController.ts`:

```typescript
// Capture old values before updating
const oldData = person.toJSON();

// Make the update
await person.update(newValues);

// Detect and log changes
const newData = person.toJSON();
const changes = detectChanges(oldData, newData, ['firstName', 'lastName']);

if (Object.keys(changes).length > 0) {
  await logAudit(req.userId, 'person', person.id, 'UPDATE', changes);
}
```

## Setup Instructions

### 1. Create the audit_logs Table

Run the migration:

```bash
npm run migrate:audit
# or
ts-node src/migrations/audit.ts
```

### 2. Update package.json Scripts

Add this script to `backend/package.json`:

```json
{
  "scripts": {
    "migrate:audit": "ts-node src/migrations/audit.ts"
  }
}
```

### 3. Verify Installation

Query the database to confirm the table exists:

```sql
SELECT * FROM audit_logs LIMIT 1;
```

## Frontend Integration

### Timeline Component Example

```typescript
// In a React component
const [auditLog, setAuditLog] = useState([]);

useEffect(() => {
  const fetchAuditLog = async () => {
    const response = await fetch(`/api/people/${personId}/audit-log`);
    const data = await response.json();
    setAuditLog(data.logs);
  };
  fetchAuditLog();
}, [personId]);

return (
  <div className="timeline">
    {auditLog.map((entry) => (
      <div key={entry.id} className="timeline-entry">
        <p><strong>{entry.changedBy.email}</strong> {entry.action}</p>
        <p className="text-gray-500">{new Date(entry.createdAt).toLocaleString()}</p>
        {entry.changes && (
          <ul>
            {Object.entries(entry.changes).map(([field, change]: any) => (
              <li key={field}>
                {field}: "{change.oldValue}" → "{change.newValue}"
              </li>
            ))}
          </ul>
        )}
      </div>
    ))}
  </div>
);
```

## Features

✅ Automatic logging on all CRUD operations  
✅ Selective field tracking (no need to log every field)  
✅ User attribution (tracks who made the change)  
✅ Timestamps (UTC, sortable)  
✅ JSON storage (flexible, queryable)  
✅ Pagination support (limit/offset)  
✅ Foreign key constraints (cascading delete with users)  
✅ Indexed lookups (fast filtering by entity type/ID)  

## Performance Considerations

- **Indexes** are created on `userId`, `entityType`, `entityId`, and `createdAt` for fast queries
- **JSON field** is efficient for storing sparse changes (only modified fields)
- **Non-blocking** - Audit logging failures don't break main operations
- **Scalable** - Can handle thousands of audit logs without performance impact

## Future Enhancements

Potential improvements:

- **Soft deletes** - Keep deleted records for compliance
- **Rollback UI** - Allow admins to revert changes
- **Audit reports** - Generate compliance reports by date range or user
- **Change triggers** - Send notifications when specific fields change
- **Encryption** - Encrypt sensitive field changes for compliance

## Security Notes

- Audit logs are **immutable** - once written, they cannot be edited
- Timestamps use **server time** (UTC) - cannot be spoofed by client
- All operations are **traced back to a user** - no anonymous changes
- Logs respect **user permissions** - users can only see audit logs for their own records
