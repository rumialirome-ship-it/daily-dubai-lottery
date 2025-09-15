const path = require('path');
// Load environment variables from backend/.env, which is one level up
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const dbPool = require('./db'); // This is the mysql2 pool
const { defaultPrizeRates, defaultCommissionRates } = require(path.resolve(__dirname, '..', 'data', 'defaultRates.js'));

const createTablesSQL = [
    `
    CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR(255) PRIMARY KEY,
        clientId VARCHAR(255) NOT NULL UNIQUE,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        wallet DECIMAL(15, 2) DEFAULT 0.00,
        area VARCHAR(255),
        contact VARCHAR(255),
        isActive BOOLEAN DEFAULT TRUE,
        commissionRates JSON,
        prizeRates JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS draws (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        level CHAR(1) NOT NULL,
        drawTime DATETIME NOT NULL,
        status VARCHAR(50) NOT NULL,
        winningNumbers JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS bets (
        id VARCHAR(255) PRIMARY KEY,
        clientId VARCHAR(255) NOT NULL,
        drawId VARCHAR(255) NOT NULL,
        gameType VARCHAR(50) NOT NULL,
        number VARCHAR(255) NOT NULL,
        stake DECIMAL(15, 2) NOT NULL,
        createdAt DATETIME NOT NULL,
        condition VARCHAR(50) NOT NULL,
        positions JSON,
        FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (drawId) REFERENCES draws(id) ON DELETE CASCADE
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(255) PRIMARY KEY,
        clientId VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        description VARCHAR(255),
        balanceAfter DECIMAL(15, 2) NOT NULL,
        createdAt DATETIME NOT NULL,
        relatedId VARCHAR(255),
        FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
    );
    `
];


async function setupAndSeedDatabase() {
    console.log('Starting full database setup (Schema + Seed)...');
    let connection;

    try {
        connection = await dbPool.getConnection();
        console.log('Database connection established for setup.');

        // --- 1. Create Schema ---
        console.log('Executing CREATE TABLE statements...');
        for (const sql of createTablesSQL) {
            await connection.query(sql);
        }
        console.log('✅ Schema setup complete. Tables created or already exist.');

        // --- 2. Seed Draws ---
        const [draws] = await connection.execute('SELECT COUNT(*) as count FROM draws');
        if (draws[0].count === 0) {
            console.log('Draws table is empty. Seeding initial draws for today...');
            const seedDraws = [];
            const today = new Date();
            const drawTimes = [
                '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', 
                '19:00', '20:00', '21:00', '22:00', '23:00', '23:59'
            ];
            
            drawTimes.forEach((time, index) => {
                const [hours, minutes] = time.split(':');
                const drawTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours), parseInt(minutes));
                
                seedDraws.push([
                    `draw-${today.toISOString().split('T')[0]}-${index + 1}`,
                    `${index + 1}`,
                    'F',
                    drawTime,
                    'UPCOMING',
                    null
                ]);
            });

            const sql = 'INSERT INTO draws (id, name, level, drawTime, status, winningNumbers) VALUES ?';
            await connection.query(sql, [seedDraws]);
            console.log(`✅ Seeded ${seedDraws.length} draws for today.`);
        } else {
            console.log('ℹ️ Draws table already has data. Skipping draw seeding.');
        }


        // --- 3. Seed Admin User ---
        const [adminRows] = await connection.execute('SELECT * FROM users WHERE username = ?', ['01']);
        if (adminRows.length === 0) {
            console.log("Admin user '01' not found. Creating...");
            const adminPassword = 'password'; // Default password
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            const adminId = `admin-${Date.now()}`;
            await connection.execute(
                'INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)',
                [adminId, '01', hashedPassword, 'ADMIN']
            );
            console.log("✅ Admin user '01' created with default password 'password'.");
            console.log("   IMPORTANT: Change this password immediately after logging in.");
        } else {
            console.log("ℹ️ Admin user '01' already exists. Skipping.");
        }
        
        // --- 4. Seed Sample Client User ---
        const [clientRows] = await connection.execute('SELECT * FROM clients WHERE clientId = ?', ['02']);
        if (clientRows.length === 0) {
            console.log("Sample client '02' not found. Creating...");
            const clientPassword = 'password';
            const hashedPassword = await bcrypt.hash(clientPassword, 10);
            const clientId = `client-${Date.now()}`;

            await connection.execute(
                `INSERT INTO clients (id, clientId, username, password, role, wallet, area, contact, isActive, commissionRates, prizeRates) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    clientId,
                    '02', // The requested client ID
                    'Sample Client',
                    hashedPassword,
                    'CLIENT',
                    10000,
                    'Dubai',
                    '123456789',
                    1, // isActive = true
                    JSON.stringify(defaultCommissionRates),
                    JSON.stringify(defaultPrizeRates)
                ]
            );
            console.log("✅ Sample client '02' created with username 'Sample Client' and password 'password'.");
        } else {
             console.log("ℹ️ Client with ID '02' already exists. Skipping.");
        }

        console.log('\nDatabase setup and seed complete!');
    } catch (error) {
        console.error('❌ Error during database setup:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.release();
            console.log('Database connection released.');
        }
        // End the pool to allow the script to exit cleanly.
        // This is safe because this script is a one-off execution.
        await dbPool.end();
        console.log('Setup script finished.');
    }
}

setupAndSeedDatabase();
