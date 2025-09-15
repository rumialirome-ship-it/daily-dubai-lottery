const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection()
    .then(conn => {
        console.log('Connected to the MySQL database.');
        conn.release();
    })
    .catch(err => {
        console.error('Error connecting to MySQL database:', err.message);
        // Exit process if cannot connect to DB
        process.exit(1);
    });
