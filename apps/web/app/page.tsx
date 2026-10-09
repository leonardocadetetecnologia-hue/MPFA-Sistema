import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const jar = await cookies();
  if (!jar.get('mpfa_session')) redirect('/login');
  redirect('/painel');
}
