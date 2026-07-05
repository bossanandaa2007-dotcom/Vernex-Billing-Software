import 'server-only';

export function safeOperationMessage(
  error: unknown,
  allowedFragments: string[],
  fallback: string
) {
  if (!(error instanceof Error)) return fallback;
  return allowedFragments.some((fragment) => error.message.includes(fragment))
    ? error.message
    : fallback;
}

