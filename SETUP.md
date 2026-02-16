# CRM Application - Complete Setup Guide

## 📋 Project Overview

This is a **production-ready, responsive CRM application** built with:

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript + Sequelize ORM
- **Database:** MySQL 8.0
- **Authentication:** JWT + bcryptjs (password hashing)
- **Authorization:** Role-based access control (admin, staff)

### Key Features

✅ User login/registration with JWT  
✅ People/contacts management with battalion field  
✅ Search, filter, sort, and pagination  
✅ Responsive design (mobile + desktop)  
✅ Hebrew RTL support ready  
✅ Input validation & SQL injection prevention  
✅ Docker support for MySQL  
✅ Production-quality code structure  

---

## 🚀 Quick Start (5 minutes)

### Prerequisites

1. **Node.js 18+** - Download from https://nodejs.org/
2. **Docker & Docker Compose** - Download from https://www.docker.com/products/docker-desktop
3. **Git** (optional) - Download from https://git-scm.com/

### Step 1: Install Node.js

1. Go to https://nodejs.org/
2. Download the **LTS version** (18.18.2 or higher)
3. Run the installer (accept all defaults)
4. **Restart your terminal/PowerShell**
5. Verify installation:
```bash
node --version
npm --version
```

### Step 2: Setup Project Dependencies

**On Windows (PowerShell):**
```powershell
# Navigate to project
cd C:\CRM

# Run setup script
.\setup.bat
```

**On macOS/Linux:**
```bash
cd /path/to/CRM
chmod +x setup.sh
./setup.sh
```

Or **manually install** (all platforms):
```bash
cd backend
npm install

cd ../frontend
npm install
cd ..
```

### Step 3: Start MySQL

Open terminal and run:
```bash
docker-compose up -d
```

Wait for MySQL to be ready (~10 seconds), then verify:
```bash
docker-compose logs mysql
```

Look for: `ready for connections`

### Step 4: Start Backend

Open **new terminal** and run:
```bash
cd backend
npm run dev
```

You should see:
```
✓ Database connected
✓ Models synced
✓ Server running on http://localhost:3000
```

### Step 5: Start Frontend

Open **another new terminal** and run:
```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v5.0.8  ready in 123 ms
  ➜  Local:   http://localhost:5173/
```

### Step 6: Open Browser

Navigate to: **http://localhost:5173**

Login with:
- **Email:** admin@crm.com
- **Password:** admin123

---

## 📁 Project Structure

```
C:\CRM/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── user.ts           # User model (email, password, role)
│   │   │   └── person.ts         # Person model (firstName, lastName, battalion)
│   │   ├── controllers/
│   │   │   ├── authController.ts # Login, register
│   │   │   └── peopleController.ts # CRUD for people
│   │   ├── routes/
│   │   │   ├── auth.ts           # Auth routes
│   │   │   └── people.ts         # People routes
│   │   ├── middleware/
│   │   │   └── auth.ts           # JWT verification & role checks
│   │   ├── config/
│   │   │   └── database.ts       # Sequelize config
│   │   ├── migrations/
│   │   │   ├── schema.sql        # Database schema
│   │   │   └── run.ts            # Migration runner
│   │   └── app.ts                # Express app entry
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── .gitignore
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.tsx         # Login form
│   │   │   ├── PeopleList.tsx    # People table with search/filter
│   │   │   ├── PersonForm.tsx    # Create/edit person form
│   │   │   └── ProtectedRoute.tsx # Protected route wrapper
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── PeoplePage.tsx
│   │   │   ├── PersonCreatePage.tsx
│   │   │   └── PersonEditPage.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts        # Auth store (Zustand)
│   │   │   └── usePeople.ts      # People API hooks
│   │   ├── services/
│   │   │   ├── api.ts            # Axios instance with interceptors
│   │   │   └── authService.ts    # Auth & People API calls
│   │   ├── types/
│   │   │   └── index.ts          # TypeScript interfaces
│   │   ├── App.tsx               # Main app component with routing
│   │   ├── main.tsx              # React entry point
│   │   └── index.css             # Tailwind CSS
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── .env.example
│   └── .gitignore
│
├── docker-compose.yml             # MySQL service config
├── .gitignore
├── setup.bat                       # Windows setup script
├── setup.sh                        # macOS/Linux setup script
├── README.md                       # Main documentation
└── SETUP.md                        # This file
```

---

## 🔐 Authentication & Security

### Login Flow

1. User enters email & password on `/login`
2. Backend validates credentials
3. Backend hashes password with bcrypt and compares
4. Backend generates JWT token (24h expiry)
5. Token stored in localStorage
6. Token sent in `Authorization: Bearer <token>` header on API calls
7. Backend middleware verifies token on protected routes

### Password Security

- Passwords hashed with **bcryptjs** (10 salt rounds)
- Never stored in plain text
- Demo password `admin123` is hashed as:
  ```
  $2a$10$W9/cIPP91PSMaI4HF0s5/.8IA4MWI6dFpfJaD7.5YgLd7mzfvHlim
  ```

### SQL Injection Prevention

- All database queries use **Sequelize parameterized queries**
- No string concatenation in queries
- Input validation on all endpoints

### Input Validation

- Email format validation
- Phone format validation (optional)
- String length limits (max 100 for names/battalion)
- Required field checks

---

## 📡 API Endpoints

### Authentication

**POST /auth/login**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@crm.com","password":"admin123"}'

# Response
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
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@crm.com","password":"password123"}'
```

### People (Protected - Requires JWT Token)

**GET /people**
```bash
curl http://localhost:3000/people \
  -H "Authorization: Bearer <token>" \
  -G \
  --data-urlencode 'search=David' \
  --data-urlencode 'battalion=Golani' \
  --data-urlencode 'page=1' \
  --data-urlencode 'limit=10'

# Response
{
  "total": 15,
  "page": 1,
  "limit": 10,
  "data": [
    {
      "id": 1,
      "firstName": "David",
      "lastName": "Cohen",
      "email": "david@example.com",
      "phone": "0501234567",
      "battalion": "Golani",
      "userId": 1,
      "createdAt": "2026-02-15T10:00:00Z",
      "updatedAt": "2026-02-15T10:00:00Z"
    }
  ]
}
```

**GET /people/:id**
```bash
curl http://localhost:3000/people/1 \
  -H "Authorization: Bearer <token>"
```

**POST /people**
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

**PUT /people/:id**
```bash
curl -X PUT http://localhost:3000/people/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jonathan",
    "battalion": "Infantry"
  }'
```

**DELETE /people/:id**
```bash
curl -X DELETE http://localhost:3000/people/1 \
  -H "Authorization: Bearer <token>"
```

---

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,        -- Hashed with bcryptjs
  role ENUM('admin', 'staff') DEFAULT 'staff',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);
```

### People Table
```sql
CREATE TABLE people (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firstName VARCHAR(100) NOT NULL,
  lastName VARCHAR(100) NOT NULL,
  email VARCHAR(255),                    -- Optional
  phone VARCHAR(20),                     -- Optional
  battalion VARCHAR(100) NOT NULL,       -- Required field
  userId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_battalion (battalion),
  INDEX idx_name (firstName, lastName)
);
```

**Sample Data:**
```sql
-- Admin user (email: admin@crm.com, password: admin123)
INSERT INTO users VALUES (1, 'admin@crm.com', '$2a$10$...', 'admin', NOW(), NOW());

-- Sample people
INSERT INTO people VALUES 
  (1, 'David', 'Cohen', 'david@example.com', '0501234567', 'Golani', 1, NOW(), NOW()),
  (2, 'Sarah', 'Levi', 'sarah@example.com', '0502345678', 'Infantry', 1, NOW(), NOW());
```

---

## 🛠️ Development Commands

### Backend

```bash
cd backend

# Start dev server (with hot reload)
npm run dev

# Build for production
npm run build

# Start production build
npm start

# Sync database models
npm run migrate
```

### Frontend

```bash
cd frontend

# Start dev server (Vite)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Database

```bash
# View logs
docker-compose logs -f mysql

# Stop MySQL
docker-compose down

# Stop and remove volume (WARNING: deletes data)
docker-compose down -v

# Access MySQL CLI
docker exec -it crm_mysql mysql -u crm_user -p
# Password: crm_password_123
```

---

## 🌍 Environment Configuration

### Backend (.env)
```ini
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=crm_db
DB_USER=crm_user
DB_PASSWORD=crm_password_123

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)
```ini
VITE_API_URL=http://localhost:3000
```

---

## 🐳 Docker Commands

```bash
# Start MySQL in background
docker-compose up -d

# View MySQL logs
docker-compose logs mysql

# Stop all services
docker-compose down

# Remove volume (delete data)
docker-compose down -v

# Run MySQL commands
docker exec -it crm_mysql mysql -u crm_user -p crm_db
```

---

## 🔍 Troubleshooting

### "npm: command not found"
- **Solution:** Node.js not installed or not in PATH
- Reinstall Node.js from https://nodejs.org/
- Restart terminal after installation

### "Cannot GET /people"
- **Solution:** Backend not running
- Ensure `npm run dev` is running in backend folder
- Check backend is on http://localhost:3000

### "Network Error" when logging in
- **Solution:** CORS issue
- Verify CORS_ORIGIN in backend/.env matches frontend URL (default: http://localhost:5173)
- Check backend server is running

### "MySQL connection error"
- **Solution:** MySQL not running
- Run `docker-compose up -d`
- Wait 10 seconds for MySQL to start
- Check `docker-compose logs mysql`

### "Invalid token" after login
- **Solution:** Token validation issue
- Clear localStorage: Open DevTools → Application → Storage → Clear All
- Login again
- Verify JWT_SECRET is same in backend/.env

### Port already in use
- **Backend (3000):** Kill process or change PORT in .env
- **Frontend (5173):** Kill process or change port in vite.config.ts
- **MySQL (3306):** Kill Docker container or change port in docker-compose.yml

### Database already exists
- Delete old data: `docker-compose down -v`
- Restart: `docker-compose up -d`

---

## 📱 RTL (Hebrew) Support

The frontend is ready for Hebrew RTL. To enable:

1. Add to `frontend/src/App.tsx`:
```tsx
useEffect(() => {
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = 'he';
}, []);
```

2. Tailwind RTL classes will automatically apply

3. Labels, field names, and UI text can be Hebrew

---

## 🚢 Production Deployment

### Build

```bash
# Backend
cd backend
npm run build
# Output: backend/dist/

# Frontend
cd frontend
npm run build
# Output: frontend/dist/
```

### Deploy

1. **Backend (Node.js server):**
   - Upload `backend/dist` to server
   - Upload `.env` with production values
   - Install: `npm install --production`
   - Start: `npm start`

2. **Frontend (Static host / CDN):**
   - Upload `frontend/dist` to Netlify, Vercel, AWS S3, etc.
   - Update VITE_API_URL to production API URL

3. **Database:**
   - Set up MySQL on production server
   - Run migrations
   - Update DB_HOST, DB_USER, DB_PASSWORD in backend/.env

4. **Environment Variables:**
   - Change JWT_SECRET to strong random string
   - Use HTTPS for all connections
   - Set secure CORS_ORIGIN

---

## 📚 Tech Documentation

- **React:** https://react.dev
- **Vite:** https://vitejs.dev
- **Tailwind CSS:** https://tailwindcss.com
- **Express:** https://expressjs.com
- **Sequelize:** https://sequelize.org
- **TypeScript:** https://www.typescriptlang.org
- **JWT:** https://jwt.io
- **bcryptjs:** https://github.com/dcodeIO/bcrypt.js

---

## 📄 License

MIT

---

## ❓ Need Help?

1. Check troubleshooting section above
2. Review logs: `docker-compose logs -f`
3. Check backend console for errors
4. Verify all ports are available and services running
5. Confirm Node.js 18+ is installed: `node --version`

---

**Happy coding! 🎉**
