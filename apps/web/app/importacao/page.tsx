'use client';

import { useState, type FormEvent } from 'react';

interface ImportResult {
  batch_id?: string;
  status?: string;
  occurrence_count?: number;
  distinct_cases?: number;
  revision_count?: number;
  issues?: string[];
  error?: { message?: string };
}

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export default function ImportPage() {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = (event.currentTarget.elements.namedItem('file') as HTMLInputElement).files?.[0];
    if (!file) return;
    setPending(true);
    const contentBase64 = await fileToBase64(file);
    const response = await fetch('/api/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        content_base64: contentBase64,
      }),
    });
    setResult((await response.json()) as ImportResult);
    setPending(false);
  }

  return (
    <main className="shell">
      <header>
        <p className="eyebrow">MPFA-S</p>
        <h1>Importar publicação</h1>
        <p className="muted">
          Arquivo .msg, .eml ou .pdf. O processamento é o mesmo da futura caixa de e-mail.
        </p>
      </header>
      <form className="card form" onSubmit={onSubmit}>
        <label htmlFor="file">Arquivo</label>
        <input id="file" name="file" type="file" accept=".msg,.eml,.pdf" required />
        <button className="button" type="submit" disabled={pending}>
          {pending ? 'Importando…' : 'Importar'}
        </button>
      </form>
      {result ? (
        <section className="card" aria-live="polite">
          <h2>Resultado</h2>
          <p>
            {result.error?.message ??
              `Lote ${result.batch_id ?? ''} · ${result.status ?? ''} · ${result.occurrence_count ?? 0} publicações · ${result.distinct_cases ?? 0} processos · ${result.revision_count ?? 0} revisões`}
          </p>
        </section>
      ) : null}
    </main>
  );
}
