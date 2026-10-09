import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Shell } from '../../components/shell';
import { requireUser } from '../../lib/server-api';

export const dynamic = 'force-dynamic';

export default async function OfficeLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  if (user.role === 'CLIENT') redirect('/portal');
  return (
    <Shell user={user} mode="office">
      {children}
    </Shell>
  );
}
