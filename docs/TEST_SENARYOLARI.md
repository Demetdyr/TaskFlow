# Test Dokümantasyonu

Bu belge TaskFlow API için yazılmış test senaryolarını ve son çalıştırma sonuçlarını içerir. Testler iki katmandan oluşur:

1. **Otomatik testler** (`npm test`): Node.js'in yerleşik `node:test` çalıştırıcısı ve `supertest` ile yazılmıştır. Her test geçici bir veri klasöründe ve sabit bir saatle çalışır. Bu sayede zaman damgaları ve gecikme hesapları her çalıştırmada aynı sonucu verir.
2. **Postman testleri** (`postman/TaskFlow.postman_collection.json`): Çalışan sunucuya gerçek HTTP istekleri gönderir. Her isteğin durum kodunu ve yanıt içeriğini doğrulayan test betikleri vardır. Arayüzden Postman Runner ile ya da komut satırından `npm run test:postman` ile çalıştırılır.

## Son çalıştırma

| | Sonuç |
| --- | --- |
| Tarih | 17.10.2026 |
| Ortam | macOS, Node.js 24.4.1, Express 5.3.0 |
| `npm test` | 127 test, 127 başarılı, 0 hata |
| `npm run test:postman` | 43 istek, 198 doğrulama, 0 hata |

Postman ekran görüntüleri `teslim/3-test-ekran-goruntuleri/` klasöründedir. Görüntüler Postman masaüstü uygulamasında, istekler cURL ile içe aktarılıp gönderilerek alınmıştır:

| Dosya | Senaryo | Sonuç |
| --- | --- | --- |
| `01-gorev-ekleme-post.png` | TS-01 Görev ekleme | `201 Created` |
| `02-gorevleri-listeleme-get.png` | TS-02 Görevleri listeleme | `200 OK` |
| `03-gorev-detayi-get.png` | TS-03 Görev detayı | `200 OK` |
| `04-gorev-guncelleme-put.png` | TS-04 Görevi tamamen güncelleme | `200 OK` |
| `05-gorev-kismi-guncelleme-patch.png` | TS-05 Görevi tamamlandı olarak işaretleme, `completedAt` ataması | `200 OK` |
| `06-gorev-silme-delete.png` | TS-06 Görevi silme | `204 No Content` |
| `07-arama-ve-filtreleme.png` | TS-10 Anahtar kelime ve durumla arama | `200 OK` |
| `08-validation-hatasi-400.png` | TS-15, TS-17, TS-18 Birden fazla geçersiz alan | `400 Bad Request` |
| `09-rapor-genel-ozet.png` | TS-26 Genel sistem özeti | `200 OK` |
| `10-filtreleme-siralama-sayfalama.png` | TS-12, TS-14 Filtre, sıralama ve sayfalama | `200 OK` |

## Ön koşullar

```bash
npm install
npm run seed
npm start
```

Postman senaryoları `npm run seed` ile yüklenen örnek verilere dayanır. Örneğin `musa` ve `can` çalışanları ile `TaskFlow API` projesi bu verilerden gelir. Koleksiyon kendi oluşturduğu görev, çalışan ve projeyi sonunda sildiği için veri değişmez ve tekrar çalıştırılabilir.

Koleksiyonun tüm isteklerine uygulanan ortak kontroller:

- Gövdesi olan her yanıt JSON biçimindedir.
- Yanıt süresi 1 saniyenin altındadır.

---

## 1. Görev CRUD (zorunlu kapsam)

| No | Senaryo | İstek | Beklenen sonuç | Sonuç |
| --- | --- | --- | --- | --- |
| TS-01 | Geçerli verilerle görev ekleme | `POST /tasks` başlık, açıklama, `priority: high`, `assignee: can`, proje ve bitiş tarihiyle | `201 Created`. UUID kimlik üretilir, gönderilen alanlar kaydedilir, `status` varsayılan olarak `pending` olur, `Location` başlığı `/tasks/{id}` değerini taşır | Geçti |
| TS-02 | Görevleri listeleme | `GET /tasks` | `200 OK`. `data` bir dizidir, `pagination` alanında `page`, `limit`, `totalItems` ve `totalPages` bulunur | Geçti |
| TS-03 | Görev detayı | `GET /tasks/{taskId}` | `200 OK`. TS-01'de oluşturulan görev döner, zaman damgaları mevcuttur | Geçti |
| TS-04 | Görevi tamamen güncelleme | `PUT /tasks/{taskId}` tüm alanlarla | `200 OK`. Başlık ve durum (`in-progress`) güncellenir, `updatedAt` değeri `createdAt` değerinden önce olmaz | Geçti |
| TS-05 | Görevi kısmen güncelleme | `PATCH /tasks/{taskId}` `{ "status": "completed" }` | `200 OK`. Durum `completed` olur, `completedAt` atanır, diğer alanlar korunur | Geçti |
| TS-06 | Görevi silme | `DELETE /tasks/{taskId}` | `204 No Content`, gövde boş | Geçti |
| TS-07 | Silinen görevi getirme | `GET /tasks/{taskId}` | `404 Not Found`, `error.code = NOT_FOUND` | Geçti |

## 2. Filtreleme, arama ve sayfalama (isteğe bağlı 01)

| No | Senaryo | İstek | Beklenen sonuç | Sonuç |
| --- | --- | --- | --- | --- |
| TS-08 | Duruma göre filtreleme | `GET /tasks?status=completed` | Sonuç boş değildir ve tüm görevlerin durumu `completed` olur | Geçti |
| TS-09 | Önceliğe göre filtreleme | `GET /tasks?priority=high` | Tüm görevlerin önceliği `high` olur | Geçti |
| TS-10 | Anahtar kelimeyle arama | `GET /tasks/search?keyword=backend` | Her sonucun başlığında ya da açıklamasında "backend" geçer | Geçti |
| TS-11 | Kullanıcı bazlı listeleme | `GET /tasks/assignee/musa` | Tüm görevler `musa` kullanıcısına atanmıştır | Geçti |
| TS-12 | Sayfalama | `GET /tasks?page=2&limit=5` | En fazla 5 kayıt döner. `page = 2`, `limit = 5`, `hasPreviousPage = true` | Geçti |
| TS-13 | Sıralama | `GET /tasks?sort=createdAt&order=desc` | Görevler yeniden eskiye sıralıdır | Geçti |
| TS-14 | Birleşik sorgu | `GET /tasks?status=pending&sort=priority&order=desc&limit=3` | En fazla 3 bekleyen görev döner, öncelikler yüksekten düşüğe sıralıdır | Geçti |

## 3. Doğrulama (isteğe bağlı 02)

| No | Senaryo | İstek | Beklenen sonuç | Sonuç |
| --- | --- | --- | --- | --- |
| TS-15 | Eksik başlık | `POST /tasks` `title` olmadan | `400`, `VALIDATION_ERROR`, `title` için açıklayıcı mesaj | Geçti |
| TS-16 | Eksik açıklama | `POST /tasks` `description` olmadan | `400`, `description` için mesaj | Geçti |
| TS-17 | Geçersiz öncelik | `POST /tasks` `priority: urgent` | `400`. Mesaj izin verilen değerleri (`low, medium, high`) listeler | Geçti |
| TS-18 | Hatalı kullanıcı adı biçimi | `POST /tasks` `assignee: "Musa Demir"` | `400`, `assignee` için biçim mesajı | Geçti |
| TS-19 | Kayıtlı olmayan çalışan | `POST /tasks` `assignee: hayalet` | `400`, "çalışan bulunamadı" mesajı | Geçti |
| TS-20 | Tanımsız alan | `POST /tasks` ek `tags` alanıyla | `400`, `tags` alanı tanımsız olarak bildirilir | Geçti |
| TS-21 | Bozuk JSON | `POST /tasks` kapanmamış tırnaklı gövde | `400`, `error.code = INVALID_JSON` | Geçti |
| TS-22 | Geçersiz sorgu parametreleri | `GET /tasks?limit=500&status=done` | `400`. Hem `limit` hem `status` için hata detayı döner | Geçti |
| TS-23 | Boş PATCH gövdesi | `PATCH /tasks/{seedTaskId}` `{}` | `400`, "en az bir alan gönderilmelidir" mesajı | Geçti |

## 4. Raporlar (isteğe bağlı 03)

| No | Senaryo | İstek | Beklenen sonuç | Sonuç |
| --- | --- | --- | --- | --- |
| TS-24 | Tamamlanan görev raporu | `GET /reports/completed` | `completedCount` sayıdır, `completionRate` 0-100 aralığındadır, öncelik dağılımının toplamı `completedCount` değerine eşittir | Geçti |
| TS-25 | Bekleyen görev raporu | `GET /reports/pending` | `openCount = pendingCount + inProgressCount`, `overdueTasks` uzunluğu `overdueCount` değerine eşittir | Geçti |
| TS-26 | Genel sistem özeti | `GET /reports/summary` | Durum dağılımının toplamı toplam görev sayısına eşittir, her çalışan için bir iş yükü satırı vardır | Geçti |

## 5. Çalışanlar

| No | Senaryo | İstek | Beklenen sonuç | Sonuç |
| --- | --- | --- | --- | --- |
| TS-27 | Çalışanları listeleme | `GET /users?sort=username` | `200`, liste boş değil | Geçti |
| TS-28 | Çalışan ekleme | `POST /users` rastgele kullanıcı adıyla | `201`, kullanıcı adı ve rol kaydedilir | Geçti |
| TS-29 | Çalışan detayı | `GET /users/{userId}` | `200`, doğru çalışan döner | Geçti |
| TS-30 | Çalışan güncelleme | `PATCH /users/{userId}` `{ "role": "designer" }` | `200`, rol güncellenir | Geçti |
| TS-31 | Kullanıcı adı değişikliği | `PATCH /users/{userId}` `{ "username": "baska.ad" }` | `400`, "sonradan değiştirilemez" mesajı | Geçti |
| TS-32 | Mükerrer kullanıcı adı | `POST /users` `username: musa` | `409 Conflict` | Geçti |
| TS-33 | Çalışan silme | `DELETE /users/{userId}` | `204 No Content` | Geçti |

## 6. Projeler

| No | Senaryo | İstek | Beklenen sonuç | Sonuç |
| --- | --- | --- | --- | --- |
| TS-34 | Projeleri listeleme | `GET /projects` | `200`, `data` bir dizi | Geçti |
| TS-35 | Proje ekleme | `POST /projects` `status: planned` | `201`, durum `planned` | Geçti |
| TS-36 | Proje detayı | `GET /projects/{projectId}` | `200`, doğru proje | Geçti |
| TS-37 | Projenin görevleri | `GET /projects/{seedProjectId}/tasks?status=completed` | Tüm görevler bu projeye aittir ve tamamlanmıştır | Geçti |
| TS-38 | Proje güncelleme | `PATCH /projects/{projectId}` `{ "status": "active" }` | `200`, durum `active` | Geçti |
| TS-39 | Görevi olan projeyi silme | `DELETE /projects/{seedProjectId}` | `409`, mesaj bağlı görev sayısını belirtir | Geçti |
| TS-40 | Proje silme | `DELETE /projects/{projectId}` | `204 No Content` | Geçti |

## 7. Sistem

| No | Senaryo | İstek | Beklenen sonuç | Sonuç |
| --- | --- | --- | --- | --- |
| TS-41 | API bilgisi | `GET /` | `200`, `name = TaskFlow API` | Geçti |
| TS-42 | Sağlık kontrolü | `GET /health` | `200`, `status = ok` | Geçti |
| TS-43 | Tanımsız endpoint | `GET /olmayan-endpoint` | `404`, `error.code = ROUTE_NOT_FOUND` | Geçti |

---

## Otomatik test kapsamı

| Dosya | Test | Kapsadığı davranışlar |
| --- | --- | --- |
| `tests/tasks.test.js` | 15 | CRUD uçları, varsayılan değerler, metinlerin kırpılması, `completedAt` yaşam döngüsü, PUT ile varsayılana dönüş, verinin yeniden başlatmada korunması |
| `tests/task-validation.test.js` | 24 | Her alan için zorunluluk, tür, uzunluk, izinli değer, biçim ve takvim tarihi kontrolleri; tanımsız ve sunucu yönetimli alanlar; dizi gövde; yanlış `Content-Type`; bozuk JSON; PUT ve PATCH kuralları |
| `tests/task-queries.test.js` | 24 | Durum, öncelik ve proje filtreleri; Türkçe karakterden bağımsız arama; çok kelimeli arama; kullanıcı bazlı listeleme; sayfalama sınırları; öncelik, tarih ve Türkçe alfabe sıralaması; boş değerlerin sona konması; tanımsız sorgu parametresi |
| `tests/users.test.js` | 19 | Çalışan CRUD, aynı anda gelen kayıtlarda bile kullanıcı adı ve e-posta benzersizliği, değiştirilemeyen kullanıcı adı, görevi olan çalışanın silinmesinin engellenmesi, görev atamasında çalışan kontrolü |
| `tests/projects.test.js` | 14 | Proje CRUD, Türkçe ve ASCII harf farkından bağımsız isim benzersizliği, projeye ait görevler, görevi olan projenin silinmesinin engellenmesi, geçersiz proje referansı |
| `tests/reports.test.js` | 5 | Üç raporun tüm alanları, sabit saatle gecikme ve son 7 gün hesapları, boş veri durumu |
| `tests/request-logger.test.js` | 5 | Log satırı biçimi, dosyaya ekleme ve klasör oluşturma, reddedilen isteklerin kaydı, kapalı loglama, uygulamaya bağlanma |
| `tests/json-collection.test.js` | 11 | Dosya yokken boş liste, koşula göre sayma, kalıcı yazma, birleştirerek güncelleme, silme, eş zamanlı yazmalarda veri kaybı olmaması, dışarı verilen kayıtların kopya olması, diske yazılamayan değişikliğin bellekte de uygulanmaması |
| `tests/seed.test.js` | 5 | Örnek veri sayıları, referans bütünlüğü, tekrar çalıştırmada sıfırlama, yazma hatasında önceki verilere geri dönme |
| `tests/system.test.js` | 5 | `/`, `/health`, tanımsız endpoint, desteklenmeyen karakter kodlamasında 415, `X-Powered-By` başlığının gizlenmesi |

Belirli bir dosyayı tek başına çalıştırmak için:

```bash
node --test tests/task-validation.test.js
```
