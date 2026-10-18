export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const sampleTaskInput = Object.freeze({
  title: 'Kullanıcı girişi endpointini yaz',
  description: 'E-posta ve parola ile oturum açan POST /auth/login ucu geliştirilecek.',
});

export const sampleUserInput = Object.freeze({
  username: 'musa',
  fullName: 'Musa Demir',
  email: 'musa@taskflow.dev',
  role: 'developer',
});

export const sampleProjectInput = Object.freeze({
  name: 'Mobil Uygulama',
  description: 'TaskFlow mobil istemcisinin ilk sürümü.',
});

export async function createTask(api, overrides = {}) {
  const response = await api.post('/tasks').send({ ...sampleTaskInput, ...overrides }).expect(201);
  return response.body.data;
}

export async function createUser(api, overrides = {}) {
  const response = await api.post('/users').send({ ...sampleUserInput, ...overrides }).expect(201);
  return response.body.data;
}

export async function createProject(api, overrides = {}) {
  const response = await api.post('/projects').send({ ...sampleProjectInput, ...overrides }).expect(201);
  return response.body.data;
}

export function findErrorDetail(responseBody, fieldName) {
  return responseBody.error.details?.find((detail) => detail.field === fieldName);
}
