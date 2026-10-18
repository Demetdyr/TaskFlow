const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INTEGER_TEXT_PATTERN = /^-?\d+$/;

const LOCATION_WORDING = Object.freeze({
  body: { fieldNoun: 'alanı', unknownFieldNoun: 'alan' },
  query: { fieldNoun: 'parametresi', unknownFieldNoun: 'parametre' },
});

const INVALID_CONTAINER_MESSAGES = Object.freeze({
  body: 'İstek gövdesi bir JSON nesnesi olmalıdır. Content-Type: application/json başlığıyla {"alan": "değer"} biçiminde veri gönderin.',
  query: 'Sorgu parametreleri okunamadı.',
});

function isCalendarDate(value) {
  if (!CALENDAR_DATE_PATTERN.test(value)) {
    return false;
  }
  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().startsWith(value);
}

const VALUE_FORMATS = Object.freeze({
  uuid: { isValid: (value) => UUID_PATTERN.test(value), requirement: 'geçerli bir UUID olmalıdır' },
  date: { isValid: isCalendarDate, requirement: 'YYYY-AA-GG biçiminde geçerli bir tarih olmalıdır' },
  email: { isValid: (value) => EMAIL_PATTERN.test(value), requirement: 'geçerli bir e-posta adresi olmalıdır' },
});

function validateString(rawValue, rule, label) {
  if (typeof rawValue !== 'string') {
    return { message: `${label} metin (string) olmalıdır.` };
  }

  const trimmedValue = rawValue.trim();
  const value = rule.lowercase ? trimmedValue.toLowerCase() : trimmedValue;

  if (value === '') {
    return { message: `${label} boş bırakılamaz.` };
  }
  if (rule.minLength !== undefined && value.length < rule.minLength) {
    return { message: `${label} en az ${rule.minLength} karakter olmalıdır.` };
  }
  if (rule.maxLength !== undefined && value.length > rule.maxLength) {
    return { message: `${label} en fazla ${rule.maxLength} karakter olabilir.` };
  }
  if (rule.enum && !rule.enum.includes(value)) {
    return { message: `${label} şu değerlerden biri olmalıdır: ${rule.enum.join(', ')}.` };
  }
  if (rule.pattern && !rule.pattern.test(value)) {
    return { message: `${label} ${rule.patternDescription}.` };
  }
  if (rule.format && !VALUE_FORMATS[rule.format].isValid(value)) {
    return { message: `${label} ${VALUE_FORMATS[rule.format].requirement}.` };
  }
  return { value };
}

function validateInteger(rawValue, rule, label) {
  const isIntegerText = typeof rawValue === 'string' && INTEGER_TEXT_PATTERN.test(rawValue.trim());
  const value = isIntegerText ? Number(rawValue.trim()) : rawValue;

  if (!Number.isSafeInteger(value)) {
    return { message: `${label} tam sayı olmalıdır.` };
  }
  if (rule.min !== undefined && value < rule.min) {
    return { message: `${label} en az ${rule.min} olmalıdır.` };
  }
  if (rule.max !== undefined && value > rule.max) {
    return { message: `${label} en fazla ${rule.max} olabilir.` };
  }
  return { value };
}

const TYPE_VALIDATORS = Object.freeze({
  string: validateString,
  integer: validateInteger,
});

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function listAcceptedFields(schema) {
  return Object.entries(schema)
    .filter(([, rule]) => !rule.immutable)
    .map(([fieldName]) => fieldName)
    .join(', ');
}

function findUnexpectedFieldErrors(input, schema, location) {
  const wording = LOCATION_WORDING[location];

  return Object.keys(input).flatMap((fieldName) => {
    if (!Object.hasOwn(schema, fieldName)) {
      const message = `${fieldName} tanımlı bir ${wording.unknownFieldNoun} değil. İzin verilenler: ${listAcceptedFields(schema)}.`;
      return [{ field: fieldName, location, message }];
    }
    if (schema[fieldName].immutable) {
      return [{ field: fieldName, location, message: `${fieldName} ${wording.fieldNoun} oluşturulduktan sonra değiştirilemez.` }];
    }
    return [];
  });
}

export function validateAgainstSchema(input, schema, { location, isPartial = false }) {
  if (!isPlainObject(input)) {
    return { value: null, errors: [{ field: location, location, message: INVALID_CONTAINER_MESSAGES[location] }] };
  }

  const wording = LOCATION_WORDING[location];
  const errors = findUnexpectedFieldErrors(input, schema, location);
  const value = {};
  let providedFieldCount = 0;

  for (const [fieldName, rule] of Object.entries(schema)) {
    if (rule.immutable) {
      continue;
    }

    const label = `${fieldName} ${wording.fieldNoun}`;
    const rawValue = Object.hasOwn(input, fieldName) ? input[fieldName] : undefined;

    if (rawValue === undefined) {
      if (isPartial) {
        continue;
      }
      if (rule.required) {
        errors.push({ field: fieldName, location, message: `${label} zorunludur.` });
      } else if (Object.hasOwn(rule, 'default')) {
        value[fieldName] = rule.default;
      }
      continue;
    }

    providedFieldCount += 1;

    if (rawValue === null) {
      if (rule.nullable) {
        value[fieldName] = null;
      } else {
        errors.push({ field: fieldName, location, message: `${label} null olamaz.` });
      }
      continue;
    }

    const fieldResult = TYPE_VALIDATORS[rule.type](rawValue, rule, label);
    if (fieldResult.message) {
      errors.push({ field: fieldName, location, message: fieldResult.message });
    } else {
      value[fieldName] = fieldResult.value;
    }
  }

  if (isPartial && providedFieldCount === 0 && errors.length === 0) {
    errors.push({ field: location, location, message: 'Güncelleme için en az bir alan gönderilmelidir.' });
  }

  return { value, errors };
}
