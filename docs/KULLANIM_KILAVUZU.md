# Kullanım Kılavuzu

Bu kılavuz TaskFlow API'yi bir web arayüzüne, mobil uygulamaya ya da başka bir servise bağlamak isteyen geliştiriciler içindir. Sonunda ekip üyesini kaydeden, proje açan, görev atayan, görevin durumunu ilerleten ve raporları okuyan bir istemci yazmış olacaksınız.

Örnekler `curl` ve JavaScript'in yerleşik `fetch` fonksiyonuyla verilmiştir. Node.js 18 ve üzeri ile tüm modern tarayıcılarda ek paket gerekmeden çalışırlar.

## 1. Sunucuyu hazırlayın

```bash
npm install
npm run seed
npm start
```

API `http://localhost:3000` adresinde çalışır. Farklı bir port için `.env` dosyasında `PORT` değerini değiştirin.

## 2. Bilmeniz gereken dört kural

1. **İstekler ve yanıtlar JSON'dur.** Gövde gönderirken `Content-Type: application/json` başlığını ekleyin.
2. **Başarılı yanıtın içeriği `data` alanındadır.** Listelerde ayrıca `pagination` gelir.
3. **Hatalar her zaman aynı biçimdedir:** `{ "error": { "code", "message", "details" } }`. Kararlarınızı `message` metnine göre değil, HTTP durum koduna ve `code` alanına göre verin.
4. **Görevler çalışana kullanıcı adıyla bağlanır.** `assignee` alanına çalışanın `id` değerini değil `username` değerini yazın.

## 3. İlk istek

```bash
curl http://localhost:3000/tasks?limit=2
```

```js
const response = await fetch('http://localhost:3000/tasks?limit=2');
const { data, pagination } = await response.json();
console.log(`${pagination.totalItems} görevden ${data.length} tanesi alındı.`);
```

## 4. Tekrar kullanılabilir bir istek fonksiyonu yazın

Her istekte başlık eklemek, `204` yanıtını ayırt etmek ve hata gövdesini okumak gerekir. Bunu tek bir yerde toplamak istemci kodunu sadeleştirir:

```js
const TASKFLOW_BASE_URL = 'http://localhost:3000';

export class TaskflowApiError extends Error {
  constructor(statusCode, errorBody) {
    super(errorBody.message);
    this.statusCode = statusCode;
    this.code = errorBody.code;
    this.details = errorBody.details ?? [];
  }
}

export async function taskflowRequest(method, path, requestBody) {
  const response = await fetch(`${TASKFLOW_BASE_URL}${path}`, {
    method,
    headers: requestBody ? { 'Content-Type': 'application/json' } : undefined,
    body: requestBody ? JSON.stringify(requestBody) : undefined,
  });

  if (response.status === 204) {
    return null;
  }

  const responseBody = await response.json();
  if (!response.ok) {
    throw new TaskflowApiError(response.status, responseBody.error);
  }
  return responseBody;
}
```

Sonraki adımlarda bu fonksiyon kullanılacaktır.

## 5. Uçtan uca bir iş akışı

### 5.1 Ekibe yeni bir çalışan ekleyin

```js
const { data: newEmployee } = await taskflowRequest('POST', '/users', {
  username: 'elif',
  fullName: 'Elif Şahin',
  email: 'elif@taskflow.dev',
  role: 'tester',
});
```

Kullanıcı adı küçük harf, rakam, nokta, tire ve alt çizgiden oluşur ve sonradan değiştirilemez. Aynı kullanıcı adı veya e-posta ikinci kez gönderilirse `409 CONFLICT` alırsınız.

### 5.2 Bir proje açın

```js
const { data: newProject } = await taskflowRequest('POST', '/projects', {
  name: 'Ödeme Entegrasyonu',
  description: 'Sanal POS sağlayıcısıyla bağlantı.',
  status: 'active',
});
```

### 5.3 Görev oluşturup çalışana atayın

```js
const { data: newTask } = await taskflowRequest('POST', '/tasks', {
  title: 'Ödeme sağlayıcısının test ortamını kur',
  description: 'Sandbox anahtarları alınacak ve ilk istek denenecek.',
  priority: 'high',
  assignee: newEmployee.username,
  projectId: newProject.id,
  dueDate: '2026-10-31',
});
```

`status` gönderilmezse görev `pending`, `priority` gönderilmezse `medium` olarak açılır. Yanıttaki `Location` başlığı yeni görevin adresini verir.

### 5.4 Görevin durumunu ilerletin

Yalnızca değişen alanı göndermek için `PATCH` kullanın:

```js
await taskflowRequest('PATCH', `/tasks/${newTask.id}`, { status: 'in-progress' });

const { data: completedTask } = await taskflowRequest('PATCH', `/tasks/${newTask.id}`, { status: 'completed' });
console.log(completedTask.completedAt);
```

Görev `completed` durumuna geçtiğinde `completedAt` alanı sunucu tarafından doldurulur. Görev yeniden açılırsa bu alan temizlenir. Bir formdaki tüm alanları birlikte kaydediyorsanız `PUT` kullanabilirsiniz. `PUT` isteğinde gönderilmeyen isteğe bağlı alanlar varsayılana döner.

### 5.5 Çalışanın görev listesini gösterin

```js
const { data: elifTasks } = await taskflowRequest('GET', '/tasks/assignee/elif?sort=dueDate');
```

### 5.6 Yönetici paneli için raporları okuyun

```js
const { data: summary } = await taskflowRequest('GET', '/reports/summary');
const { data: pendingReport } = await taskflowRequest('GET', '/reports/pending');

console.log(`Tamamlanma oranı: %${summary.completionRate}`);
for (const overdueTask of pendingReport.overdueTasks) {
  console.log(`${overdueTask.title} ${overdueTask.daysOverdue} gün gecikti (${overdueTask.assignee ?? 'atanmamış'})`);
}
```

### 5.7 Temizlik

İlişkili kayıtlar varken çalışan ya da proje silinemez. Önce görevi, sonra proje ve çalışanı silin:

```js
await taskflowRequest('DELETE', `/tasks/${newTask.id}`);
await taskflowRequest('DELETE', `/projects/${newProject.id}`);
await taskflowRequest('DELETE', `/users/${newEmployee.id}`);
```

## 6. Liste ekranları: filtre, arama ve sayfalama

Filtreleri `URLSearchParams` ile oluşturmak, Türkçe karakterleri ve boşlukları doğru kodlar:

```js
const searchParameters = new URLSearchParams({ keyword: 'ürün listesi', status: 'in-progress', page: 1, limit: 20 });
const { data: matchingTasks, pagination } = await taskflowRequest('GET', `/tasks/search?${searchParameters}`);
```

Sayfa başına en fazla 100 kayıt alınabilir. Tüm kayıtlara ihtiyacınız varsa `hasNextPage` değeri `false` olana kadar sayfaları dolaşın:

```js
async function fetchAllTasks(filters = {}) {
  const collectedTasks = [];
  let currentPage = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const queryParameters = new URLSearchParams({ ...filters, page: currentPage, limit: 100 });
    const { data, pagination } = await taskflowRequest('GET', `/tasks?${queryParameters}`);
    collectedTasks.push(...data);
    hasNextPage = pagination.hasNextPage;
    currentPage += 1;
  }

  return collectedTasks;
}

const highPriorityTasks = await fetchAllTasks({ priority: 'high' });
```

Kullanılabilir filtre ve sıralama alanlarının tam listesi [API dokümantasyonunda](API.md#get-tasks) yer alır.

## 7. Hataları kullanıcıya gösterin

`400 VALIDATION_ERROR` yanıtındaki `details` dizisi her hatalı alan için ayrı bir mesaj içerir. Alan adları istek gövdesindeki adlarla aynıdır, bu yüzden form alanlarıyla doğrudan eşleştirilebilir:

```js
async function submitTaskForm(formValues, showFieldError, showGeneralError) {
  try {
    return await taskflowRequest('POST', '/tasks', formValues);
  } catch (requestError) {
    if (!(requestError instanceof TaskflowApiError)) {
      showGeneralError('Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.');
      return null;
    }
    if (requestError.code === 'VALIDATION_ERROR') {
      requestError.details.forEach(({ field, message }) => showFieldError(field, message));
      return null;
    }
    showGeneralError(requestError.message);
    return null;
  }
}
```

| Durum kodu | İstemcide önerilen davranış |
| --- | --- |
| `400` | İlgili form alanlarının altında `details` mesajlarını gösterin |
| `404` | Kaydın silinmiş olabileceğini belirtin ve listeye geri dönün |
| `409` | Mesajı olduğu gibi gösterin; kullanıcıdan farklı bir değer seçmesini ya da önce ilişkili kayıtları düzenlemesini isteyin |
| `500` | Genel bir hata mesajı gösterin ve isteği daha sonra tekrar deneyin |

## 8. Sık karşılaşılan durumlar

| Belirti | Neden | Çözüm |
| --- | --- | --- |
| `İstek gövdesi bir JSON nesnesi olmalıdır` | `Content-Type` başlığı eksik ya da gövde dizi olarak gönderildi | `Content-Type: application/json` ekleyin ve gövdeyi `{ }` nesnesi olarak gönderin |
| `"musa" kullanıcı adına sahip bir çalışan bulunamadı` | `assignee` alanına kayıtlı olmayan bir kullanıcı adı ya da çalışan kimliği yazıldı | Önce `GET /users` ile kullanıcı adını alın |
| `priorty tanımlı bir parametre değil` | Sorgu parametresinde yazım hatası | Mesajdaki izin verilen parametre listesine bakın |
| Seed sonrası eski veriler görünüyor | Sunucu verileri bellekte tutar | Sunucuyu yeniden başlatın |
| Tarayıcıdan istek CORS hatası veriyor | API, farklı bir origin'den gelen tarayıcı isteklerine izin veren CORS başlıklarını göndermez | Geliştirmede ön yüz sunucusunun proxy özelliğini kullanın (örneğin Vite `server.proxy`) ya da API'yi aynı origin'den sunun |

## 9. Postman ile keşfedin

Kod yazmadan önce uçları denemek için `postman/` klasöründeki koleksiyonu ve ortam dosyasını Postman'e içe aktarın. Koleksiyondaki her istek hazır bir örnek gövde ve beklenen sonucu doğrulayan testler içerir. Ayrıntılar için [README](../README.md#testler) ve [test dokümantasyonuna](TEST_SENARYOLARI.md) bakın.
