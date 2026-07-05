import { LoginForm } from '@/components/auth/LoginForm';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Login' };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-vernex-surface px-4 dark:bg-vernex-dark">
      <LoginForm />
    </main>
  );
}

