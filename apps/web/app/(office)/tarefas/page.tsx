'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, apiCall } from '../../../lib/browser-api';
import { formatDate, labels } from '../../../lib/format';

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: number;
  dueOn: string | null;
}

export default function TarefasPage() {
  const [items, setItems] = useState<TaskRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const body = await apiCall<{ list: TaskRow[] }>('tasks');
      setItems(body.list);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Falha ao listar tarefas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const due = String(data.get('due_on') ?? '');
    try {
      await apiCall('tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: String(data.get('title') ?? ''),
          due_on: due || null,
          priority: Number(data.get('priority') ?? 0) || undefined,
        }),
      });
      form.reset();
      setNotice('Tarefa criada.');
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Falha ao criar a tarefa.');
    }
  }

  return (
    <>
      <header>
        <h1>Tarefas</h1>
        <p className="muted">
          Um prazo só existe quando a data é informada. O título não inventa vencimento.
        </p>
      </header>
      {error ? (
        <p className="banner error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? <p className="banner ok">{notice}</p> : null}
      {loading ? <p className="muted">Carregando tarefas…</p> : null}
      {!loading && items.length === 0 ? <p className="banner">Nenhuma tarefa aberta.</p> : null}
      <div className="table-wrap card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Situação</th>
              <th>Prioridade</th>
              <th>Vencimento</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td data-label="Título">{item.title}</td>
                <td data-label="Situação">{labels.task(item.status)}</td>
                <td data-label="Prioridade">{item.priority}</td>
                <td data-label="Vencimento">{formatDate(item.dueOn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="card form" onSubmit={create}>
        <h2>Nova tarefa</h2>
        <label htmlFor="title">
          Título
          <input id="title" name="title" required />
        </label>
        <label htmlFor="due_on">
          Vencimento
          <input id="due_on" name="due_on" type="date" />
        </label>
        <label htmlFor="priority">
          Prioridade
          <input id="priority" name="priority" type="number" min={0} />
        </label>
        <button className="primary" type="submit">
          Criar
        </button>
      </form>
    </>
  );
}
