// PM2 Ecosystem Configuration for Staging
// Usage: pm2 start ecosystem.config.staging.js

module.exports = {
  apps: [
    {
      name: 'absenin-api',
      script: './apps/api/dist/index.js',
      cwd: '/var/www/absenin.com/staging',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'staging',
        PORT: 3001,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
      },
      error_file: '/var/log/absenin.com/staging/pm2-api-error.log',
      out_file: '/var/log/absenin.com/staging/pm2-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
      min_uptime: '10s',
      max_restarts: 10,
    },
    {
      name: 'absenin-web',
      script: './node_modules/.bin/next',
      args: 'start -p 3002',
      cwd: '/var/www/absenin.com/staging/apps/web',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'staging',
        PORT: 3002,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3002,
      },
      error_file: '/var/log/absenin.com/staging/pm2-web-error.log',
      out_file: '/var/log/absenin.com/staging/pm2-web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
      min_uptime: '10s',
      max_restarts: 10,
    },
  ],
};
