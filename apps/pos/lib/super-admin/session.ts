// Shared by the POS login route and middleware to recognize the platform
// Super Admin and route them into the merged /super-admin section. The Super
// Admin authenticates with the same Supabase session as everyone else; identity
// is confirmed by matching the configured SUPER_ADMIN_EMAIL.
export const SUPER_ADMIN_ROUTE = '/super-admin';

export function isSuperAdminEmail(email?: string | null): boolean {
  const configured = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (!configured || !email) return false;
  return email.trim().toLowerCase() === configured;
}
