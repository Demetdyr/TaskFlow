import { environment } from '../src/config/environment.js';
import { createDatabase } from '../src/database/create-database.js';
import { seedDatabase } from '../src/database/seed-database.js';

const RUNNING_SERVER_CHECK_TIMEOUT_IN_MS = 500;

async function isServerRunning() {
  try {
    const healthResponse = await fetch(`http://localhost:${environment.port}/health`, {
      signal: AbortSignal.timeout(RUNNING_SERVER_CHECK_TIMEOUT_IN_MS),
    });
    return healthResponse.ok;
  } catch {
    return false;
  }
}

try {
  const seedSummary = await seedDatabase(createDatabase(environment.dataDirectory));
  console.log(`Örnek veriler ${environment.dataDirectory} klasörüne yüklendi.`);
  console.log(`  Çalışan: ${seedSummary.users}  Proje: ${seedSummary.projects}  Görev: ${seedSummary.tasks}`);

  if (await isServerRunning()) {
    console.warn(
      `Uyarı: ${environment.port} portunda çalışan bir sunucu var. Sunucu verileri bellekte tuttuğundan yeni verileri görmesi için yeniden başlatılmalıdır.`,
    );
  }
} catch (seedError) {
  console.error(`Örnek veriler yüklenemedi: ${seedError.message}`);
  process.exitCode = 1;
}
