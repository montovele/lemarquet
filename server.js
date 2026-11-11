module.exports = {
  apps: [
    {
      name: 'lemarquet-api',
      cwd: '/var/www/ssaxxon/lemarquet',
      script: './server.js',
      interpreter: 'node',
      node_args: '--use-system-ca',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3220
      }
    }
  ]
};