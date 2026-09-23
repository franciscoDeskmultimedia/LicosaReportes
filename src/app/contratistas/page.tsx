import React from 'react';
import { redirect } from 'next/navigation';
import { getProjects } from '@/lib/actions/projects';
import { getContractors } from '@/lib/actions/contractors';
import { ContractorsView } from '@/components/ContractorsView';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ContratistasPage() {
  const currentUser = await requireAuth();

  if (currentUser.role === 'BODEGUERO') {
    redirect('/bodega');
  }

  const [projects, contractors] = await Promise.all([
    getProjects(),
    getContractors(),
  ]);

  const projectOptions = projects.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
  }));

  return (
    <ContractorsView
      contractors={contractors as any}
      projects={projectOptions}
    />
  );
}
