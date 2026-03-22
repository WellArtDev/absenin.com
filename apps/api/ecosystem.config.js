module.exports = {
  apps: [{
    name: 'absenin-api',
    script: 'dist/index.js',
    instances: 2, // 2 instances for HA
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      LOG_LEVEL: 'info'
    }
  }],
  deploy: {
    production: {
      user: 'www-data',
      host: '127.0.0.1',
      ref: 'origin/master'
    }
  }
};
