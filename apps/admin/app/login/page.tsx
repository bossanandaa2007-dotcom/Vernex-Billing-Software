import { redirect } from 'next/navigation';
import { getSuperAdmin } from '@/lib/auth.server';
import { LoginForm } from '@/components/auth/login-form';

export default async function LoginPage() {
  if (await getSuperAdmin()) redirect('/');
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,_rgba(202,151,43,0.12),_transparent_35%),linear-gradient(135deg,#f7f9fc_0%,#eef3f8_100%)] p-5 dark:bg-[linear-gradient(135deg,#07142b_0%,#0c1d39_100%)]">
      <LoginForm />
    </main>
  );
}

