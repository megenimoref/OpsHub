# CRM Application

Production-quality, responsive web CRM with React frontend, Express backend, and MySQL database.

## Features

✅ User authentication (JWT + bcrypt)  
✅ Role-based access control (admin, staff)  
✅ People/contacts management with battalion field  
✅ Search, filter, and pagination  
✅ Responsive design (desktop + mobile)  
✅ RTL support for Hebrew UI  
✅ Input validation and SQL injection prevention  
✅ Docker setup for MySQL

## Tech Stack

**Frontend:** React 18 + TypeScript + Vite + Tailwind CSS  
**Backend:** Node.js + Express + TypeScript + Sequelize ORM  
**Database:** MySQL 8.0  
**Auth:** JWT + bcryptjs

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose

### 1. Start MySQL

```bash
docker-compose up -d
```

Wait for MySQL to be ready (check logs):
```bash
docker-compose logs -f mysql
```

### 2. Install & Run Backend

```bash
cd backend
npm install
npm run dev
```

Backend will run on `http://localhost:3000`

### 3. Install & Run Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:5173`

## Demo Credentials

- **Email:** admin@crm.com
- **Password:** admin123

## API Endpoints

### Auth
- `POST /auth/login` - Login
- `POST /auth/register` - Register new user

### People
- `GET /people` - List people (with search, filter, pagination)
- `GET /people/:id` - Get person by ID
- `POST /people` - Create person
- `PUT /people/:id` - Update person
- `DELETE /people/:id` - Delete person

**All people endpoints require JWT token in Authorization header:**
```
Authorization: Bearer <token>
```

## Database Schema

### Users Table
- `id` (INT, PK, auto-increment)
- `email` (VARCHAR 255, unique)
- `password` (VARCHAR 255, hashed)
- `role` (ENUM: admin | staff)
- `createdAt`, `updatedAt` (timestamps)

### People Table
- `id` (INT, PK, auto-increment)
- `firstName` (VARCHAR 100, required)
- `lastName` (VARCHAR 100, required)
- `email` (VARCHAR 255, optional)
- `phone` (VARCHAR 20, optional)
- `battalion` (VARCHAR 100, required)
- `userId` (INT, FK to users)
- `createdAt`, `updatedAt` (timestamps)

## Environment Variables

### Backend (backend/.env)
```
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=crm_db
DB_USER=crm_user
DB_PASSWORD=crm_password_123
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:5173
```

### Frontend (frontend/.env)
```
VITE_API_URL=http://localhost:3000
```

## Development

### Backend
```bash
cd backend
npm run dev         # Start dev server with hot reload
npm run build       # Build for production
npm start           # Run production build
npm run migrate     # Sync database models
```

### Frontend
```bash
cd frontend
npm run dev         # Start dev server with Vite
npm run build       # Build for production
npm run preview     # Preview production build
```

## Security Features

✅ Password hashing with bcryptjs (10 salt rounds)  
✅ JWT token-based authentication (24h expiry)  
✅ SQL injection prevention (Sequelize parameterized queries)  
✅ Input validation (email, phone, length checks)  
✅ CORS protection  
✅ Helmet security headers  
✅ Role-based endpoint protection  

## RTL Support

The frontend supports Hebrew RTL layout. To enable RTL:
1. Add `dir="rtl"` to the html element
2. Tailwind RTL classes will automatically apply

## Production Deployment

1. Build backend: `cd backend && npm run build`
2. Build frontend: `cd frontend && npm run build`
3. Deploy backend/dist to Node.js server
4. Deploy frontend/dist to static host
5. Update environment variables
6. Set up MySQL on production server
7. Run migrations on production database

## Troubleshooting

### MySQL connection errors
- Ensure Docker container is running: `docker-compose ps`
- Check logs: `docker-compose logs mysql`
- Verify credentials in backend/.env

### CORS errors
- Ensure CORS_ORIGIN in backend/.env matches frontend URL
- Default is `http://localhost:5173`

### JWT errors
- Check token is sent in Authorization header
- Verify JWT_SECRET is the same in backend

### TypeScript errors
- Install dependencies: `npm install`
- Build: `npm run build`

## License

MIT
