const turkishCollator = new Intl.Collator('tr', { sensitivity: 'base', numeric: true });

function compareDefinedValues(leftValue, rightValue) {
  if (typeof leftValue === 'string' && typeof rightValue === 'string') {
    return turkishCollator.compare(leftValue, rightValue);
  }
  if (leftValue === rightValue) {
    return 0;
  }
  return leftValue < rightValue ? -1 : 1;
}

function createRecordComparator(sortField, sortOrder, sortValueResolvers) {
  const resolveSortValue = sortValueResolvers[sortField] ?? ((record) => record[sortField]);
  const orderMultiplier = sortOrder === 'desc' ? -1 : 1;

  return (leftRecord, rightRecord) => {
    const leftValue = resolveSortValue(leftRecord) ?? null;
    const rightValue = resolveSortValue(rightRecord) ?? null;

    if (leftValue === null || rightValue === null) {
      if (leftValue !== rightValue) {
        return leftValue === null ? 1 : -1;
      }
    } else {
      const comparison = compareDefinedValues(leftValue, rightValue);
      if (comparison !== 0) {
        return comparison * orderMultiplier;
      }
    }

    return compareDefinedValues(leftRecord.createdAt, rightRecord.createdAt);
  };
}

function matchesFilters(record, filters) {
  return Object.entries(filters).every(([fieldName, expectedValue]) => record[fieldName] === expectedValue);
}

function removeUndefinedEntries(source) {
  return Object.fromEntries(Object.entries(source).filter(([, value]) => value !== undefined));
}

export function paginateRecords(records, { page, limit }) {
  const totalItems = records.length;
  const totalPages = Math.ceil(totalItems / limit);
  const startIndex = (page - 1) * limit;

  return {
    items: records.slice(startIndex, startIndex + limit),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export function queryRecords(records, { filters = {}, matchesKeyword, sort, order, page, limit, sortValueResolvers = {} }) {
  const activeFilters = removeUndefinedEntries(filters);
  const matchingRecords = records.filter(
    (record) => matchesFilters(record, activeFilters) && (matchesKeyword ? matchesKeyword(record) : true),
  );
  const sortedRecords = matchingRecords.sort(createRecordComparator(sort, order, sortValueResolvers));

  return paginateRecords(sortedRecords, { page, limit });
}
