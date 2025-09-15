// Load environment variables from backend/.env
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const dbPool = require('./db'); // This is the mysql2 pool
const { defaultPrizeRates, defaultCommissionRates } = require('../data/defaultRates');

async function seedDatabase() {
    console.log('Starting database seed...');
    let connection;

    try {
        connection = await dbPool.getConnection();
        console.log('Database connection established for seeding.');

        // --- Seed Admin User ---
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
        
        // --- Seed Sample Client User ---
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

        console.log('\nDatabase seed complete!');
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.release();
            console.log('Database connection released.');
        }
        // End the pool to allow the script to exit cleanly.
        await dbPool.end();
        console.log('Connection pool closed.');
    }
}

seedDatabase();
