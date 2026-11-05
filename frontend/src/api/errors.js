export function getApiError(error, fallback = 'Something went wrong. Please try again.') {
  if (typeof error === 'string') return error;
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (!error?.response) return 'Unable to connect. Check your connection and try again.';
  if (error.response.status === 403) return 'You do not have permission for this action, or your security token has expired. Refresh the page and try again.';
  const flatten = (value, prefix = '') => {
    if (typeof value === 'string') return prefix ? `${prefix}: ${value}` : value;
    if (Array.isArray(value)) return value.map((item) => flatten(item, prefix)).filter(Boolean).join(' ');
    if (value && typeof value === 'object') return Object.entries(value).map(([key, item]) => flatten(item, ['detail', 'error', 'non_field_errors'].includes(key) ? '' : key.replaceAll('_', ' '))).filter(Boolean).join(' ');
    return '';
  };
  // Do not display internal server exception details to users.
  if (error.response.status >= 500) return 'The server could not complete the request. Please try again.';
  return flatten(error.response.data) || fallback;
}
