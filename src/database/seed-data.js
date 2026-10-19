const MILLISECONDS_PER_HOUR = 3_600_000;
const HOURS_PER_DAY = 24;

const PROJECT_IDS = Object.freeze({
  taskflowApi: '4c330a98-8e69-459f-83c4-d9ab488155d0',
  mobileApp: 'f3550e59-2d2c-4728-9a50-45e1f3193f97',
  customerPortal: '44b8c107-980a-42d1-a847-ffc402120eb0',
});

const userBlueprints = [
  { id: '76cdbfc0-241b-4713-bd9b-fa95d4e47b72', username: 'musa', fullName: 'Musa Demir', email: 'musa@taskflow.dev', role: 'developer' },
  { id: 'f00464c7-054f-448a-b496-1d4f8c8ce928', username: 'ayse', fullName: 'Ayşe Kaya', email: 'ayse@taskflow.dev', role: 'manager' },
  { id: 'eebeb673-1216-432c-895d-4190ea94fca0', username: 'mehmet', fullName: 'Mehmet Yıldız', email: 'mehmet@taskflow.dev', role: 'developer' },
  { id: 'fa498777-37e5-4f2f-afea-c24906db3ca0', username: 'zeynep', fullName: 'Zeynep Aksoy', email: 'zeynep@taskflow.dev', role: 'designer' },
  { id: '6ba3831e-f9b0-4081-877f-474f7930becb', username: 'can', fullName: 'Can Öztürk', email: 'can@taskflow.dev', role: 'tester' },
];

const projectBlueprints = [
  {
    id: PROJECT_IDS.taskflowApi,
    name: 'TaskFlow API',
    description: 'Ekip içi görev ve proje takibini sağlayan REST API.',
    status: 'active',
  },
  {
    id: PROJECT_IDS.mobileApp,
    name: 'Mobil Uygulama',
    description: 'Saha ekibinin görevlerini telefondan takip edebileceği istemci.',
    status: 'active',
  },
  {
    id: PROJECT_IDS.customerPortal,
    name: 'Müşteri Portalı',
    description: 'Müşterilerin talep açıp ilerlemeyi izleyebileceği web portalı.',
    status: 'planned',
  },
];

const taskBlueprints = [
  {
    id: 'b77b798a-5b6f-418e-b1d1-91a9d53376f1',
    title: 'Backend projesini oluştur',
    description: 'Node.js projesi başlatılacak, Express kurulacak ve klasör yapısı hazırlanacak.',
    status: 'completed',
    priority: 'high',
    assignee: 'musa',
    projectId: PROJECT_IDS.taskflowApi,
    dueInDays: -8,
    createdHoursAgo: 240,
    completedHoursAgo: 220,
  },
  {
    id: 'ba243bf5-fce2-4a98-bbbb-f85fbabd9541',
    title: 'Express routing yapısını hazırla',
    description: 'Görev, çalışan, proje ve rapor uçları için ayrı router dosyaları oluşturulacak.',
    status: 'completed',
    priority: 'high',
    assignee: 'musa',
    projectId: PROJECT_IDS.taskflowApi,
    dueInDays: -6,
    createdHoursAgo: 216,
    completedHoursAgo: 170,
  },
  {
    id: '5dc7e317-d59b-4f07-9df3-6a8d34a72020',
    title: 'Logger middleware geliştir',
    description: 'Her isteğin method, endpoint ve zaman damgası konsola ve log dosyasına yazılacak.',
    status: 'completed',
    priority: 'medium',
    assignee: 'mehmet',
    projectId: PROJECT_IDS.taskflowApi,
    dueInDays: -3,
    createdHoursAgo: 168,
    completedHoursAgo: 90,
  },
  {
    id: 'e0e72700-a612-45bc-8f16-f53bf37bc5ae',
    title: 'Görev CRUD uçlarını yaz',
    description: 'Ekleme, listeleme, detay, güncelleme ve silme işlemleri tamamlanacak.',
    status: 'in-progress',
    priority: 'high',
    assignee: 'musa',
    projectId: PROJECT_IDS.taskflowApi,
    dueInDays: 2,
    createdHoursAgo: 120,
  },
  {
    id: '56e6cfbd-3bc6-4ae1-b3b6-bb5d4371f6e1',
    title: 'Validation middleware ekle',
    description: 'title, description, priority ve assignee alanları için 400 dönen doğrulama katmanı.',
    status: 'in-progress',
    priority: 'medium',
    assignee: 'mehmet',
    projectId: PROJECT_IDS.taskflowApi,
    dueInDays: 4,
    createdHoursAgo: 96,
  },
  {
    id: 'e287b356-1015-4566-b295-3562f0221cf8',
    title: 'Raporlama servislerini tasarla',
    description: 'Tamamlanan, bekleyen ve genel özet raporlarının çıktı formatı belirlenecek.',
    status: 'pending',
    priority: 'medium',
    assignee: 'ayse',
    projectId: PROJECT_IDS.taskflowApi,
    dueInDays: 7,
    createdHoursAgo: 72,
  },
  {
    id: 'f82f952c-e33a-4f60-b3a2-3dc1e1a85fd8',
    title: 'Postman test koleksiyonunu hazırla',
    description: 'Tüm uçlar için örnek istekler ve otomatik test betikleri eklenecek.',
    status: 'pending',
    priority: 'low',
    assignee: 'can',
    projectId: PROJECT_IDS.taskflowApi,
    dueInDays: 5,
    createdHoursAgo: 48,
  },
  {
    id: 'd580e0cb-b39b-4749-a1ee-a297c8c4961e',
    title: 'Giriş ekranı arayüzünü tasarla',
    description: 'Mobil uygulama için oturum açma ekranının tasarımı hazırlanacak.',
    status: 'completed',
    priority: 'medium',
    assignee: 'zeynep',
    projectId: PROJECT_IDS.mobileApp,
    dueInDays: -2,
    createdHoursAgo: 200,
    completedHoursAgo: 60,
  },
  {
    id: '6f6fe930-e23a-4d17-bc0b-958d18481475',
    title: 'Bildirim altyapısını kur',
    description: 'Görev atandığında çalışana anlık bildirim gönderilecek.',
    status: 'pending',
    priority: 'high',
    assignee: 'mehmet',
    projectId: PROJECT_IDS.mobileApp,
    dueInDays: -2,
    createdHoursAgo: 150,
  },
  {
    id: '655c3286-1533-4730-a8c2-661dccbee992',
    title: 'Ürün listesini backend ile entegre et',
    description: 'Mobil uygulamadaki liste ekranı API üzerinden beslenecek.',
    status: 'in-progress',
    priority: 'medium',
    assignee: 'musa',
    projectId: PROJECT_IDS.mobileApp,
    dueInDays: -1,
    createdHoursAgo: 130,
  },
  {
    id: '8ce571fb-b8d4-4d16-8cbb-313595dd3671',
    title: 'Müşteri portalı gereksinim analizi',
    description: 'Paydaşlarla görüşülerek ilk sürümün kapsamı netleştirilecek.',
    status: 'pending',
    priority: 'low',
    assignee: 'ayse',
    projectId: PROJECT_IDS.customerPortal,
    dueInDays: 14,
    createdHoursAgo: 24,
  },
  {
    id: '6476fea4-892c-4b5e-94b1-e3a7eccc0797',
    title: 'API kullanım kılavuzunu yaz',
    description: 'Entegrasyon adımları, örnek istekler ve hata kodları dokümante edilecek.',
    status: 'pending',
    priority: 'low',
    assignee: null,
    projectId: null,
    dueInDays: null,
    createdHoursAgo: 6,
  },
];

function toTimestampHoursBefore(referenceTime, hours) {
  return new Date(referenceTime.getTime() - hours * MILLISECONDS_PER_HOUR).toISOString();
}

function toCalendarDateDaysAfter(referenceTime, days) {
  return new Date(referenceTime.getTime() + days * HOURS_PER_DAY * MILLISECONDS_PER_HOUR).toISOString().slice(0, 10);
}

export function createSeedData(seedTime) {
  const users = userBlueprints.map((userBlueprint) => {
    const createdAt = toTimestampHoursBefore(seedTime, 30 * HOURS_PER_DAY);
    return { ...userBlueprint, createdAt, updatedAt: createdAt };
  });

  const projects = projectBlueprints.map((projectBlueprint) => {
    const createdAt = toTimestampHoursBefore(seedTime, 20 * HOURS_PER_DAY);
    return { ...projectBlueprint, createdAt, updatedAt: createdAt };
  });

  const tasks = taskBlueprints.map(({ dueInDays, createdHoursAgo, completedHoursAgo, ...taskFields }) => {
    const completedAt = completedHoursAgo === undefined ? null : toTimestampHoursBefore(seedTime, completedHoursAgo);
    return {
      ...taskFields,
      dueDate: dueInDays === null ? null : toCalendarDateDaysAfter(seedTime, dueInDays),
      completedAt,
      createdAt: toTimestampHoursBefore(seedTime, createdHoursAgo),
      updatedAt: completedAt ?? toTimestampHoursBefore(seedTime, createdHoursAgo),
    };
  });

  return { users, projects, tasks };
}
