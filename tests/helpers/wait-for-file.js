import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

export async function waitForFileContent(filePath, isExpectedContent, timeoutInMs = 2000) {
  const deadline = Date.now() + timeoutInMs;

  while (Date.now() < deadline) {
    try {
      const fileContent = await readFile(filePath, 'utf8');
      if (isExpectedContent(fileContent)) {
        return fileContent;
      }
    } catch (readError) {
      if (readError.code !== 'ENOENT') {
        throw readError;
      }
    }
    await delay(20);
  }

  throw new Error(`${filePath} dosyasında beklenen içerik ${timeoutInMs} ms içinde oluşmadı.`);
}
