const DOTTED_AND_DOTLESS_I_PATTERN = /[İIı]/g;
const COMBINING_MARKS_PATTERN = /\p{Mark}/gu;
const WHITESPACE_PATTERN = /\s+/;

export function normalizeForSearch(text) {
  return text
    .replace(DOTTED_AND_DOTLESS_I_PATTERN, 'i')
    .normalize('NFD')
    .replace(COMBINING_MARKS_PATTERN, '')
    .toLowerCase();
}

export function createKeywordMatcher(keyword, searchableFields) {
  const searchTerms = normalizeForSearch(keyword).split(WHITESPACE_PATTERN).filter(Boolean);

  return (record) => {
    const searchableText = normalizeForSearch(searchableFields.map((fieldName) => record[fieldName] ?? '').join(' '));
    return searchTerms.every((searchTerm) => searchableText.includes(searchTerm));
  };
}
