import { createApp } from './app.js';
import { environment } from './config/environment.js';

const app = createApp();

const server = app.listen(environment.port, (startupError) => {
  if (startupError) {
    console.error(`Sunucu başlatılamadı: ${startupError.message}`);
    process.exit(1);
  }
  console.log(`${environment.appName} v${environment.appVersion} http://localhost:${environment.port} adresinde çalışıyor.`);
});

function shutDownGracefully(signal) {
  console.log(`${signal} sinyali alındı, sunucu kapatılıyor...`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutDownGracefully);
process.on('SIGTERM', shutDownGracefully);
