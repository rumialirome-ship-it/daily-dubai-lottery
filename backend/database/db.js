

const path = require('path');
// Explicitly load .env from the 'backend' directory using an absolute path.
// This is more robust and ensures that the config file is found correctly,
// especially when the script is run by a process manager like PM2.
const dotenvResult = require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// ===================================================================================
// VERY IMPORTANT LOGGING - v4
// ===================================================================================
console.log("\n\n");
console.log("██████╗ ██╗   ██╗██╗     ██╗   ██╗███████╗██████╗");
console.log("██╔══██╗██║   ██║██║     ██║   ██║██╔════╝██╔══██╗");
console.log("██║  ██║██║   ██║██║     ██║   ██║█████╗  ██████╔╝");
console.log("██║  ██║██║   ██║██║     ██║   ██║██╔══╝  ██╔══██╗");
console.log("██████╔╝╚██████╔╝███████╗╚██████╔╝███████╗██║  ██║");
console.log("╚═════╝  ╚═════╝ ╚══════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝");
console.log("      V E R S I O N   4   D I A G N O S T I C      ");
console.log("\n[CONFIRMATION] If you see this banner, the correct 'db.js' file is being executed.");
console.log("===================================================================");
console.log(`[INFO] Script started at: ${new Date().toISOString()}`);
console.log("[INFO] This script should ONLY connect to MySQL, not SQLite.");
// ===================================================================================

// --- DOTENV DEBUGGING ---
if (dotenvResult.error) {
    console.error('\n[DEBUG] Error loading .env file:', dotenvResult.error);
} else {
    console.log('\n[DEBUG] .env file loaded successfully.');
    console.log(`[DEBUG] DB_HOST from process.env is: ${process.env.DB_HOST}`);
}
// --- END DEBUGGING ---


const { DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE } = process.env;

// Log the environment variables being used
console.log("\n[STEP 1/6] Reading database configuration from .env file...");
console.log(`  - DB_HOST: ${DB_HOST}`);
console.log(`  - DB_USER: ${DB_USER}`);
console.log(`  - DB_PASSWORD: ${DB_PASSWORD ? '******' : 'NOT SET'}`); // Don't log the actual password
console.log(`  - DB_DATABASE: ${DB_DATABASE}`);
if (!DB_HOST || !DB_USER || !DB_DATABASE) {
    console.error("\n[FATAL ERROR] One or more required database environment variables (DB_HOST, DB_USER, DB_DATABASE) are missing.");
    console.error("[FATAL ERROR] Please check your .env file in the 'backend' directory.");
    process.exit(1);
}
console.log("[SUCCESS] Configuration loaded.");


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
    console.log("\n[STEP 2/6] Starting Database Initialization for MySQL...");
    let connection;
    try {
        // The script now assumes the database already exists, as per standard deployment practice.
        // It will connect directly using the pool configured with the database name.
        // If this step fails, it means the database does not exist or credentials are wrong.
        console.log(`\n[STEP 3/6] Connecting to the '${DB_DATABASE}' database...`);
        connection = await pool.getConnection();
        console.log(`[SUCCESS] Connected to the '${DB_DATABASE}' database.`);

        // Create Tables with MySQL-compatible syntax
        console.log("\n[STEP 4/6] Creating tables if they do not exist...");
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
        console.log("  - Table 'clients' created or already exists.");

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
        console.log("  - Table 'draws' created or already exists.");

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
        console.log("  - Table 'bets' created or already exists.");


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
        console.log("  - Table 'transactions' created or already exists.");

        console.log("[SUCCESS] All tables are created or already exist.");
        
        console.log("\n[STEP 5/6] Seeding initial data (Admin user and Draws)...");
        await seedData(connection);
        console.log("[SUCCESS] Seeding complete.");
        
        console.log("\n===================================================================");
        console.log("      DATABASE INITIALIZATION COMPLETE!                             ");
        console.log("===================================================================");


    } catch (err) {
        console.error('\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('      DATABASE INITIALIZATION FAILED                               ');
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('Error during database initialization:', err);
        console.error("\n[TROUBLESHOOTING]");
        console.error("1. VERIFY PERMISSIONS (Most Likely Cause): This error means the 'ddl_user' lacks permission to CREATE tables.");
        console.error("   - Log into MySQL as root (`sudo mysql`) and run the following command:");
        console.error("     SHOW GRANTS FOR 'ddl_user'@'localhost';");
        console.error("   - The output MUST show a line like: GRANT ALL PRIVILEGES ON `mydb`.* TO `ddl_user`@`localhost`");
        console.error("   - If it doesn't, you must re-run the GRANT command from the README.md file.");
        console.error("2. Ensure the database 'mydb' (or your .env equivalent) exists and the user can access it.");
        console.error("3. Double-check the DB_HOST, DB_USER, DB_PASSWORD, and DB_DATABASE in your 'backend/.env' file.");
        console.error("4. If the error is ECONNREFUSED, ensure DB_HOST is '127.0.0.1' and not 'localhost'.");
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        throw err; // Throw error to stop the script
    } finally {
        if (connection) {
            connection.release();
            console.log("\n[STEP 6/6] Database connection released.");
        }
    }
};

const seedData = async (connection) => {
    // Seed Admin User
    const adminPassword = 'admin@123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(adminPassword, salt);
    const adminId = 'client-admin-ali';

    // Use INSERT ... ON DUPLICATE KEY UPDATE to ensure the admin user is always up-to-date.
    // This is more robust than INSERT IGNORE, as it will overwrite an existing admin
    // user with the correct default password hash if the script is run again.
    const adminUpsertQuery = `
        INSERT INTO clients (id, clientId, username, password, role, isActive, prizeRates, commissionRates) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            clientId = VALUES(clientId),
            username = VALUES(username),
            password = VALUES(password),
            role = VALUES(role),
            isActive = VALUES(isActive),
            prizeRates = VALUES(prizeRates),
            commissionRates = VALUES(commissionRates)
    `;

    await connection.query(
        adminUpsertQuery,
        [
            adminId, 'admin', 'admin', hash, 'ADMIN', 1, 
            JSON.stringify({ "4D": { "first": 525000, "second": 165000 }, "3D": { "first": 80000, "second": 26000 }, "2D": { "first": 8000, "second": 2600 }, "1D": { "first": 800, "second": 260 } }),
            JSON.stringify({})
        ]
    );
    console.log('  - Admin user seeded or updated successfully.');

    // Seed Draws
    const [rows] = await connection.query(`SELECT COUNT(*) as count FROM draws`);
    if (rows[0].count === 0) {
        console.log('  - No draws found. Seeding draws for today...');
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
        console.log(`  - ${draws.length} draws seeded.`);
    } else {
        console.log('  - Draws already exist, skipping seeding.');
    }
};

// If this file is run directly via "npm run db:init", initialize the DB
if (require.main === module) {
    console.log('\n[INFO] Running DB initialization script directly from command line...');
    initializeDb().then(() => {
        console.log('--- Script finished successfully. Closing pool. ---');
        pool.end(); // End the pool connections after the script is done
    }).catch(err => {
        console.error("\n--- Initialization script failed with a fatal error. ---");
        // The error is already logged inside initializeDb
        process.exit(1);
    });
}

// Export the pool for use in the application
module.exports = pool;
