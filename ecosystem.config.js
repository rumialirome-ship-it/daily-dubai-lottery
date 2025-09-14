module.exports = {
  apps: [{
    name: 'ddl-backend',
    script: './backend/server.js',
    watch: ['./backend'],
    ignore_watch: ['node_modules'],
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 5000,
      JWT_SECRET: 'ddl_secret_key_for_jwt_2024_dev',
      DB_HOST: 'localhost',
      DB_USER: 'ddl_user',
      DB_PASSWORD: 'password',
      DB_DATABASE: 'ddl_lottery'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
      JWT_SECRET: 'a_much_stronger_production_secret_for_ddl_app_!@#$', // This MUST be changed to a secure, random key for production
      DB_HOST: 'localhost',
      DB_USER: 'ddl_user',
      DB_PASSWORD: 'a_strong_production_password', // This MUST be changed to your production DB password
      DB_DATABASE: 'ddl_lottery'
    }
  }]
};
