require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const { DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE } = process.env;

// This pool will be used by the application to query the database.
const pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const initializeDb = async () => {
    console.log("--- [1/7] Starting Database Initialization for MySQL ---");
    let connection;
    try {
        // Connect without a specific database to create it if it doesn't exist.
        console.log(`--- [2/7] Checking for database '${DB_DATABASE}'... ---`);
        connection = await mysql.createConnection({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASSWORD,
        });
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_DATABASE}\`;`);
        console.log(`--- [3/7] Database '${DB_DATABASE}' is ready. ---`);
        await connection.end();

        // Now, use the pool which is connected to the specific database for table creation.
        console.log("--- [4/7] Attempting to get connection from pool... ---");
        connection = await pool.getConnection();
        console.log('--- [5/7] Successfully connected to the MySQL database. ---');

        // Create Tables with MySQL-compatible syntax
        console.log("--- [6/7] Creating tables if they do not exist... ---");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS clients (
                id VARCHAR(255) PRIMARY KEY,
                clientId VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(10) NOT NULL CHECK(role IN ('ADMIN', 'CLIENT')),
                wallet DECIMAL(15, 2) NOT NULL DEFAULT 0,
                area VARCHAR(255),
                contact VARCHAR(255),
                isActive BOOLEAN NOT NULL DEFAULT 1,
                commissionRates TEXT,
                prizeRates TEXT
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS draws (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                level VARCHAR(5) NOT NULL,
                drawTime DATETIME NOT NULL,
                status VARCHAR(20) NOT NULL,
                winningNumbers TEXT
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS bets (
                id VARCHAR(255) PRIMARY KEY,
                clientId VARCHAR(255) NOT NULL,
                drawId VARCHAR(255) NOT NULL,
                gameType VARCHAR(20) NOT NULL,
                number VARCHAR(255) NOT NULL,
                stake DECIMAL(15, 2) NOT NULL,
                createdAt DATETIME NOT NULL,
                condition VARCHAR(20) NOT NULL,
                positions TEXT,
                FOREIGN KEY (clientId) REFERENCES clients (id) ON DELETE CASCADE,
                FOREIGN KEY (drawId) REFERENCES draws (id) ON DELETE CASCADE
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id VARCHAR(255) PRIMARY KEY,
                clientId VARCHAR(255) NOT NULL,
                type VARCHAR(10) NOT NULL CHECK(type IN ('DEBIT', 'CREDIT')),
                amount DECIMAL(15, 2) NOT NULL,
                description TEXT NOT NULL,
                balanceAfter DECIMAL(15, 2) NOT NULL,
                createdAt DATETIME NOT NULL,
                relatedId VARCHAR(255),
                FOREIGN KEY (clientId) REFERENCES clients (id) ON DELETE CASCADE
            )
        `);

        console.log('--- [6/7] Tables are created or already exist. ---');
        
        console.log("--- [7/7] Seeding initial data... ---");
        await seedData(connection);
        console.log("--- [7/7] Seeding complete. ---");

    } catch (err) {
        console.error('--- DATABASE INITIALIZATION FAILED ---');
        console.error('Error during database initialization:', err);
        throw err; // Throw error to stop the script
    } finally {
        if (connection) {
            connection.release();
            console.log("--- Database connection released. ---");
        }
    }
};

const seedData = async (connection) => {
    // Seed Admin User
    const adminPassword = 'admin@123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(adminPassword, salt);
    const adminId = 'client-admin-ali';

    await connection.query(
        `INSERT IGNORE INTO clients (id, clientId, username, password, role, isActive, prizeRates, commissionRates) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            adminId, 'admin', 'admin', hash, 'ADMIN', 1, 
            JSON.stringify({ "4D": { "first": 525000, "second": 165000 }, "3D": { "first": 80000, "second": 26000 }, "2D": { "first": 8000, "second": 2600 }, "1D": { "first": 800, "second": 260 } }),
            JSON.stringify({})
        ]
    );
    console.log(' > Admin user seeded or already exists.');

    // Seed Draws
    const [rows] = await connection.query(`SELECT COUNT(*) as count FROM draws`);
    if (rows[0].count === 0) {
        console.log(' > Seeding draws...');
        const today = new Date();
        const createDrawTime = (hour) => new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, 0, 0, 0);
        
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

        const insertPromises = draws.map(draw => {
            return connection.query(`INSERT INTO draws (id, name, level, drawTime, status, winningNumbers) VALUES (?, ?, ?, ?, ?, ?)`,
                [draw.id, draw.name, draw.level, draw.drawTime, 'UPCOMING', JSON.stringify([])]
            );
        });
        await Promise.all(insertPromises);
        console.log(` > ${draws.length} draws seeded.`);
    }
};

// If this file is run directly via "npm run db:init", initialize the DB
if (require.main === module) {
    console.log('Running DB initialization script for MySQL from command line...');
    initializeDb().then(() => {
        console.log('--- Initialization complete. Closing pool. ---');
        pool.end(); // End the pool connections after the script is done
    }).catch(err => {
        console.error("--- Initialization script failed ---");
        console.error(err.message);
        process.exit(1);
    });
}

// Export the pool for use in the application
module.exports = pool;
