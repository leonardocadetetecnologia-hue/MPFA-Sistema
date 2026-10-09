'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, apiCall } from '../../../lib/browser-api';

interface ProcessRow {
  id: string;
  cnj: string | null;
  title: string;
  status: string;
  suggested: boolean;
  clientId: string | null;
}

export default function ProcessosPage() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ProcessRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(q = query) {
    setLoading(true);
    setError(null);
    try {
      const body = await apiCall<{ items: ProcessRow[] }>(`processes?q=${encodeURIComponent(q)}`);
      setItems(body.items);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Falha ao consultar processos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load('');
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await apiCall('processes', {
        method: 'POST',
        body: JSON.stringify({
          title: String(data.get('title') ?? ''),
          cnj: String(data.get('cnj') ?? '') || null,
          kind: String(data.get('kind') ?? ''),
          client_id: String(data.get('client_id') ?? '') || null,
        }),
      });
      form.reset();
      setNotice('Processo cadastrado.');
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Falha ao cadastrar.');
    }
  }

  return (
    <>
      <header>
        <h1>Processos</h1>
        <p className="muted">
          Um processo sugerido pela importação ainda não tem cliente confirmado.
        </p>
      </header>
      {error ? (
        <p className="banner error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? <p className="banner ok">{notice}</p> : null}
      <form
        className="filters"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <label htmlFor="q">
          Número ou título
          <input id="q" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <button type="submit">Buscar</button>
      </form>
      {loading ? <p className="muted">Carregando processos…</p> : null}
      {!loading && items.length === 0 ? (
        <p className="banner">Nenhum processo encontrado.</p>
      ) : null}
      <div className="table-wrap card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Título</th>
              <th>Situação</th>
              <th>Origem</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td data-label="Número">{item.cnj ?? '—'}</td>
                <td data-label="Título">{item.title}</td>
                <td data-label="Situação">{item.status}</td>
                <td data-label="Origem">{item.suggested ? 'Sugerido' : 'Cadastrado'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="card form" onSubmit={create}>
        <h2>Novo processo</h2>
        <label htmlFor="title">
          Título
          <input id="title" name="title" required />
        </label>
        <label htmlFor="cnj">
          Número CNJ
          <input id="cnj" name="cnj" />
        </label>
        <label htmlFor="kind">
          Tipo
          <input id="kind" name="kind" required />
        </label>
        <label htmlFor="client_id">
          Cliente, se já confirmado
          <input id="client_id" name="client_id" />
        </label>
        <button className="primary" type="submit">
          Cadastrar
        </button>
      </form>
    </>
  );
}
