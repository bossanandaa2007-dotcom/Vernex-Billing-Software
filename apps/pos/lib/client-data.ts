'use client';

let authContextRequest: Promise<any> | null = null;
let subscriptionRequest: Promise<any> | null = null;

function getJson(url: string) {
  return fetch(url).then(async (response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
  });
}

export function getAuthContext() {
  authContextRequest ??= getJson('/api/auth/context').catch((error) => {
    authContextRequest = null;
    throw error;
  });
  return authContextRequest;
}

export function resetAuthContextCache() {
  authContextRequest = null;
}

export function getSubscription() {
  subscriptionRequest ??= getJson('/api/subscription').catch((error) => {
    subscriptionRequest = null;
    throw error;
  });
  return subscriptionRequest;
}
