import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Shell } from '../../components/shell';
import { requireUser } from '../../lib/server-api';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  if (user.role !== 'CLIENT') redirect('/painel');
  return (
    <Shell user={user} mode="portal">
      {children}
    </Shell>
  );
}
