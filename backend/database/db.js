const mysql = require('mysql2');
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

// By exporting pool.promise(), we get a promise-wrapped version of the pool
// which is what all the controllers and services expect. This is a more
// robust way of ensuring promise support than `require('mysql2/promise')`
// and resolves the TypeError on getConnection.
module.exports = pool.promise();
