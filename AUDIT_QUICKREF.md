# Audit Logging System - Quick Reference

## TL;DR - What Was Built

A system that **automatically tracks all changes** to soldier records (create, update, delete) with:
- **Who** made the change (user email)
- **When** it happened (timestamp)
- **What** changed (field-by-field before/after values)

Perfect for displaying a timeline/activity feed to users.

## Files You Need to Know

| File | Purpose |
|------|---------|
| `backend/src/models/auditLog.ts` | Database model for audit logs |
| `backend/src/services/auditService.ts` | Business logic for logging |
| `backend/src/migrations/audit.ts` | Script to create the table |
| `backend/src/migrations/schema.sql` | Database schema (updated) |
| `backend/src/controllers/peopleController.ts` | Integrated logging (updated) |
| `backend/src/routes/people.ts` | New audit endpoint (updated) |

## Quick Start (3 Steps)

### 1️⃣ Create the Database Table
```bash
cd backend
npm run migrate:audit
```

### 2️⃣ Start the Backend
```bash
npm start
```

### 3️⃣ Test It
```bash
# Create a person (will auto-log)
curl -X POST http://localhost:5000/api/people \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","battalion":"Test"}'

# Check the audit log
curl http://localhost:5000/api/people/1/audit-log \
  -H "Authorization: Bearer TOKEN"
```

## API Endpoint

```
GET /api/people/{id}/audit-log?limit=50&offset=0
```

### Response Format
```json
{
  "total": 5,
  "logs": [
    {
      "id": 1,
      "userId": 1,
      "action": "UPDATE|CREATE|DELETE",
      "changes": {
        "fieldName": {
          "oldValue": "old",
          "newValue": "new"
        }
      },
      "createdAt": "2026-02-23T10:30:45Z",
      "changedBy": {
        "id": 1,
        "email": "admin@crm.com"
      }
    }
  ]
}
```

## How It Works

```
User Updates Person
         ↓
Controller captures OLD values
         ↓
Apply UPDATE to database
         ↓
Controller captures NEW values
         ↓
Service detectChanges() finds diffs
         ↓
Service logAudit() saves to audit_logs
         ↓
✓ Update complete
✓ Audit trail recorded
```

## What Gets Logged

| Operation | What's Recorded |
|-----------|-----------------|
| **CREATE** | All new values (oldValue = null) |
| **UPDATE** | Only changed fields with before/after values |
| **DELETE** | All old values (newValue = null) |

## Database Schema

```sql
audit_logs:
  - id: primary key
  - userId: who made change → foreign key to users
  - entityType: "person" (type of thing changed)
  - entityId: which person's ID
  - action: "CREATE", "UPDATE", or "DELETE"
  - changes: JSON with { fieldName: { oldValue, newValue } }
  - createdAt: when (UTC timestamp)
```

## Key Features

✅ **Automatic** - No manual logging needed  
✅ **Non-blocking** - Audit failures don't break operations  
✅ **Fast** - Indexed database queries  
✅ **Complete** - Every change is recorded  
✅ **Traceable** - Always know who did what  
✅ **Clean** - Separate table, doesn't bloat main schema  

## Common Queries

### All changes for a person
```sql
SELECT * FROM audit_logs 
WHERE entityType = 'person' AND entityId = 123
ORDER BY createdAt DESC;
```

### All changes by a user
```sql
SELECT * FROM audit_logs 
WHERE userId = 1
ORDER BY createdAt DESC;
```

### Changes today
```sql
SELECT * FROM audit_logs 
WHERE DATE(createdAt) = CURDATE()
ORDER BY createdAt DESC;
```

## Frontend Example

```typescript
const [logs, setLogs] = useState([]);

useEffect(() => {
  fetch(`/api/people/${personId}/audit-log`)
    .then(r => r.json())
    .then(data => setLogs(data.logs));
}, [personId]);

return (
  <div className="timeline">
    {logs.map(log => (
      <div key={log.id}>
        <h4>{log.changedBy.email} - {log.action}</h4>
        <p>{new Date(log.createdAt).toLocaleString()}</p>
        {log.changes && Object.entries(log.changes).map(([field, change]: any) => (
          <p key={field}>{field}: {change.oldValue} → {change.newValue}</p>
        ))}
      </div>
    ))}
  </div>
);
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Table not created | Run `npm run migrate:audit` |
| Logs not appearing | Check server console for errors |
| API returns 404 | Ensure server is restarted after route changes |
| Permission denied | Check authentication token |

## Documentation

- **[AUDIT_LOGGING.md](AUDIT_LOGGING.md)** - Full technical documentation
- **[AUDIT_ARCHITECTURE.md](AUDIT_ARCHITECTURE.md)** - System design & flows
- **[AUDIT_EXAMPLES.md](AUDIT_EXAMPLES.md)** - API examples
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Setup & testing
- **[CHANGES.md](CHANGES.md)** - What was changed

## Next Steps

1. ✅ **Backend**: Run migration, start server, test API
2. 🔄 **Frontend**: Build timeline component (see example above)
3. 🎯 **Display**: Show on person detail page
4. 📊 **Reports**: Optional - add audit reports feature
5. 🔐 **Compliance**: Optional - add rollback functionality

---

**Status**: ✅ Implementation complete and ready to deploy
