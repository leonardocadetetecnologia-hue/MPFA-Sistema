import { Suspense } from 'react';
import { PublicationsBoard } from './board';

export default function PublicationsPage() {
  return (
    <Suspense fallback={<p className="muted">Carregando publicações…</p>}>
      <PublicationsBoard />
    </Suspense>
  );
}
