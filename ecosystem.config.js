module.exports = {
  apps: [{
    name: 'ddl-backend',
    script: 'server.js', // The script path is now relative to the `cwd`
    cwd: './backend',    // Set the correct working directory for the app
    watch: true,         // Watches the current working directory
    ignore_watch: ['node_modules'],
    max_memory_restart: '1G'
  }]
};
