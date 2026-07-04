function extractMessage(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return extractMessage(record.error ?? record.message ?? record.response);
  }
  return '';
}

export function userFacingError(value: unknown, fallback = 'Something went wrong. Please try again later.') {
  const message = extractMessage(value).toLowerCase();

  if (message.includes('trial') || message.includes('subscription')) {
    return 'Your trial has expired. Contact Vernex to activate your license.';
  }
  if (message.includes('permission') || message.includes('forbidden') || message.includes('unauthorized')) {
    return 'You do not have permission to perform this action.';
  }
  if (message.includes('stock') || message.includes('available units')) {
    return 'Stock is not enough for this item.';
  }
  if (message.includes('offline') || message.includes('network') || message.includes('connect')) {
    return 'Unable to connect. Please check your internet connection.';
  }
  if (message.includes('required') || message.includes('invalid') || message.includes('validation')) {
    return 'Please fill in all required fields.';
  }
  if (message.includes('not found') || message.includes('no longer exists')) {
    return 'The requested item could not be found.';
  }
  if (message.includes('amount received')) {
    return 'The amount received must cover the grand total.';
  }
  return fallback;
}
