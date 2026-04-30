const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const db = new Database('./database/wellness.db');

// Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: 'student-wellness-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 sata
}));

// Kreiranje tablica
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    datum TEXT NOT NULL,
    aktivnost TEXT,
    trajanje_min INTEGER,
    sati_sna REAL,
    meditacija_min INTEGER,
    raspoloženje INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    cilj_sati_sna REAL DEFAULT 7,
    cilj_aktivnosti_min INTEGER DEFAULT 30,
    cilj_meditacije_min INTEGER DEFAULT 10,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// Helper: Provjera je li korisnik prijavljen
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Niste prijavljeni' });
    }
}

// ==================== AUTH ROUTES ====================

// Registracija
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Korisničko ime i lozinka su obavezni' });
    }
    
    if (password.length < 4) {
        return res.status(400).json({ error: 'Lozinka mora imati barem 4 znaka' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
        const info = stmt.run(username, hashedPassword);
        
        // Kreiraj default ciljeve za novog korisnika
        db.prepare('INSERT INTO goals (user_id) VALUES (?)').run(info.lastInsertRowid);
        
        req.session.userId = info.lastInsertRowid;
        req.session.username = username;
        
        res.json({ success: true, userId: info.lastInsertRowid, username });
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            res.status(400).json({ error: 'Korisničko ime već postoji' });
        } else {
            res.status(500).json({ error: 'Greška pri registraciji' });
        }
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        
        if (!user) {
            return res.status(401).json({ error: 'Korisnik ne postoji' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Pogrešna lozinka' });
        }
        
        req.session.userId = user.id;
        req.session.username = user.username;
        
        res.json({ success: true, userId: user.id, username: user.username });
    } catch (error) {
        res.status(500).json({ error: 'Greška pri prijavi' });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Provjera sesije
app.get('/api/auth/check', (req, res) => {
    if (req.session.userId) {
        res.json({ authenticated: true, username: req.session.username, userId: req.session.userId });
    } else {
        res.json({ authenticated: false });
    }
});

// ==================== LOGS ROUTES ====================

app.post('/api/log', isAuthenticated, (req, res) => {
    const { datum, aktivnost, trajanje_min, sati_sna, meditacija_min, raspoloženje } = req.body;
    const userId = req.session.userId;
    
    const stmt = db.prepare('INSERT INTO logs (user_id, datum, aktivnost, trajanje_min, sati_sna, meditacija_min, raspoloženje) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(userId, datum, aktivnost, trajanje_min, sati_sna, meditacija_min, raspoloženje);
    res.json({ id: info.lastInsertRowid });
});

app.get('/api/logs', isAuthenticated, (req, res) => {
    const userId = req.session.userId;
    const rows = db.prepare('SELECT * FROM logs WHERE user_id = ? ORDER BY datum DESC').all(userId);
    res.json(rows);
});

app.get('/api/logs/filtered', isAuthenticated, (req, res) => {
    const userId = req.session.userId;
    const { start, end } = req.query;
    let query = 'SELECT * FROM logs WHERE user_id = ? AND 1=1';
    const params = [userId];
    
    if (start) {
        query += ' AND datum >= ?';
        params.push(start);
    }
    if (end) {
        query += ' AND datum <= ?';
        params.push(end);
    }
    query += ' ORDER BY datum DESC';
    
    const rows = db.prepare(query).all(...params);
    res.json(rows);
});

app.delete('/api/log/:id', isAuthenticated, (req, res) => {
    const { id } = req.params;
    const userId = req.session.userId;
    
    // Provjeri da korisnik briše samo svoj unos
    const log = db.prepare('SELECT * FROM logs WHERE id = ? AND user_id = ?').get(id, userId);
    
    if (!log) {
        return res.status(404).json({ error: 'Unos ne postoji' });
    }
    
    const stmt = db.prepare('DELETE FROM logs WHERE id = ? AND user_id = ?');
    const info = stmt.run(id, userId);
    res.json({ deleted: info.changes });
});

app.get('/api/export', isAuthenticated, (req, res) => {
    const userId = req.session.userId;
    const rows = db.prepare('SELECT * FROM logs WHERE user_id = ? ORDER BY datum DESC').all(userId);
    res.json(rows);
});

// ==================== GOALS ROUTES ====================

app.get('/api/goals', isAuthenticated, (req, res) => {
    const userId = req.session.userId;
    let goals = db.prepare('SELECT * FROM goals WHERE user_id = ?').get(userId);
    
    if (!goals) {
        db.prepare('INSERT INTO goals (user_id) VALUES (?)').run(userId);
        goals = db.prepare('SELECT * FROM goals WHERE user_id = ?').get(userId);
    }
    
    res.json(goals);
});

app.put('/api/goals', isAuthenticated, (req, res) => {
    const userId = req.session.userId;
    const { cilj_sati_sna, cilj_aktivnosti_min, cilj_meditacije_min } = req.body;
    
    const stmt = db.prepare('UPDATE goals SET cilj_sati_sna = ?, cilj_aktivnosti_min = ?, cilj_meditacije_min = ? WHERE user_id = ?');
    stmt.run(cilj_sati_sna, cilj_aktivnosti_min, cilj_meditacije_min, userId);
    res.json({ success: true });
});

// Pokretanje servera
app.listen(3000, () => {
    console.log('Server pokrenut na http://localhost:3000');
});