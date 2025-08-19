module.exports = {
  apps: [{
    name: 'ddl-backend',
    script: './backend/server.js',
    watch: ['./backend'],
    // Ignore watching node_modules and the database file to prevent unnecessary restarts
    ignore_watch: ['node_modules', 'backend/lottery.db', 'backend/lottery.db-journal'],
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 5000,
      JWT_SECRET: 'ddl_secret_key_for_jwt_2024_dev'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000, // This might be different in a real production environment
      JWT_SECRET: 'a_much_stronger_production_secret_for_ddl_app_!@#$' // This MUST be changed to a secure, random key for production
    }
  }]
};
