# CRM - מדריך התקנה על CentOS

## דרישות מקדימות

- שרת CentOS 9 Stream (או CentOS 8+)
- גישת root (או sudo)
- IP ציבורי
- חיבור אינטרנט (להורדת חבילות)

---

## מבנה הקבצים

```
deploy/
├── 01-install-packages.sh   # התקנת כל החבילות הנדרשות
├── 02-setup-backend.sh      # הגדרת Backend כ-systemd service
├── 03-setup-frontend.sh     # הגדרת Frontend עם Nginx
└── DEPLOY-GUIDE.md          # המדריך הזה
```

---

## שלב 0 - העלאת הפרויקט לשרת

העתק את תיקיית הפרויקט לשרת. אפשר עם `scp` או `git clone`:

```bash
# אופציה 1: עם git
cd /root
git clone <your-repo-url> CRM

# אופציה 2: עם scp (מהמחשב המקומי)
scp -r ./CRM root@YOUR_SERVER_IP:/root/CRM
```

ודא שהתיקייה נמצאת ב-`/root/CRM/`. אם היא במקום אחר, ערוך את המשתנה בסקריפטים.

---

## שלב 1 - התקנת חבילות

```bash
cd /root/CRM/deploy
chmod +x *.sh
bash 01-install-packages.sh
```

### מה מותקן:
| חבילה | גרסה | תפקיד |
|--------|--------|--------|
| Node.js | 20 LTS | הרצת Backend |
| MariaDB | 11 | מסד נתונים |
| Nginx | latest | שרת web ל-Frontend + reverse proxy |
| Firewall | - | פתיחת פורטים 80/443 |

### אחרי ההרצה:
```bash
# אבטחת מסד הנתונים (מומלץ מאוד!)
mysql_secure_installation
```
- בחר סיסמא ל-root של MariaDB
- ענה Y לכל השאלות

---

## שלב 2 - הגדרת Backend

```bash
bash 02-setup-backend.sh
```

### מה קורה:
1. נוצר משתמש `crm` ייעודי (אבטחה)
2. הקוד מועתק ל-`/opt/crm/backend/`
3. Dependencies מותקנים ו-TypeScript נבנה
4. סכמת מסד הנתונים מיובאת
5. נוצר קובץ `.env`
6. נוצר systemd service שרץ אוטומטית

### חובה לערוך אחרי ההרצה:
```bash
nano /opt/crm/backend/.env
```

שנה את הערכים הבאים:

```env
DB_PASSWORD=הסיסמא_שבחרת_בשלב_1
JWT_SECRET=מחרוזת_אקראית_ארוכה
CORS_ORIGIN=http://YOUR_SERVER_IP
```

ליצירת JWT_SECRET אקראי:
```bash
openssl rand -hex 32
```

אחרי העריכה, הפעל מחדש:
```bash
systemctl restart crm-backend
```

### פקודות שימושיות:
```bash
# בדיקת סטטוס
systemctl status crm-backend

# צפייה בלוגים בזמן אמת
journalctl -u crm-backend -f

# הפעלה מחדש
systemctl restart crm-backend

# עצירה
systemctl stop crm-backend
```

---

## שלב 3 - הגדרת Frontend

```bash
bash 03-setup-frontend.sh
```

### מה קורה:
1. הסקריפט מזהה אוטומטית את ה-IP הציבורי של השרת
2. נבנה ה-Frontend עם ה-API URL הנכון
3. הקבצים מועתקים ל-`/var/www/crm/`
4. Nginx מוגדר עם:
   - שירות קבצים סטטיים (Frontend)
   - Reverse proxy מ-`/api/` ל-Backend (port 3000)
   - דחיסת gzip
   - Cache לקבצים סטטיים
   - Security headers

### אחרי ההרצה:
עדכן את ה-CORS ב-Backend:
```bash
nano /opt/crm/backend/.env
# שנה CORS_ORIGIN=http://YOUR_SERVER_IP

systemctl restart crm-backend
```

---

## בדיקה שהכל עובד

```bash
# 1. בדוק שה-Backend רץ
systemctl status crm-backend
# צריך להראות: active (running)

# 2. בדוק שה-Backend מגיב
curl http://localhost:3000

# 3. בדוק שה-Frontend מוגש דרך Nginx
curl http://localhost

# 4. בדוק מבחוץ (מהדפדפן)
# http://YOUR_SERVER_IP
```

---

## ארכיטקטורה

```
                    ┌─────────────────────────────┐
  משתמש ────────────►        Nginx (port 80)       │
                    │                             │
                    │  /           → קבצי Frontend │
                    │  /api/*      → Backend:3000  │
                    └──────┬──────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   Backend   │
                    │  (port 3000)│
                    │  systemd    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  MariaDB    │
                    │ (port 3306) │
                    │  systemd    │
                    └─────────────┘
```

- **Nginx** - מקבל את כל התעבורה בפורט 80
  - בקשות רגילות (`/`) → מחזיר את קבצי ה-React
  - בקשות API (`/api/*`) → מעביר ל-Backend בפורט 3000
- **Backend** - Express.js API, רץ כ-systemd service
- **MariaDB** - מסד נתונים, רץ כ-systemd service

---

## פתרון בעיות

### Backend לא עולה
```bash
# בדוק לוגים
journalctl -u crm-backend -n 50

# בדוק שהפורט פנוי
ss -tlnp | grep 3000

# בדוק חיבור ל-DB
mysql -u crm_user -p crm -e "SELECT 1"
```

### האתר לא נטען מבחוץ
```bash
# בדוק firewall
firewall-cmd --list-all

# בדוק Nginx
nginx -t
systemctl status nginx

# בדוק SELinux
getenforce
# אם Enforcing, ודא ש:
setsebool -P httpd_can_network_connect 1
```

### שגיאת CORS
```bash
# ודא שה-CORS_ORIGIN תואם בדיוק
cat /opt/crm/backend/.env | grep CORS
# צריך להיות: CORS_ORIGIN=http://YOUR_SERVER_IP
# (בלי / בסוף!)
```

---

## עדכון גרסה

כשיש גרסה חדשה של הקוד:

```bash
# 1. עדכון Backend
cd /root/CRM
git pull
cp -r backend/* /opt/crm/backend/
cd /opt/crm/backend
npm ci --omit=dev
npm run build
systemctl restart crm-backend

# 2. עדכון Frontend
cd /root/CRM/frontend
npm ci
npm run build
cp -r dist/* /var/www/crm/
```

---

## משתמש ברירת מחדל

לאחר ההתקנה, אפשר להתחבר עם:
- **Email:** admin@crm.com
- **Password:** admin123

**חשוב: שנה את הסיסמא מיד אחרי ההתחברות הראשונה!**
