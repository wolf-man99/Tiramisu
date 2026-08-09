import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getProfileId } from '@/lib/auth/server';
import { AuthForm } from '@/components/auth/AuthForm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in — GrowthSQL Academy' };

export default async function LoginPage() {
  if (await getProfileId()) redirect('/dashboard');
  return (
    <div className="grid min-h-screen place-items-center px-5 py-12">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
