'use client';

let appContextRequest: Promise<any> | null = null;
let shopDataRequest: Promise<any> | null = null;

function getJson(url: string) {
  return fetch(url).then(async (response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
  });
}

export function getAuthContext() {
  return getAppContext().then((context) => ({ user: context.user }));
}

export function resetAuthContextCache() {
  appContextRequest = null;
  shopDataRequest = null;
}

export function getSubscription() {
  return getAppContext().then((context) => ({ subscription: context.subscription }));
}

export function getShopData(options?: { fresh?: boolean }) {
  if (options?.fresh) {
    shopDataRequest = getJson('/api/shopdata').catch((error) => {
      shopDataRequest = null;
      throw error;
    });
    return shopDataRequest;
  }
  return getAppContext().then((context) => ({ data: context.shop }));
}

export function getAppContext() {
  appContextRequest ??= getJson('/api/app-context').catch((error) => {
    appContextRequest = null;
    throw error;
  });
  return appContextRequest;
}
