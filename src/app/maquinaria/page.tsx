import React from 'react';
import { redirect } from 'next/navigation';
import { getMachineryList } from '@/lib/actions/machinery';
import { MachineryView } from '@/components/MachineryView';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function MachineryPage() {
  const currentUser = await getCurrentUser();

  if (currentUser?.role === 'BODEGUERO') {
    redirect('/bodega');
  }

  const machinery = await getMachineryList();
  return <MachineryView machinery={machinery} isAdmin={currentUser?.role === 'ADMIN'} />;
}

