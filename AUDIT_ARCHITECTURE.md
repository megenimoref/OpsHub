# Audit Logging System - Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Application                       │
│  (React Frontend - Display Timeline/Activity Feed)           │
└────────────────────────┬────────────────────────────────────┘
                         │
                    HTTP/REST API
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Backend (Node.js/Express)                 │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │ HTTP Request     │  │   peopleController.ts            │ │
│  │                  │  │                                  │ │
│  │ POST   /people   │──│ createPerson()                   │ │
│  │ PUT    /people/1 │──│ updatePerson()                   │ │
│  │ DELETE /people/1 │──│ deletePerson()                   │ │
│  │ GET /people/1/   │──│ getPersonAuditLog()              │ │
│  │   audit-log      │  │                                  │ │
│  └──────────────────┘  └────┬─────────────────────────────┘ │
│                             │                                │
│                    ┌────────▼──────────┐                    │
│                    │  auditService.ts  │                    │
│                    │                   │                    │
│                    │ logAudit()        │                    │
│                    │ detectChanges()   │                    │
│                    │ getAuditLog()     │                    │
│                    └────────┬──────────┘                    │
│                             │                                │
└─────────────────────────────┼────────────────────────────────┘
                              │
                         MySQL Database
                              │
      ┌───────────────────────┼───────────────────────┐
      │                       │                       │
      │                       │                       │
 ┌────▼────┐           ┌──────▼──────┐         ┌────▼────┐
 │  users  │           │   people    │         │audit_logs
 │         │           │             │         │
 │ id (PK) │◄──────┐   │ id (PK)     │    ┌────│ id (PK)
 │ email   │       │   │ firstName   │    │    │ userId (FK)
 │ role    │       │   │ lastName    │    │    │ entityType
 └─────────┘       │   │ battalion   │    │    │ entityId
                   │   │ userId (FK) ├────┘    │ action
                   │   │ createdAt   │         │ changes (JSON)
                   │   │ updatedAt   │         │ createdAt
                   │   └─────────────┘         └──────────┘
                   │
                   └─ Foreign Key Reference

```

## Data Flow - Update Operation

```
┌──────────────────────────────────────────────────────────────┐
│ 1. User sends: PUT /api/people/123                           │
│    Body: { firstName: "David", phone: "0509876543" }         │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. Controller: updatePerson()                                │
│                                                               │
│   a) Fetch person record from database:                      │
│      { id: 123, firstName: "Israel", phone: "0501234567" }   │
│                                                               │
│   b) Store OLD data: oldData = person.toJSON()               │
│                                                               │
│   c) Apply updates to person object                          │
│                                                               │
│   d) Save to database                                        │
│                                                               │
│   e) Get NEW data: newData = person.toJSON()                │
│                                                               │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Service: detectChanges(oldData, newData)                  │
│                                                               │
│   Compare and find differences:                              │
│   {                                                           │
│     "firstName": {                                           │
│       "oldValue": "Israel",                                  │
│       "newValue": "David"                                    │
│     },                                                        │
│     "phone": {                                               │
│       "oldValue": "0501234567",                              │
│       "newValue": "0509876543"                               │
│     }                                                         │
│   }                                                           │
│                                                               │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. Service: logAudit(userId, 'person', 123, 'UPDATE', changes)
│                                                               │
│   Insert into audit_logs:                                    │
│   {                                                           │
│     userId: 1,                                               │
│     entityType: 'person',                                    │
│     entityId: 123,                                           │
│     action: 'UPDATE',                                        │
│     changes: { ... },                                        │
│     createdAt: '2026-02-23T10:30:45Z'                        │
│   }                                                           │
│                                                               │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. Return to Client:                                         │
│   { id: 123, firstName: "David", phone: "0509876543", ... }  │
│                                                               │
│   ✓ Person updated successfully                             │
│   ✓ Audit log entry created                                 │
│   ✓ Timeline updated                                        │
└──────────────────────────────────────────────────────────────┘
```

## Audit Log Retrieval Flow

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Client requests: GET /api/people/123/audit-log            │
│    Parameters: ?limit=10&offset=0                            │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. Controller: getPersonAuditLog()                           │
│                                                               │
│   a) Verify person exists and belongs to user                │
│   b) Call auditService.getAuditLog()                         │
│                                                               │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Service: getAuditLog()                                    │
│                                                               │
│   Query:                                                      │
│   SELECT * FROM audit_logs                                   │
│   WHERE entityType = 'person' AND entityId = 123             │
│   ORDER BY createdAt DESC                                    │
│   LIMIT 10 OFFSET 0                                          │
│                                                               │
│   WITH JOIN to users table for changedBy info                │
│                                                               │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. Return to Client:                                         │
│   {                                                           │
│     "total": 3,                                              │
│     "logs": [                                                │
│       {                                                       │
│         "id": 3,                                             │
│         "action": "UPDATE",                                  │
│         "changes": { ... },                                  │
│         "createdAt": "2026-02-23T10:30:45Z",                 │
│         "changedBy": {                                       │
│           "id": 1,                                           │
│           "email": "admin@crm.com"                           │
│         }                                                     │
│       },                                                      │
│       { ... more entries ... }                               │
│     ]                                                         │
│   }                                                           │
│                                                               │
│   ✓ Frontend can now display timeline                        │
│   ✓ Shows who changed what and when                         │
└──────────────────────────────────────────────────────────────┘
```

## Database Relationships

```
┌──────────────┐                    ┌──────────────┐
│   users      │                    │   people     │
├──────────────┤                    ├──────────────┤
│ id (PK)      │ 1                N │ id (PK)      │
│ email        │◄─────────────────►│ firstName    │
│ password     │ FK: userId         │ lastName     │
│ role         │                    │ battalion    │
│              │                    │ userId (FK)  │
└──────────────┘                    └──────────────┘
       △                                    △
       │                                    │
       │ 1                             N    │
       └────── FK: userId ──────────────────┤
              ┌───────────────┐            │
              │  audit_logs   │            │
              ├───────────────┤            │
              │ id (PK)       │            │
              │ userId (FK) ──┼──────┐     │
              │ entityType    │      │     │
              │ entityId  ────┼──────┘     │
              │ action        │            │
              │ changes (JSON)│            │
              │ createdAt     │            │
              └───────────────┘            │

   Relationships:
   users → audit_logs (1:N) - Who made the change
   people → audit_logs (1:N) - What was changed (via entityId)
```

## Example Timeline Display

```
Timeline for Person #123 (Israel Cohen)

┌─────────────────────────────────────────────────┐
│ Update by admin@crm.com at 2026-02-23 10:30:45 │
│                                                 │
│ • firstName: "Israel" → "David"                 │
│ • phone: "0501234567" → "0509876543"            │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Update by admin@crm.com at 2026-02-23 09:45:30 │
│                                                 │
│ • battalion: "גולני" → "גבעותי"                  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Created by admin@crm.com at 2026-02-23 09:15:22 │
│                                                 │
│ • firstName: null → "Israel"                    │
│ • lastName: null → "Cohen"                      │
│ • email: null → "israel.cohen@example.com"      │
│ • battalion: null → "גולני"                     │
└─────────────────────────────────────────────────┘
```

## Performance Indexes

```sql
-- Index on userId (fast: "Who changed what?")
CREATE INDEX idx_userId ON audit_logs(userId);

-- Index on entity (fast: "What changes for this person?")
CREATE INDEX idx_entity ON audit_logs(entityType, entityId);

-- Index on timestamp (fast: "What changed today?")
CREATE INDEX idx_createdAt ON audit_logs(createdAt);

-- Composite index for efficient queries
CREATE INDEX idx_entity_date ON audit_logs(entityType, entityId, createdAt DESC);
```

These indexes ensure:
- O(log N) lookup time
- No full table scans
- Scalable to millions of records
