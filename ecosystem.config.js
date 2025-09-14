module.exports = {
  apps: [{
    name: 'ddl-backend',
    script: './backend/server.js',
    watch: ['./backend'],
    ignore_watch: ['node_modules'],
    max_memory_restart: '1G'
    // By removing the 'env' and 'env_production' sections, we ensure that
    // the application's configuration is loaded SOLELY from the `.env` file
    // within the `/backend` directory. This creates a single source of truth
    // and resolves the startup error.
  }]
};
