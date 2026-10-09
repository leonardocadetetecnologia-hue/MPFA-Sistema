'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, apiCall } from '../../../lib/browser-api';
import { can, type SessionUser } from '../../../lib/session-user';

interface ClientRow {
  id: string;
  name: string;
  externalId: string | null;
}

export default function ClientesPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [items, setItems] = useState<ClientRow[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(q = query) {
    const [me, body] = await Promise.all([
      apiCall<{ user: SessionUser }>('auth/me'),
      apiCall<{ items: ClientRow[] }>(`clients?q=${encodeURIComponent(q)}`),
    ]);
    setUser(me.user);
    setItems(body.items);
  }

  useEffect(() => {
    void load('').catch((cause: unknown) =>
      setError(cause instanceof ApiError ? cause.message : 'Falha ao listar clientes.'),
    );
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await apiCall('clients', {
        method: 'POST',
        body: JSON.stringify({
          name: String(data.get('name') ?? ''),
          external_id: String(data.get('external_id') ?? '') || null,
        }),
      });
      event.currentTarget.reset();
      setNotice('Cliente cadastrado.');
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Falha ao cadastrar o cliente.');
    }
  }

  return (
    <>
      <header>
        <h1>Clientes</h1>
        <p className="muted">O nome citado numa publicação não vira cliente sozinho.</p>
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
          void load().catch((cause: unknown) =>
            setError(cause instanceof ApiError ? cause.message : 'Falha na busca.'),
          );
        }}
      >
        <label htmlFor="q">
          Nome
          <input id="q" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <button type="submit">Buscar</button>
      </form>
      {items.length === 0 ? <p className="banner">Nenhum cliente cadastrado.</p> : null}
      <div className="table-wrap card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Referência</th>
              <th>Identificador</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td data-label="Nome">{item.name}</td>
                <td data-label="Referência">{item.externalId ?? '—'}</td>
                <td data-label="Identificador">{item.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {user && can(user, 'client.manage') ? (
        <form className="card form" onSubmit={create}>
          <h2>Novo cliente</h2>
          <label htmlFor="name">
            Nome
            <input id="name" name="name" required />
          </label>
          <label htmlFor="external_id">
            Referência externa
            <input id="external_id" name="external_id" />
          </label>
          <button className="primary" type="submit">
            Cadastrar
          </button>
        </form>
      ) : null}
    </>
  );
}
