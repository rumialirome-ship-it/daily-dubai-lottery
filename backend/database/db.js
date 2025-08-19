const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'lottery.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeDb();
    }
});

const initializeDb = () => {
    db.serialize(() => {
        // Create Clients Table
        db.run(`CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            clientId TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('ADMIN', 'CLIENT')),
            wallet REAL NOT NULL DEFAULT 0,
            area TEXT,
            contact TEXT,
            isActive BOOLEAN NOT NULL DEFAULT 1,
            commissionRates TEXT,
            prizeRates TEXT
        )`);

        // Create Draws Table
        db.run(`CREATE TABLE IF NOT EXISTS draws (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            level TEXT NOT NULL,
            drawTime TEXT NOT NULL,
            status TEXT NOT NULL,
            winningNumbers TEXT
        )`);

        // Create Bets Table
        db.run(`CREATE TABLE IF NOT EXISTS bets (
            id TEXT PRIMARY KEY,
            clientId TEXT NOT NULL,
            drawId TEXT NOT NULL,
            gameType TEXT NOT NULL,
            number TEXT NOT NULL,
            stake REAL NOT NULL,
            createdAt TEXT NOT NULL,
            condition TEXT NOT NULL,
            positions TEXT,
            FOREIGN KEY (clientId) REFERENCES clients (id),
            FOREIGN KEY (drawId) REFERENCES draws (id)
        )`);

        // Create Transactions Table
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            clientId TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('DEBIT', 'CREDIT')),
            amount REAL NOT NULL,
            description TEXT NOT NULL,
            balanceAfter REAL NOT NULL,
            createdAt TEXT NOT NULL,
            relatedId TEXT,
            FOREIGN KEY (clientId) REFERENCES clients (id)
        )`);
        
        seedData();
    });
};

const seedData = () => {
    // Seed Admin User
    const adminPassword = 'admin@123';
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(adminPassword, salt, (err, hash) => {
            if (err) throw err;
            const adminId = 'client-admin-ali';
            db.get(`SELECT id FROM clients WHERE id = ?`, [adminId], (err, row) => {
                if (!row) {
                    const stmt = db.prepare(`INSERT INTO clients (id, clientId, username, password, role, isActive, prizeRates, commissionRates) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
                    stmt.run(
                        adminId, 'admin', 'admin', hash, 'ADMIN', 1, 
                        JSON.stringify({ "4D": { "first": 525000, "second": 165000 }, "3D": { "first": 80000, "second": 26000 }, "2D": { "first": 8000, "second": 2600 }, "1D": { "first": 800, "second": 260 } }),
                        JSON.stringify({})
                    );
                    stmt.finalize();
                    console.log('Admin user created.');
                }
            });
        });
    });

    // Seed Draws
    db.get(`SELECT COUNT(*) as count FROM draws`, [], (err, row) => {
        if (row.count === 0) {
            console.log('Seeding draws...');
            const today = new Date();
            const createDrawTime = (hour) => new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, 0, 0, 0).toISOString();
            
            const draws = [
                { id: 'draw-today-1', name: '11:00 AM', level: 'F', drawTime: createDrawTime(11) },
                { id: 'draw-today-2', name: '12:00 PM', level: 'S', drawTime: createDrawTime(12) },
                { id: 'draw-today-3', name: '01:00 PM', level: 'S', drawTime: createDrawTime(13) },
                { id: 'draw-today-4', name: '02:00 PM', level: 'S', drawTime: createDrawTime(14) },
                { id: 'draw-today-5', name: '03:00 PM', level: 'S', drawTime: createDrawTime(15) },
                { id: 'draw-today-6', name: '04:00 PM', level: 'S', drawTime: createDrawTime(16) },
                { id: 'draw-today-7', name: '05:00 PM', level: 'S', drawTime: createDrawTime(17) },
                { id: 'draw-today-8', name: '06:00 PM', level: 'S', drawTime: createDrawTime(18) },
                { id: 'draw-today-9', name: '07:00 PM', level: 'S', drawTime: createDrawTime(19) },
                { id: 'draw-today-10', name: '08:00 PM', level: 'S', drawTime: createDrawTime(20) },
                { id: 'draw-today-11', name: '09:00 PM', level: 'S', drawTime: createDrawTime(21) },
                { id: 'draw-today-12', name: '10:00 PM', level: 'S', drawTime: createDrawTime(22) },
                { id: 'draw-today-13', name: '11:00 PM', level: 'S', drawTime: createDrawTime(23) },
            ];

            const stmt = db.prepare(`INSERT INTO draws (id, name, level, drawTime, status, winningNumbers) VALUES (?, ?, ?, ?, ?, ?)`);
            draws.forEach(draw => {
                stmt.run(draw.id, draw.name, draw.level, draw.drawTime, 'UPCOMING', JSON.stringify([]));
            });
            stmt.finalize();
            console.log(`${draws.length} draws seeded.`);
        }
    });
};

module.exports = db;
