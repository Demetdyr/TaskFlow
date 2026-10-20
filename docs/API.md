# TaskFlow API Dokümantasyonu

Sürüm 1.0.0 · Temel adres `http://localhost:3000`

Bu belge TaskFlow API'nin tüm uçlarını, kabul ettiği parametreleri ve döndürdüğü yanıtları açıklar. Örnek yanıtlar `npm run seed` ile yüklenen verilerle çalışan sunucudan alınmıştır; kimlik ve zaman değerleri sizin ortamınızda farklı olacaktır.

## İçindekiler

1. [Genel kurallar](#1-genel-kurallar)
2. [Veri modelleri](#2-veri-modelleri)
3. [Görevler](#3-görevler)
4. [Çalışanlar](#4-çalışanlar)
5. [Projeler](#5-projeler)
6. [Raporlar](#6-raporlar)
7. [Sistem](#7-sistem)

---

## 1. Genel kurallar

### İstek biçimi

- Gövde gönderen istekler (`POST`, `PUT`, `PATCH`) `Content-Type: application/json` başlığı taşımalıdır.
- Gövde bir JSON nesnesi olmalıdır ve en fazla 100 KB olabilir.
- Metin alanlarının başındaki ve sonundaki boşluklar kaydedilmeden önce temizlenir.
- Şemada tanımlı olmayan alanlar ve sorgu parametreleri sessizce yok sayılmaz, `400` hatasıyla bildirilir. Bu sayede `?priorty=high` gibi yazım hataları fark edilir.
- `id`, `createdAt`, `updatedAt` ve `completedAt` alanlarını sunucu yönetir; istemci gönderemez.

### Başarılı yanıt biçimi

Tekil kayıt döndüren uçlar:

```json
{ "data": { "id": "…", "title": "…" } }
```

Liste döndüren uçlar:

```json
{
  "data": [ { "id": "…" } ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 12,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

Silme işlemleri `204 No Content` döner ve gövde içermez.

### Hata yanıt biçimi

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "İstek verileri doğrulanamadı.",
    "details": [
      { "field": "limit", "location": "query", "message": "limit parametresi en fazla 100 olabilir." }
    ]
  }
}
```

`details` yalnızca alan bazlı hatalarda bulunur. `location` değeri hatanın gövdede (`body`) mi sorgu parametresinde (`query`) mi olduğunu belirtir. Birden fazla hata varsa hepsi tek yanıtta listelenir.

| HTTP | `code` | Ne zaman |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Eksik, hatalı türde, kural dışı ya da tanımsız alan veya parametre |
| 400 | `INVALID_JSON` | Gövde geçerli bir JSON değil |
| 404 | `NOT_FOUND` | İstenen görev, çalışan veya proje yok |
| 404 | `ROUTE_NOT_FOUND` | Tanımlı olmayan bir method ve yol çifti |
| 409 | `CONFLICT` | Benzersizlik ihlali ya da ilişkili kaydı olan bir kaydın silinmesi |
| 413 | `PAYLOAD_TOO_LARGE` | Gövde 100 KB sınırını aşıyor |
| 415 | `UNSUPPORTED_CHARSET` | Gövde UTF-8 dışında bir karakter kodlamasıyla gönderildi |
| 500 | `INTERNAL_SERVER_ERROR` | Beklenmeyen sunucu hatası |

### Sayfalama ve sıralama

Tüm liste uçları aşağıdaki ortak parametreleri kabul eder:

| Parametre | Tür | Varsayılan | Kural |
| --- | --- | --- | --- |
| `page` | tam sayı | `1` | En az 1. Son sayfadan sonrası boş liste döner |
| `limit` | tam sayı | `10` | 1 ile 100 arası |
| `sort` | metin | `createdAt` | Kaynağa göre izin verilen alanlardan biri |
| `order` | metin | `asc` | `asc` veya `desc` |

Sıralama kuralları:

- `priority` alfabetik değil anlamına göre sıralanır: `low < medium < high`.
- `status` iş akışı sırasına göre sıralanır: `pending < in-progress < completed`.
- Metin alanları Türkçe alfabeye göre sıralanır (Ç, Ğ, İ, Ö, Ş, Ü doğru yerde).
- Değeri boş olan kayıtlar (örneğin `dueDate: null`) her iki yönde de en sona konur.
- Eşit değerlerde kayıtlar oluşturulma sırasını korur.

---

## 2. Veri modelleri

### Görev (Task)

| Alan | Tür | Kural | Varsayılan |
| --- | --- | --- | --- |
| `id` | UUID | Sunucu üretir | |
| `title` | metin | Zorunlu, 3-100 karakter | |
| `description` | metin | Zorunlu, boş olamaz, en fazla 1000 karakter | |
| `status` | metin | `pending`, `in-progress`, `completed` | `pending` |
| `priority` | metin | `low`, `medium`, `high` | `medium` |
| `assignee` | metin veya `null` | Kayıtlı bir çalışanın kullanıcı adı | `null` |
| `projectId` | UUID veya `null` | Kayıtlı bir projenin kimliği | `null` |
| `dueDate` | `YYYY-AA-GG` veya `null` | Takvimde var olan bir tarih | `null` |
| `completedAt` | ISO 8601 veya `null` | Durum `completed` olduğunda sunucu atar, başka duruma geçince temizler | `null` |
| `createdAt` | ISO 8601 | Sunucu atar | |
| `updatedAt` | ISO 8601 | Her güncellemede sunucu yeniler | |

`status` ve `priority` değerleri büyük harfle gönderilse de küçük harfe çevrilerek kabul edilir.

### Çalışan (User)

| Alan | Tür | Kural | Varsayılan |
| --- | --- | --- | --- |
| `id` | UUID | Sunucu üretir | |
| `username` | metin | Zorunlu, benzersiz, 3-30 karakter, yalnızca `a-z 0-9 . _ -`. Sonradan değiştirilemez | |
| `fullName` | metin | Zorunlu, 3-100 karakter | |
| `email` | metin | Zorunlu, benzersiz, geçerli e-posta, küçük harfe çevrilir | |
| `role` | metin | `manager`, `developer`, `designer`, `tester` | `developer` |
| `createdAt`, `updatedAt` | ISO 8601 | Sunucu atar | |

Görevler çalışana kullanıcı adıyla bağlandığı için `username` alanı oluşturulduktan sonra değiştirilemez.

### Proje (Project)

| Alan | Tür | Kural | Varsayılan |
| --- | --- | --- | --- |
| `id` | UUID | Sunucu üretir | |
| `name` | metin | Zorunlu, 3-100 karakter, büyük-küçük harf gözetmeksizin benzersiz | |
| `description` | metin veya `null` | En fazla 1000 karakter | `null` |
| `status` | metin | `planned`, `active`, `completed` | `active` |
| `createdAt`, `updatedAt` | ISO 8601 | Sunucu atar | |

---

## 3. Görevler

### POST /tasks

Yeni görev oluşturur. `assignee` verilirse sistemde o kullanıcı adına sahip bir çalışan, `projectId` verilirse o kimlikte bir proje bulunmalıdır.

**İstek**

```http
POST /tasks
Content-Type: application/json

{
  "title": "Swagger dokümantasyonunu ekle",
  "description": "Tüm uçlar için OpenAPI tanımı hazırlanacak.",
  "priority": "high",
  "assignee": "mehmet",
  "projectId": "4c330a98-8e69-459f-83c4-d9ab488155d0",
  "dueDate": "2026-10-24"
}
```

**Yanıt** `201 Created` · `Location: /tasks/7aa451cb-4171-4792-aae3-5e7cfe4ead98`

```json
{
  "data": {
    "id": "7aa451cb-4171-4792-aae3-5e7cfe4ead98",
    "title": "Swagger dokümantasyonunu ekle",
    "description": "Tüm uçlar için OpenAPI tanımı hazırlanacak.",
    "status": "pending",
    "priority": "high",
    "assignee": "mehmet",
    "projectId": "4c330a98-8e69-459f-83c4-d9ab488155d0",
    "dueDate": "2026-10-24",
    "completedAt": null,
    "createdAt": "2026-10-17T11:49:12.567Z",
    "updatedAt": "2026-10-17T11:49:12.567Z"
  }
}
```

**Hatalar**

`400 VALIDATION_ERROR`: eksik veya geçersiz alan. Örnek gövde `{ "priority": "urgent", "assignee": "Musa Demir" }` için:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "İstek verileri doğrulanamadı.",
    "details": [
      { "field": "title", "location": "body", "message": "title alanı zorunludur." },
      { "field": "description", "location": "body", "message": "description alanı zorunludur." },
      { "field": "priority", "location": "body", "message": "priority alanı şu değerlerden biri olmalıdır: low, medium, high." },
      { "field": "assignee", "location": "body", "message": "assignee alanı yalnızca küçük harf, rakam, nokta, tire ve alt çizgi içerebilir ve 3-30 karakter olmalıdır." }
    ]
  }
}
```

Kayıtlı olmayan bir çalışana atama yapıldığında:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "İstek verileri doğrulanamadı.",
    "details": [
      { "field": "assignee", "location": "body", "message": "\"hayalet\" kullanıcı adına sahip bir çalışan bulunamadı." }
    ]
  }
}
```

`400 INVALID_JSON`: gövde ayrıştırılamadı.

### GET /tasks

Görevleri filtreleyerek, sıralayarak ve sayfalayarak listeler.

| Parametre | Açıklama | Örnek |
| --- | --- | --- |
| `status` | Duruma göre filtre | `?status=completed` |
| `priority` | Önceliğe göre filtre | `?priority=high` |
| `assignee` | Çalışan kullanıcı adına göre filtre | `?assignee=musa` |
| `projectId` | Projeye göre filtre | `?projectId=4c330a98-…` |
| `page`, `limit` | Sayfalama | `?page=1&limit=10` |
| `sort` | `createdAt`, `updatedAt`, `dueDate`, `priority`, `status`, `title` | `?sort=createdAt` |
| `order` | `asc`, `desc` | `?order=desc` |

Filtreler birlikte kullanılabilir: `GET /tasks?status=pending&priority=high&sort=dueDate`.

**Örnek** `GET /tasks?status=completed&limit=1` → `200 OK`

```json
{
  "data": [
    {
      "id": "b77b798a-5b6f-418e-b1d1-91a9d53376f1",
      "title": "Backend projesini oluştur",
      "description": "Node.js projesi başlatılacak, Express kurulacak ve klasör yapısı hazırlanacak.",
      "status": "completed",
      "priority": "high",
      "assignee": "musa",
      "projectId": "4c330a98-8e69-459f-83c4-d9ab488155d0",
      "dueDate": "2026-10-09",
      "completedAt": "2026-10-08T07:46:06.790Z",
      "createdAt": "2026-10-07T11:46:06.790Z",
      "updatedAt": "2026-10-08T07:46:06.790Z"
    }
  ],
  "pagination": { "page": 1, "limit": 1, "totalItems": 4, "totalPages": 4, "hasNextPage": true, "hasPreviousPage": false }
}
```

**Hata örneği** `GET /tasks?limit=500` → `400`

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "İstek verileri doğrulanamadı.",
    "details": [{ "field": "limit", "location": "query", "message": "limit parametresi en fazla 100 olabilir." }]
  }
}
```

### GET /tasks/search

`keyword` parametresini görevin başlığında ve açıklamasında arar. Arama büyük-küçük harfe ve Türkçe karakterlere duyarsızdır: `odeme` araması "Ödeme ekranı" görevini bulur. Birden fazla kelime girildiğinde tüm kelimeleri içeren görevler döner. `GET /tasks` ile aynı filtre, sıralama ve sayfalama parametrelerini kabul eder.

| Parametre | Kural |
| --- | --- |
| `keyword` | Zorunlu, 2-100 karakter |

**Örnek** `GET /tasks/search?keyword=backend&limit=2` → `200 OK`

```json
{
  "data": [
    {
      "id": "b77b798a-5b6f-418e-b1d1-91a9d53376f1",
      "title": "Backend projesini oluştur",
      "status": "completed",
      "priority": "high",
      "assignee": "musa",
      "…": "…"
    },
    {
      "id": "655c3286-1533-4730-a8c2-661dccbee992",
      "title": "Ürün listesini backend ile entegre et",
      "status": "in-progress",
      "priority": "medium",
      "assignee": "musa",
      "…": "…"
    }
  ],
  "pagination": { "page": 1, "limit": 2, "totalItems": 2, "totalPages": 1, "hasNextPage": false, "hasPreviousPage": false }
}
```

`keyword` gönderilmezse `400` ve `"keyword parametresi zorunludur."` mesajı döner.

### GET /tasks/assignee/:username

Bir çalışana atanmış görevleri listeler. `assignee` dışında `GET /tasks` ile aynı parametreleri kabul eder.

**Örnek** `GET /tasks/assignee/musa?status=in-progress` → `200 OK`, yalnızca `musa` kullanıcısının devam eden görevleri.

Kullanıcı adı kayıtlı değilse `404 NOT_FOUND` döner.

### GET /tasks/:taskId

Tek bir görevin tüm alanlarını döndürür.

**Örnek** `GET /tasks/b77b798a-5b6f-418e-b1d1-91a9d53376f1` → `200 OK`, gövde `POST /tasks` yanıtıyla aynı yapıdadır.

Görev yoksa `404`:

```json
{ "error": { "code": "NOT_FOUND", "message": "olmayan kimlikli görev bulunamadı." } }
```

### PUT /tasks/:taskId

Görevi tamamen değiştirir. Doğrulama kuralları `POST /tasks` ile aynıdır: `title` ve `description` zorunludur, gönderilmeyen isteğe bağlı alanlar varsayılan değerlerine döner. `createdAt` korunur, `updatedAt` yenilenir.

```http
PUT /tasks/7aa451cb-4171-4792-aae3-5e7cfe4ead98
Content-Type: application/json

{
  "title": "Swagger dokümantasyonunu ekle",
  "description": "OpenAPI 3.1 tanımı ve örnek yanıtlar hazırlanacak.",
  "status": "in-progress",
  "priority": "high",
  "assignee": "mehmet",
  "projectId": "4c330a98-8e69-459f-83c4-d9ab488155d0",
  "dueDate": "2026-10-24"
}
```

Yanıt `200 OK`, güncel görev. Görev yoksa `404`, geçersiz veride `400`.

### PATCH /tasks/:taskId

Yalnızca gönderilen alanları günceller. Gövde en az bir alan içermelidir. `title` ve `description` gibi zorunlu alanlar `null` yapılamaz.

Durum `completed` olarak değiştirildiğinde `completedAt` atanır. Görev tamamlanmış kaldığı sürece sonraki güncellemeler bu değeri değiştirmez. Görev yeniden açıldığında değer `null` olur.

**Örnek** `PATCH /tasks/7aa451cb-4171-4792-aae3-5e7cfe4ead98` gövde `{ "status": "completed" }` → `200 OK`

```json
{
  "data": {
    "id": "7aa451cb-4171-4792-aae3-5e7cfe4ead98",
    "title": "Swagger dokümantasyonunu ekle",
    "description": "Tüm uçlar için OpenAPI tanımı hazırlanacak.",
    "status": "completed",
    "priority": "high",
    "assignee": "mehmet",
    "projectId": "4c330a98-8e69-459f-83c4-d9ab488155d0",
    "dueDate": "2026-10-24",
    "completedAt": "2026-10-17T11:49:12.597Z",
    "createdAt": "2026-10-17T11:49:12.567Z",
    "updatedAt": "2026-10-17T11:49:12.597Z"
  }
}
```

Boş gövde `{}` gönderilirse `400` ve `"Güncelleme için en az bir alan gönderilmelidir."` mesajı döner.

### DELETE /tasks/:taskId

Görevi siler. Yanıt `204 No Content`. Görev yoksa `404`.

---

## 4. Çalışanlar

### POST /users

```http
POST /users
Content-Type: application/json

{ "username": "elif", "fullName": "Elif Şahin", "email": "elif@taskflow.dev", "role": "tester" }
```

**Yanıt** `201 Created` · `Location: /users/7fbbbbaf-8225-4e1d-9910-2978224b2f42`

```json
{
  "data": {
    "id": "7fbbbbaf-8225-4e1d-9910-2978224b2f42",
    "username": "elif",
    "fullName": "Elif Şahin",
    "email": "elif@taskflow.dev",
    "role": "tester",
    "createdAt": "2026-10-17T11:49:12.682Z",
    "updatedAt": "2026-10-17T11:49:12.682Z"
  }
}
```

Kullanıcı adı ya da e-posta başka bir çalışanda kayıtlıysa `409 CONFLICT` döner.

### GET /users

Çalışanları listeler. Ortak sayfalama parametrelerine ek olarak:

| Parametre | Açıklama |
| --- | --- |
| `role` | Role göre filtre (`manager`, `developer`, `designer`, `tester`) |
| `sort` | `createdAt`, `username`, `fullName` |

### GET /users/:userId

Çalışan detayı. Yoksa `404`.

### PUT /users/:userId · PATCH /users/:userId

`PUT` için `fullName` ve `email` zorunludur, `role` verilmezse `developer` olur. `PATCH` yalnızca gönderilen alanları değiştirir. İki yöntemde de `username` gönderilirse `400` döner:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "İstek verileri doğrulanamadı.",
    "details": [{ "field": "username", "location": "body", "message": "username alanı oluşturulduktan sonra değiştirilemez." }]
  }
}
```

### DELETE /users/:userId

Çalışanı siler ve `204` döner. Çalışana atanmış görev varsa veri bütünlüğünü korumak için silme reddedilir:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "\"musa\" kullanıcısına atanmış 4 görev olduğu için çalışan silinemez. Önce görevleri başka bir çalışana atayın."
  }
}
```

---

## 5. Projeler

### POST /projects

```http
POST /projects
Content-Type: application/json

{ "name": "Raporlama Modülü", "description": "Yönetici paneli için grafikler.", "status": "planned" }
```

Yanıt `201 Created`, oluşturulan proje. Aynı isimde bir proje varsa (büyük-küçük harf farkı gözetilmeden) `409`.

### GET /projects

Projeleri listeler. `status` (`planned`, `active`, `completed`) ile filtrelenebilir, `sort` için `createdAt`, `name`, `status` kullanılabilir.

**Örnek** `GET /projects?limit=1` → `200 OK`

```json
{
  "data": [
    {
      "id": "4c330a98-8e69-459f-83c4-d9ab488155d0",
      "name": "TaskFlow API",
      "description": "Ekip içi görev ve proje takibini sağlayan REST API.",
      "status": "active",
      "createdAt": "2026-09-27T11:48:08.035Z",
      "updatedAt": "2026-09-27T11:48:08.035Z"
    }
  ],
  "pagination": { "page": 1, "limit": 1, "totalItems": 3, "totalPages": 3, "hasNextPage": true, "hasPreviousPage": false }
}
```

### GET /projects/:projectId

Proje detayı. Yoksa `404`.

### GET /projects/:projectId/tasks

Projeye ait görevleri listeler. `projectId` dışında `GET /tasks` ile aynı filtreleri kabul eder.

**Örnek** `GET /projects/4c330a98-8e69-459f-83c4-d9ab488155d0/tasks?status=completed`

### PUT /projects/:projectId · PATCH /projects/:projectId

`PUT` için `name` zorunludur, diğer alanlar verilmezse varsayılana döner. `PATCH` kısmi günceller.

### DELETE /projects/:projectId

Projeyi siler ve `204` döner. Projeye bağlı görev varsa `409` döner.

---

## 6. Raporlar

Raporlar her istekte güncel verilerden hesaplanır. Oranlar yüzde cinsindendir ve iki ondalık basamağa yuvarlanır. Bir görevin gecikmiş sayılması için tamamlanmamış olması ve `dueDate` değerinin bugünden önce olması gerekir.

### GET /reports/completed

| Alan | Açıklama |
| --- | --- |
| `completedCount` | Tamamlanan görev sayısı |
| `totalTasks` | Toplam görev sayısı |
| `completionRate` | Tamamlanma oranı (%) |
| `byPriority` | Tamamlanan görevlerin önceliğe göre dağılımı |
| `completedLastSevenDays` | Son 7 günde tamamlanan görev sayısı |
| `averageCompletionHours` | Oluşturulmadan tamamlanmaya kadar geçen ortalama süre (saat). Tamamlanan görev yoksa `null` |

```json
{
  "data": {
    "completedCount": 4,
    "totalTasks": 12,
    "completionRate": 33.33,
    "byPriority": { "low": 0, "medium": 2, "high": 2 },
    "completedLastSevenDays": 2,
    "averageCompletionHours": 71
  }
}
```

### GET /reports/pending

| Alan | Açıklama |
| --- | --- |
| `pendingCount` | Durumu `pending` olan görev sayısı |
| `inProgressCount` | Durumu `in-progress` olan görev sayısı |
| `openCount` | Tamamlanmamış toplam görev sayısı |
| `overdueCount` | Geciken görev sayısı |
| `unassignedCount` | Kimseye atanmamış açık görev sayısı |
| `byPriority` | Bekleyen görevlerin önceliğe göre dağılımı |
| `overdueTasks` | Geciken görevler, en eski bitiş tarihinden başlayarak, gecikme gün sayısıyla |

```json
{
  "data": {
    "pendingCount": 5,
    "inProgressCount": 3,
    "openCount": 8,
    "overdueCount": 2,
    "unassignedCount": 1,
    "byPriority": { "low": 3, "medium": 1, "high": 1 },
    "overdueTasks": [
      {
        "id": "6f6fe930-e23a-4d17-bc0b-958d18481475",
        "title": "Bildirim altyapısını kur",
        "status": "pending",
        "assignee": "mehmet",
        "dueDate": "2026-10-15",
        "daysOverdue": 2
      },
      {
        "id": "655c3286-1533-4730-a8c2-661dccbee992",
        "title": "Ürün listesini backend ile entegre et",
        "status": "in-progress",
        "assignee": "musa",
        "dueDate": "2026-10-16",
        "daysOverdue": 1
      }
    ]
  }
}
```

### GET /reports/summary

Tüm sistemin özeti: toplamlar, durum ve öncelik dağılımı, çalışan bazında iş yükü (en yoğundan başlayarak) ve proje bazında ilerleme.

```json
{
  "data": {
    "generatedAt": "2026-10-17T11:49:12.668Z",
    "totals": { "tasks": 12, "users": 5, "projects": 3 },
    "tasksByStatus": { "pending": 5, "inProgress": 3, "completed": 4 },
    "tasksByPriority": { "low": 3, "medium": 5, "high": 4 },
    "completionRate": 33.33,
    "overdueCount": 2,
    "unassignedCount": 1,
    "workloadByAssignee": [
      { "username": "musa", "fullName": "Musa Demir", "totalTasks": 4, "pending": 0, "inProgress": 2, "completed": 2, "overdue": 1 },
      { "username": "mehmet", "fullName": "Mehmet Yıldız", "totalTasks": 3, "pending": 1, "inProgress": 1, "completed": 1, "overdue": 1 },
      { "username": "ayse", "fullName": "Ayşe Kaya", "totalTasks": 2, "pending": 2, "inProgress": 0, "completed": 0, "overdue": 0 },
      { "username": "can", "fullName": "Can Öztürk", "totalTasks": 1, "pending": 1, "inProgress": 0, "completed": 0, "overdue": 0 },
      { "username": "zeynep", "fullName": "Zeynep Aksoy", "totalTasks": 1, "pending": 0, "inProgress": 0, "completed": 1, "overdue": 0 }
    ],
    "progressByProject": [
      { "projectId": "4c330a98-8e69-459f-83c4-d9ab488155d0", "name": "TaskFlow API", "status": "active", "totalTasks": 7, "completed": 3, "completionRate": 42.86 },
      { "projectId": "f3550e59-2d2c-4728-9a50-45e1f3193f97", "name": "Mobil Uygulama", "status": "active", "totalTasks": 3, "completed": 1, "completionRate": 33.33 },
      { "projectId": "44b8c107-980a-42d1-a847-ffc402120eb0", "name": "Müşteri Portalı", "status": "planned", "totalTasks": 1, "completed": 0, "completionRate": 0 }
    ]
  }
}
```

---

## 7. Sistem

### GET /

API adı, sürümü ve kaynak bağlantıları.

```json
{
  "data": {
    "name": "TaskFlow API",
    "version": "1.0.0",
    "description": "Görev ve Proje Yönetim Sistemi REST API",
    "resources": { "tasks": "/tasks", "users": "/users", "projects": "/projects", "reports": "/reports/summary" },
    "health": "/health"
  }
}
```

### GET /health

```json
{ "data": { "status": "ok", "uptimeInSeconds": 128, "timestamp": "2026-10-17T11:52:10.004Z" } }
```

Tanımlı olmayan her yol için:

```json
{ "error": { "code": "ROUTE_NOT_FOUND", "message": "GET /olmayan-endpoint için tanımlı bir endpoint bulunamadı." } }
```
