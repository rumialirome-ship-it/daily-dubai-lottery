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
      JWT_SECRET: 'AIzaSyCF0j0LFCwPdpz30sdfiyEHG44qlLIGW1Q?',
      API_KEY: 'AIzaSyCF0j0LFCwPdpz30sdfiyEHG44qlLIGW1Q',
      DB_HOST: '127.0.0.1',
      DB_USER: 'root',
      DB_PASSWORD: 'Imranali@Guru1',
      DB_DATABASE: 'mydb'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000, // This might be different in a real production environment
      JWT_SECRET: 'AIzaSyCF0j0LFCwPdpz30sdfiyEHG44qlLIGW1Q?', // This MUST be changed to a secure, random key for production
      API_KEY: 'AIzaSyCF0j0LFCwPdpz30sdfiyEHG44qlLIGW1Q',
      DB_HOST: '127.0.0.1',
      DB_USER: 'ddl_user',
      DB_PASSWORD: 'Imranali@Guru1',
      DB_DATABASE: 'mydb'
    }
  }]
};
