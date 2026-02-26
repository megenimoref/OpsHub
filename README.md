# CRM Application

Production-quality, responsive web CRM with React frontend, Express backend, and MariaDB database.

## Features

- User authentication (JWT + bcrypt)
- Role-based access control (admin, staff)
- Two-factor authentication (TOTP)
- People/contacts management with battalion field
- Search, filter, and pagination
- AI integration (OpenAI + Anthropic Claude)
- WhatsApp integration (Green API)
- Excel export
- QR code generation
- Responsive design (desktop + mobile)
- RTL support for Hebrew UI
- Input validation and SQL injection prevention

## Tech Stack

**Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Zustand
**Backend:** Node.js 20 + Express + TypeScript + Sequelize ORM
**Database:** MariaDB 11
**Auth:** JWT + bcryptjs + TOTP (Speakeasy)

> For full setup instructions, API docs, and troubleshooting see [`SETUP.md`](SETUP.md)

---

## Local Development (Quick Start)

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for DB)

### 1. Start Database

```bash
docker-compose up -d
```

### 2. Run Backend

```bash
cd backend  
npm install
npm run dev
```

Backend runs on `http://localhost:3000`

### 3. Run Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## Production Deployment (Docker Compose)

Everything runs in containers - no need to install Node.js, MariaDB, or Nginx on the host.

```bash
# 1. Upload project to server
cd /home/opc/crm

# 2. Create .env from example
cp .env.prod.example .env
nano .env   # Set passwords, IP, JWT_SECRET

# 3. Build and start everything
sudo docker compose -f docker-compose.prod.yml up -d --build
```

Update code:
```bash
git pull
sudo docker compose -f docker-compose.prod.yml up -d --build
```

Useful commands:
```bash
docker compose -f docker-compose.prod.yml ps        # Status
docker compose -f docker-compose.prod.yml logs -f    # All logs
docker compose -f docker-compose.prod.yml logs api   # Backend logs
docker compose -f docker-compose.prod.yml down       # Stop all
docker compose -f docker-compose.prod.yml down -v    # Stop + delete DB data
```

### Architecture

```
User  -->  Nginx/Web (port 80)
            |-- /        -> React static files
            |-- /api/*   -> Backend (port 3000) -> MariaDB (port 3306)
```

Access: `http://YOUR_SERVER_IP`

---

## Demo Credentials

- **Email:** admin@crm.com
- **Password:** admin123

**Change the password after first login!**

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

All people endpoints require JWT token:
```
Authorization: Bearer <token>
```

## Database Schema

### Users Table
| Column | Type | Notes |
|--------|------|-------|
| id | INT | PK, auto-increment |
| email | VARCHAR(255) | unique |
| password | VARCHAR(255) | bcrypt hashed |
| role | ENUM | admin / staff |
| totpSecret | VARCHAR(255) | 2FA secret |
| totpEnabled | TINYINT | 2FA on/off |
| createdAt, updatedAt | TIMESTAMP | auto |

### People Table
| Column | Type | Notes |
|--------|------|-------|
| id | INT | PK, auto-increment |
| firstName | VARCHAR(100) | required |
| lastName | VARCHAR(100) | required |
| email | VARCHAR(255) | optional |
| phone | VARCHAR(20) | optional |
| battalion | VARCHAR(100) | required |
| userId | INT | FK to users |
| createdAt, updatedAt | TIMESTAMP | auto |

## Environment Variables

### Backend (`backend/.env`)
```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=crm
DB_USER=root
DB_PASSWORD=change_me
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:5173
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:3000
```

## Security Features

- Password hashing with bcryptjs (10 salt rounds)
- JWT token-based authentication (24h expiry)
- Two-factor authentication (TOTP)
- SQL injection prevention (Sequelize parameterized queries)
- Input validation (email, phone, length checks)
- CORS protection
- Helmet security headers
- Role-based endpoint protection

## License

MIT
