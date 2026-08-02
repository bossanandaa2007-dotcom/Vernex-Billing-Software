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
  const rawMessage = extractMessage(value);
  const message = rawMessage.toLowerCase();

  // Never expose backend implementation details (database errors, stack traces,
  // provider responses, URLs, or source locations) in the browser. The original
  // error remains available to server/client logging, while the user receives a
  // short, actionable message.
  const looksTechnical = [
    'sql', 'postgres', 'supabase', 'prisma', 'constraint', 'duplicate key',
    'foreign key', 'column ', 'relation ', 'schema', 'syntax error', 'stack',
    'trace', 'node_modules', ' at ', 'localhost', 'http://', 'https://',
    'status code', 'fetch failed', 'econn', 'enotfound', 'timeout',
  ].some((fragment) => message.includes(fragment));

  if (!rawMessage || looksTechnical) return fallback;

  if (message.includes('trial') || message.includes('subscription')) {
    return 'Your plan has ended. Open Subscription to renew and continue using Vernex.';
  }
  if (message.includes('permission') || message.includes('forbidden') || message.includes('unauthorized')) {
    return 'You do not have permission to perform this action.';
  }
  if (message.includes('only ') && message.includes('units are available')) {
    const availableUnits = rawMessage.match(/only\s+(\d+)\s+units?\s+(?:are|is)\s+available/i)?.[1];
    return availableUnits
      ? `Only ${availableUnits} unit${availableUnits === '1' ? '' : 's'} are available.`
      : 'Stock is not enough for this item.';
  }
  if (message.includes('stock') || message.includes('available units') || message.includes('units are available')) {
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
