/**
 * Example: Testing the Audit Log System
 * 
 * These are example requests to test the audit logging functionality
 * You can use curl, Postman, or any API client
 */

// 1. CREATE a new soldier (will auto-log)
curl -X POST http://localhost:5000/api/people \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Israel",
    "lastName": "Cohen",
    "email": "israel.cohen@example.com",
    "phone": "0501234567",
    "battalion": "גולני"
  }'
// Response: { id: 1, firstName: "Israel", ... }
// Audit Log Entry Created:
// {
//   "userId": 1,
//   "entityType": "person",
//   "entityId": 1,
//   "action": "CREATE",
//   "changes": {
//     "firstName": { "oldValue": null, "newValue": "Israel" },
//     "lastName": { "oldValue": null, "newValue": "Cohen" },
//     "email": { "oldValue": null, "newValue": "israel.cohen@example.com" },
//     "phone": { "oldValue": null, "newValue": "0501234567" },
//     "battalion": { "oldValue": null, "newValue": "גולני" }
//   }
// }

// 2. UPDATE the soldier record (will auto-log changes)
curl -X PUT http://localhost:5000/api/people/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "David",
    "phone": "0509876543"
  }'
// Response: { id: 1, firstName: "David", phone: "0509876543", ... }
// Audit Log Entry Created:
// {
//   "userId": 1,
//   "entityType": "person",
//   "entityId": 1,
//   "action": "UPDATE",
//   "changes": {
//     "firstName": { "oldValue": "Israel", "newValue": "David" },
//     "phone": { "oldValue": "0501234567", "newValue": "0509876543" }
//   }
// }

// 3. GET audit trail for the soldier
curl -X GET "http://localhost:5000/api/people/1/audit-log?limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_TOKEN"
// Response:
// {
//   "total": 2,
//   "logs": [
//     {
//       "id": 2,
//       "userId": 1,
//       "action": "UPDATE",
//       "changes": {
//         "firstName": { "oldValue": "Israel", "newValue": "David" },
//         "phone": { "oldValue": "0501234567", "newValue": "0509876543" }
//       },
//       "createdAt": "2026-02-23T10:30:45.000Z",
//       "changedBy": { "id": 1, "email": "admin@crm.com" }
//     },
//     {
//       "id": 1,
//       "userId": 1,
//       "action": "CREATE",
//       "changes": {
//         "firstName": { "oldValue": null, "newValue": "Israel" },
//         "lastName": { "oldValue": null, "newValue": "Cohen" },
//         "email": { "oldValue": null, "newValue": "israel.cohen@example.com" },
//         "phone": { "oldValue": null, "newValue": "0501234567" },
//         "battalion": { "oldValue": null, "newValue": "גולני" }
//       },
//       "createdAt": "2026-02-23T10:25:12.000Z",
//       "changedBy": { "id": 1, "email": "admin@crm.com" }
//     }
//   ]
// }

// 4. DELETE the soldier (will auto-log deletion with all old values)
curl -X DELETE http://localhost:5000/api/people/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
// Response: { message: "Person deleted" }
// Audit Log Entry Created:
// {
//   "userId": 1,
//   "entityType": "person",
//   "entityId": 1,
//   "action": "DELETE",
//   "changes": {
//     "firstName": { "oldValue": "David", "newValue": null },
//     "lastName": { "oldValue": "Cohen", "newValue": null },
//     "email": { "oldValue": "israel.cohen@example.com", "newValue": null },
//     "phone": { "oldValue": "0509876543", "newValue": null },
//     "battalion": { "oldValue": "גולני", "newValue": null }
//   }
// }

// 5. SQL queries to verify audit logs in the database

// See all changes for a specific person:
SELECT * FROM audit_logs 
WHERE entityType = 'person' AND entityId = 1 
ORDER BY createdAt DESC;

// See all changes by a specific user:
SELECT * FROM audit_logs 
WHERE userId = 1 
ORDER BY createdAt DESC;

// See what was changed today:
SELECT * FROM audit_logs 
WHERE DATE(createdAt) = CURDATE() 
ORDER BY createdAt DESC;

// See the full history with user info:
SELECT 
  a.id,
  u.email as changedByEmail,
  a.entityType,
  a.entityId,
  a.action,
  a.changes,
  a.createdAt
FROM audit_logs a
LEFT JOIN users u ON a.userId = u.id
WHERE a.entityType = 'person' AND a.entityId = 1
ORDER BY a.createdAt DESC;
