# CRM Application - Setup Guide

## Project Overview

Production-ready, responsive CRM application built with:

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- **Backend:** Node.js 20 + Express + TypeScript + Sequelize ORM
- **Database:** MariaDB 11
- **Authentication:** JWT + bcryptjs + TOTP (2FA)

### Key Features

- User login/registration with JWT + 2FA
- People/contacts management with battalion field
- Search, filter, sort, and pagination
- AI integration (OpenAI + Anthropic Claude)
- WhatsApp integration (Green API)
- Excel export + QR code generation
- Responsive design (mobile + desktop)
- Hebrew RTL support

---

## Local Development (Quick Start)

### Prerequisites

- Node.js 18+ (`curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - && dnf install -y nodejs`)
- Docker & Docker Compose (for local DB)

### Step 1: Install Dependencies

```bash
cd /path/to/CRM

cd backend
npm install

cd ../frontend
npm install
cd ..
```

### Step 2: Start Database

```bash
docker-compose up -d
```

Wait for MariaDB to be ready:
```bash
docker-compose logs -f
```

### Step 3: Start Backend

```bash
cd backend
npm run dev
```

Output:
```
Database connected
Server running on http://localhost:3000
```

### Step 4: Start Frontend (new terminal)

```bash
cd frontend
npm run dev
```

Output:
```
VITE v5.0.8  ready in 123 ms
Local:   http://localhost:5173/
```

### Step 5: Open Browser

Navigate to: **http://localhost:5173**

Login with:
- **Email:** admin@crm.com
- **Password:** admin123

---

## Production Deployment (Docker Compose)

Only requirement: Docker + Docker Compose on the server. Everything runs in containers.

```bash
# 1. Upload project to server
cd /home/opc/crm

# 2. Create .env from example
cp .env.prod.example .env
nano .env
```

Edit `.env` with real values:
```env
DB_NAME=crm
DB_USER=crm_user
DB_PASSWORD=YOUR_STRONG_PASSWORD
DB_ROOT_PASSWORD=YOUR_ROOT_STRONG_PASSWORD
JWT_SECRET=run_openssl_rand_-hex_32
PUBLIC_URL=http://YOUR_SERVER_IP
CORS_ORIGIN=http://YOUR_SERVER_IP
```

```bash
# 3. Build and start
sudo docker compose -f docker-compose.prod.yml up -d --build
```

Access: `http://YOUR_SERVER_IP`

### Docker Management

```bash
# Status
docker compose -f docker-compose.prod.yml ps

# Logs (all / specific service)
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml logs -f api

# Restart
docker compose -f docker-compose.prod.yml restart

# Stop
docker compose -f docker-compose.prod.yml down

# Update code and redeploy
git pull
sudo docker compose -f docker-compose.prod.yml up -d --build

# Access DB CLI
docker exec -it crm-db mysql -u crm_user -p crm
```

### How to know you're on the right file?

| Check | dev (`docker-compose.yml`) | prod (`docker-compose.prod.yml`) |
|-------|---------------------------|----------------------------------|
| Frontend port | 5173 (Vite) | 80 (Nginx) |
| Backend exposed | Yes (3000) | No (internal) |
| Bind mount (`./backend:/app`) | Yes | No |
| `npm install` in command | Yes | No (built in image) |
| Passwords | Hardcoded | From `.env` file |

### Architecture

```
User  -->  Nginx/Web (port 80)
            |-- /        -> React static files
            |-- /api/*   -> Backend (port 3000) -> MariaDB (port 3306)
```

---

## Project Structure

```
CRM/
├── backend/
│   ├── src/
│   │   ├── app.ts                 # Express app entry
│   │   ├── config/
│   │   │   └── database.ts        # Sequelize config
│   │   ├── controllers/           # Request handlers
│   │   ├── models/                # Sequelize models
│   │   ├── routes/                # API routes
│   │   ├── middleware/            # Auth, validation
│   │   ├── services/              # Business logic
│   │   └── migrations/
│   │       └── schema.sql         # Database schema
│   ├── Dockerfile                 # Multi-stage production build
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # Main component with routing
│   │   ├── main.tsx               # React entry point
│   │   ├── components/            # Reusable components
│   │   ├── pages/                 # Page components
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── services/              # API calls
│   │   ├── types/                 # TypeScript interfaces
│   │   └── index.css              # Tailwind CSS
│   ├── Dockerfile                 # Multi-stage build + Nginx
│   ├── nginx.conf                 # Nginx config (SPA + reverse proxy)
│   ├── package.json
│   ├── vite.config.ts
│   └── .env
│
├── docker-compose.yml             # Local development (DB only)
├── docker-compose.prod.yml        # Production (all services in Docker)
├── .env.prod.example              # Production env template
├── README.md
└── SETUP.md                       # This file
```

---

## API Endpoints

### Authentication

**POST /auth/login**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@crm.com","password":"admin123"}'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "admin@crm.com",
    "role": "admin"
  }
}
```

**POST /auth/register**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@crm.com","password":"password123"}'
```

### People (Protected - Requires JWT Token)

**GET /people** - List with search, filter, pagination
```bash
curl http://localhost:3000/people \
  -H "Authorization: Bearer <token>" \
  -G \
  --data-urlencode 'search=David' \
  --data-urlencode 'battalion=Golani' \
  --data-urlencode 'page=1' \
  --data-urlencode 'limit=10'
```

**GET /people/:id** - Get by ID
```bash
curl http://localhost:3000/people/1 \
  -H "Authorization: Bearer <token>"
```

**POST /people** - Create
```bash
curl -X POST http://localhost:3000/people \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "0501234567",
    "battalion": "Commando"
  }'
```

**PUT /people/:id** - Update
```bash
curl -X PUT http://localhost:3000/people/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"firstName": "Jonathan", "battalion": "Infantry"}'
```

**DELETE /people/:id** - Delete
```bash
curl -X DELETE http://localhost:3000/people/1 \
  -H "Authorization: Bearer <token>"
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'staff') DEFAULT 'staff',
  totpSecret VARCHAR(255) DEFAULT NULL,
  totpEnabled TINYINT(1) NOT NULL DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### People Table
```sql
CREATE TABLE people (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firstName VARCHAR(100) NOT NULL,
  lastName VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  battalion VARCHAR(100) NOT NULL,
  userId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Environment Variables

### Backend (.env)
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

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
```

---

## Development Commands

### Backend
```bash
cd backend
npm run dev          # Start dev server (hot reload with tsx)
npm run build        # Compile TypeScript to dist/
npm start            # Run production build (node dist/app.js)
npm run migrate      # Run database migrations
```

### Frontend
```bash
cd frontend
npm run dev          # Start Vite dev server (port 5173)
npm run build        # Build optimized production bundle
npm run preview      # Preview production build locally
```

### Database (Local Docker)
```bash
docker-compose up -d          # Start MariaDB
docker-compose logs -f        # View logs
docker-compose down           # Stop
docker-compose down -v        # Stop + delete data
```

---

## Troubleshooting

### Backend won't start
```bash
# Check if port is in use
ss -tlnp | grep 3000       # Linux
lsof -i :3000              # macOS

# Check logs
journalctl -u crm-backend -n 50   # Production
```

### Database connection error
```bash
# Local: check Docker is running
docker-compose ps

# Production: check MariaDB
systemctl status mariadb
mysql -u crm_user -p crm -e "SELECT 1"
```

### CORS error
- Verify `CORS_ORIGIN` in `.env` matches exactly the URL in the browser
- No trailing slash: `http://YOUR_SERVER_IP` (not `http://YOUR_SERVER_IP/`)

### JWT / "Invalid token" error
- Clear browser localStorage (DevTools -> Application -> Clear All)
- Login again
- Verify `JWT_SECRET` has not changed

### Frontend blank page in production
```bash
# Check Nginx config
nginx -t
# Check files exist
ls -la /var/www/crm/index.html
# Check SELinux
setsebool -P httpd_can_network_connect 1
```

---

## Security Features

- Password hashing with bcryptjs (10 salt rounds)
- JWT token-based authentication (24h expiry)
- Two-factor authentication (TOTP/Speakeasy)
- SQL injection prevention (Sequelize parameterized queries)
- Input validation (email, phone, length checks)
- CORS protection
- Helmet security headers
- Role-based endpoint protection
- systemd security hardening (NoNewPrivileges, ProtectSystem, PrivateTmp)

---

## Tech Documentation

- **React:** https://react.dev
- **Vite:** https://vitejs.dev
- **Tailwind CSS:** https://tailwindcss.com
- **Express:** https://expressjs.com
- **Sequelize:** https://sequelize.org
- **TypeScript:** https://www.typescriptlang.org
- **MariaDB:** https://mariadb.org/documentation/

---

## License

MIT
