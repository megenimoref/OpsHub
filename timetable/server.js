const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

// Verifies an HMAC-signed SSO payload issued by the OpsHub backend
// (see backend/src/controllers/timetableSsoController.ts). Returns the role
// asserted by the signature ('user' | 'admin') if valid, or null if the
// signature is missing/invalid/expired. The signing string format and order
// MUST stay in sync with the issuer.
function verifySsoSignature(email, role, exp, sig) {
  const secret = process.env.TIMETABLE_SSO_SECRET;
  if (!secret) return null;
  if (!email || !role || !exp || !sig) return null;
  if (role !== 'user' && role !== 'admin') return null;

  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Date.now()) return null;

  const payload = `${email.trim().toLowerCase()}|${role}|${expNum}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  // timingSafeEqual requires equal lengths — guard before calling.
  const got = Buffer.from(String(sig), 'hex');
  const want = Buffer.from(expected, 'hex');
  if (got.length !== want.length) return null;
  if (!crypto.timingSafeEqual(got, want)) return null;

  return role;
}

const app = express();
const PORT = process.env.PORT || 5222;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Database Setup ───────────────────────────────────────────────────────────
const dbPath = process.env.DB_PATH || path.join(__dirname, 'timetable.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL UNIQUE,
    password          TEXT NOT NULL,
    role              TEXT NOT NULL DEFAULT 'user',
    birth_date        TEXT DEFAULT '',
    id_number         TEXT DEFAULT '',
    address           TEXT DEFAULT '',
    phone             TEXT DEFAULT '',
    email             TEXT DEFAULT '',
    vehicle           TEXT DEFAULT '',
    employment        TEXT DEFAULT '',
    family_status     TEXT DEFAULT '',
    emergency_name    TEXT DEFAULT '',
    emergency_phone   TEXT DEFAULT '',
    notes             TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS schedule (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL,
    date       TEXT NOT NULL,
    shift_type TEXT DEFAULT '',
    note       TEXT DEFAULT '',
    added_by   TEXT DEFAULT '',
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, date),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS clock_events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL,
    type       TEXT NOT NULL CHECK(type IN ('in','out')),
    timestamp  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Add columns if upgrading from old schema
const schCols = db.prepare("PRAGMA table_info(schedule)").all().map(c=>c.name);
if (!schCols.includes('added_by')) {
  db.exec("ALTER TABLE schedule ADD COLUMN added_by TEXT DEFAULT ''");
}
const cols = db.prepare("PRAGMA table_info(users)").all().map(c=>c.name);
const newCols = ['birth_date','id_number','address','phone','email','vehicle','employment','family_status','emergency_name','emergency_phone','notes'];
for (const col of newCols) {
  if (!cols.includes(col)) {
    db.exec(`ALTER TABLE users ADD COLUMN ${col} TEXT DEFAULT ''`);
  }
}

// Seed users if table is empty
const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
if (userCount.cnt === 0) {
  const insert = db.prepare(`INSERT INTO users (id,name,password,role,birth_date,id_number,address,phone,email,vehicle,employment,family_status,emergency_name,emergency_phone) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const seedUsers = db.transaction(() => {
    insert.run('1','יקי קינן','1234','user','04/10/1982','7192315','סשה ארגוב 28, רעננה','0547796571','yaki.k9@gmail.com','רכב פרטי','שכיר','נשוי + 2','שני (אשתו)','0546812140');
    insert.run('2','מוריאל קוט','1234','user','15/09/1980','6980777','יפה נוף 17, פדואל','0533545552','morielkott@gmail.com','רכב פרטי','עו״ד עצמאי','נשוי + 6','ענבל (רעייתו)','0508613614');
    insert.run('3','אביתר כהן','1234','user','02/09/1985','7435564','חוגלה 19, פרדס חנה','0523003005','993350@gmail.com','','עצמאי, עו״ד','נשוי + 7','טליה (אשתו)','0527710717');
    insert.run('4','אורנה אביקזר','1234','user','12/08/1973','3881988','ארלוזורוב 33, נתניה','0525555658','ornaavikzar@gmail.com','','שכירה','יחידנית + 2 בנים (10, 16)','נורית (אחות)','0543055697');
    insert.run('5','רוני פסאי','1234','user','05/08/1980','6919082','פעמונית 16, נס ציונה','0528459277','ronips2@gmail.com','רכב פרטי','עצמאי','נשוי + 2 (2, 3)','מיטל פסאי','0528936670');
    insert.run('6','שלומי אזולאי','1234','user','27/05/1978','6349409','אהוד מנור 1, באר יעקב','0523954499','admin2@crm.com','רכב פרטי','שכיר','נשוי + 3','הילה אזולאי','0544887181');
    insert.run('7','שגיא בר און','1234','user','08/01/1976','5171295','הצאלון 2, קיבוץ פלמחים','0549995050','sagi.baron76@gmail.com','רכב פרטי','שכיר, עצמאי וסטודנט','בזוגיות + 2 בנות (9, 12)','מור (זוגתו)','0524436581');
    insert.run('8','איתי רוזן','1234','user','25/02/1991','7483850','אהוד מנור 3, באר יעקב','0542143435','itaya577@gmail.com','רכב פרטי','שכיר ועצמאי','נשוי + 3','נעמה (אשתו)','0524650476');
    insert.run('9','הדס פלודה','1234','user','30/08/1985','5699071','סמטת שיטה 27, שדי חמד','0522231706','daya.hadas@gmail.com','רכב פרטי','שכירה ועצמאית','גרושה','יעקב (אבא)','0528299706');
    insert.run('10','גיא גוטליב','1234','user','','','','0544923705','Guyg4x4@gmail.com','','','','','');
    insert.run('11','נדב נחושתן','1234','user','','','','','nadav.nechushtan@gmail.com','','','','','');
    insert.run('12','נטאלי סילבר','1234','user','','','','0559410030','silverstyle10@gmail.com','','','','','');
    insert.run('13','הילה כהן','1234','user','','','','','shlomi.a82@gmail.com','','','','','');
    insert.run('14','לילך אביסרור','1234','user','','','','0547745672','lilachavisror@gmail.com','','','','','');
    insert.run('15','נימרוד אסא','1234','user','','','','0526426787','nimrodassa84@gmail.com','','','','','');
    insert.run('16','כוכב אבשלום','1234','user','','','','0539666740','kohavavshalom@gmail.com','','','','','');
    insert.run('admin','מנהל','admin123','admin','','','','','','','','','','');
  });
  seedUsers();
  console.log('✅ Users seeded');
}

// Add missing users to existing DB
const addMissing = db.prepare(`INSERT OR IGNORE INTO users (id,name,password,role,phone,email) VALUES (?,?,?,?,?,?)`);
const addMissingTx = db.transaction(() => {
  addMissing.run('10','גיא גוטליב','1234','user','0544923705','Guyg4x4@gmail.com');
  addMissing.run('11','נדב נחושתן','1234','user','','nadav.nechushtan@gmail.com');
  addMissing.run('12','נטאלי סילבר','1234','user','0559410030','silverstyle10@gmail.com');
  addMissing.run('13','הילה כהן','1234','user','','shlomi.a82@gmail.com');
  addMissing.run('14','לילך אביסרור','1234','user','0547745672','lilachavisror@gmail.com');
  addMissing.run('15','נימרוד אסא','1234','user','0526426787','nimrodassa84@gmail.com');
  addMissing.run('16','כוכב אבשלום','1234','user','0539666740','kohavavshalom@gmail.com');
});
addMissingTx();
console.log('✅ Missing users check done');

// ─── Auth ─────────────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) return res.status(400).json({ error: 'חסרים פרטים' });
  const user = db.prepare('SELECT id, name, role FROM users WHERE name=? AND password=?').get(name.trim(), password);
  if (!user) return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });
  res.json(user);
});

// Auto-login by email (used when arriving from the CRM with ?email=...).
// If the email is unknown we auto-create a standard 'user' row so every CRM
// user can land in TimeTable without manual seeding. Name (if provided in the
// query string) is used as the display name; otherwise the email local-part.
app.post('/api/login-by-email', (req, res) => {
  const email = (req.body?.email || '').trim().toLowerCase();
  const providedName = (req.body?.name || '').trim();
  if (!email) return res.status(400).json({ error: 'חסר אימייל' });

  // Optional signed-role payload from OpsHub. If sig is present we MUST
  // verify it — a tampered signature is a 401 (don't silently downgrade to
  // user, since that would mask a real attempted forgery). If no sig is sent
  // at all, behave as before: auto-login as 'user'.
  const { role: claimedRole, exp, sig } = req.body || {};
  let verifiedRole = null;
  if (sig) {
    verifiedRole = verifySsoSignature(email, claimedRole, exp, sig);
    if (!verifiedRole) {
      console.warn(`⚠️  TimeTable SSO: invalid/expired signature for <${email}>`);
      return res.status(401).json({ error: 'חתימה לא תקפה או פגה' });
    }
  }

  let user = db.prepare('SELECT id, name, role FROM users WHERE LOWER(email)=?').get(email);
  if (user) {
    // If a better display name arrived from the CRM (contains a space, i.e.
    // "First Last") and it differs from what we have, upgrade it — unless the
    // target name collides with another user.
    if (providedName && providedName !== user.name && providedName.includes(' ')) {
      const collision = db.prepare('SELECT 1 FROM users WHERE name=? AND id!=?').get(providedName, user.id);
      if (!collision) {
        db.prepare('UPDATE users SET name=? WHERE id=?').run(providedName, user.id);
        user.name = providedName;
        console.log(`🔄 Updated TimeTable display name: <${email}> → ${providedName}`);
      }
    }

    // If a verified role arrived, sync it to the DB so the same record flips
    // between 'user' and 'admin' depending on which OpsHub button was clicked.
    // (This is option B from the integration design — one TimeTable row per
    // OpsHub user, role mutates per-click rather than two separate rows.)
    if (verifiedRole && verifiedRole !== user.role) {
      db.prepare('UPDATE users SET role=? WHERE id=?').run(verifiedRole, user.id);
      user.role = verifiedRole;
      console.log(`🔐 TimeTable role flip: <${email}> → ${verifiedRole}`);
    }
    return res.json(user);
  }

  // Auto-create. Ensure the name is unique (users.name has UNIQUE constraint).
  const baseName = providedName || email.split('@')[0];
  let name = baseName;
  let suffix = 2;
  while (db.prepare('SELECT 1 FROM users WHERE name=?').get(name)) {
    name = `${baseName} (${suffix++})`;
  }

  // First-time admin landing creates the row already as admin so they don't
  // have to click the regular button first to get seeded.
  const initialRole = verifiedRole || 'user';
  const id = Date.now().toString();
  try {
    db.prepare(
      `INSERT INTO users (id, name, password, role, email) VALUES (?, ?, '1234', ?, ?)`
    ).run(id, name, initialRole, email);
    console.log(`✨ Auto-created TimeTable user: ${name} <${email}> as ${initialRole}`);
    res.json({ id, name, role: initialRole });
  } catch (e) {
    console.error('Auto-create user failed:', e.message);
    res.status(500).json({ error: 'שגיאה ביצירת משתמש' });
  }
});

// ─── Users ────────────────────────────────────────────────────────────────────
app.get('/api/users', (req, res) => {
  const users = db.prepare("SELECT * FROM users WHERE role='user'").all();
  // Remove password from response
  res.json(users.map(u => { const {password, ...rest} = u; return rest; }));
});

app.get('/api/users/:id', (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.params.id);
  if (!user) return res.status(404).json({ error: 'לא נמצא' });
  const {password, ...rest} = user;
  res.json(rest);
});

app.post('/api/users', (req, res) => {
  const { name, password, birth_date, id_number, address, phone, email, vehicle, employment, family_status, emergency_name, emergency_phone, notes } = req.body;
  if (!name || !password) return res.status(400).json({ error: 'חסרים פרטים' });
  const id = Date.now().toString();
  try {
    db.prepare(`INSERT INTO users (id,name,password,role,birth_date,id_number,address,phone,email,vehicle,employment,family_status,emergency_name,emergency_phone,notes) VALUES (?,?,?,'user',?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, name.trim(), password, birth_date||'', id_number||'', address||'', phone||'', email||'', vehicle||'', employment||'', family_status||'', emergency_name||'', emergency_phone||'', notes||''
    );
    res.json({ id, name: name.trim(), role: 'user' });
  } catch (e) {
    res.status(400).json({ error: 'שם משתמש כבר קיים' });
  }
});

app.put('/api/users/:id', (req, res) => {
  const fields = ['name','birth_date','id_number','address','phone','email','vehicle','employment','family_status','emergency_name','emergency_phone','notes'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f}=?`); values.push(req.body[f]); }
  }
  if (req.body.password) { updates.push('password=?'); values.push(req.body.password); }
  if (updates.length === 0) return res.status(400).json({ error: 'אין שינויים' });
  values.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(',')} WHERE id=?`).run(...values);
  res.json({ ok: true });
});

app.delete('/api/users/:id', (req, res) => {
  db.prepare('DELETE FROM clock_events WHERE user_id=?').run(req.params.id);
  db.prepare('DELETE FROM schedule WHERE user_id=?').run(req.params.id);
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ─── Schedule ─────────────────────────────────────────────────────────────────
app.get('/api/schedule/:userId', (req, res) => {
  const rows = db.prepare('SELECT * FROM schedule WHERE user_id=? ORDER BY date DESC').all(req.params.userId);
  res.json(rows);
});

app.get('/api/schedule', (req, res) => {
  const rows = db.prepare('SELECT * FROM schedule ORDER BY date DESC').all();
  res.json(rows);
});

app.post('/api/schedule', (req, res) => {
  const { userId, date, shiftType, note, addedBy } = req.body;
  if (!userId || !date) return res.status(400).json({ error: 'חסרים פרטים' });
  if (!shiftType && !note) return res.status(400).json({ error: 'חסרים פרטים' });
  db.prepare(`
    INSERT INTO schedule (user_id, date, shift_type, note, added_by, updated_at)
    VALUES (?,?,?,?,?,datetime('now','localtime'))
    ON CONFLICT(user_id, date) DO UPDATE SET
      shift_type=excluded.shift_type,
      note=excluded.note,
      added_by=excluded.added_by,
      updated_at=excluded.updated_at
  `).run(userId, date, shiftType || '', note || '', addedBy || '');
  res.json({ ok: true });
});

app.delete('/api/schedule', (req, res) => {
  const { userId, date } = req.body;
  db.prepare('DELETE FROM schedule WHERE user_id=? AND date=?').run(userId, date);
  res.json({ ok: true });
});

// ─── Clock Events ─────────────────────────────────────────────────────────────
app.get('/api/clock/:userId', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const rows = db.prepare('SELECT * FROM clock_events WHERE user_id=? ORDER BY timestamp DESC LIMIT ?').all(req.params.userId, limit);
  res.json(rows);
});

app.get('/api/clock/:userId/last', (req, res) => {
  const row = db.prepare('SELECT type FROM clock_events WHERE user_id=? ORDER BY timestamp DESC LIMIT 1').get(req.params.userId);
  res.json({ type: row?.type || null });
});

app.post('/api/clock', (req, res) => {
  const { userId, type } = req.body;
  if (!userId || !['in','out'].includes(type)) return res.status(400).json({ error: 'שגיאה' });
  const result = db.prepare("INSERT INTO clock_events (user_id, type, timestamp) VALUES (?,?,datetime('now','localtime'))").run(userId, type);
  res.json({ id: result.lastInsertRowid });
});

// ─── Reports (Admin) ──────────────────────────────────────────────────────────
app.get('/api/report/today', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const rows = db.prepare(`
    SELECT u.id, u.name, u.phone,
           s.shift_type, s.note,
           (SELECT type FROM clock_events WHERE user_id=u.id ORDER BY timestamp DESC LIMIT 1) as last_clock
    FROM users u
    LEFT JOIN schedule s ON s.user_id=u.id AND s.date=?
    WHERE u.role='user'
  `).all(today);
  res.json(rows);
});

app.get('/api/report/week/:userId', (req, res) => {
  const now = new Date();
  const sun = new Date(now); sun.setDate(sun.getDate() - sun.getDay());
  const sat = new Date(sun); sat.setDate(sat.getDate() + 6);
  const sunStr = sun.toISOString().slice(0,10);
  const satStr = sat.toISOString().slice(0,10);
  const rows = db.prepare("SELECT * FROM schedule WHERE user_id=? AND date>=? AND date<=?").all(req.params.userId, sunStr, satStr);
  res.json(rows);
});

// ─── Attendance Report ────────────────────────────────────────────────────────
app.get('/api/report/attendance', (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ error: 'חסרים תאריכים' });
  const rows = db.prepare(`
    SELECT ce.user_id, u.name, ce.type, ce.timestamp
    FROM clock_events ce
    JOIN users u ON u.id = ce.user_id
    WHERE DATE(ce.timestamp) >= ? AND DATE(ce.timestamp) <= ?
      AND u.role = 'user'
    ORDER BY ce.user_id, ce.timestamp
  `).all(start, end);
  res.json(rows);
});

// ─── Serve frontend ───────────────────────────────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 TimeTable Server running at http://localhost:${PORT}`);
  console.log(`📦 Database: ${dbPath}`);
  console.log(`Admin: מנהל → password: admin123\n`);
});
