import React from 'react';
import { LoginForm } from '@/components/LoginForm';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect('/');
  }

  return <LoginForm />;
}
