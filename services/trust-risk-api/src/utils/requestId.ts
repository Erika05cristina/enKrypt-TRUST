export const createRequestId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `req_${crypto.randomUUID()}`;
  }

  const fallback = Math.random().toString(36).slice(2, 12);
  return `req_${fallback}`;
};

