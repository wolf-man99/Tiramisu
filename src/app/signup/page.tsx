import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getProfileId } from '@/lib/auth/server';
import { AuthForm } from '@/components/auth/AuthForm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Create your account — GrowthSQL Academy' };

export default async function SignupPage() {
  if (await getProfileId()) redirect('/dashboard');
  return (
    <div className="grid min-h-screen place-items-center px-5 py-12">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}
