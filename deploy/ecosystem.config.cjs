// Configuración PM2 para Sisven Cont.
// Uso (desde cualquier directorio):
//   pm2 start deploy/ecosystem.config.cjs
//   pm2 save && pm2 startup
const { join } = require('path');

module.exports = {
  apps: [
    {
      name: 'sisven',
      // Ruta absoluta: funciona sin importar desde dónde se invoque pm2.
      cwd: join(__dirname, '..', 'backend'),
      script: 'dist/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '512M',
      time: true,
    },
  ],
};
