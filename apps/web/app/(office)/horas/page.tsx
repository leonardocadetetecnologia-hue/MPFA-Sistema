'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError, apiCall } from '../../../lib/browser-api';
import { formatClock, formatDate, formatMinutes, labels } from '../../../lib/format';
import { can, type SessionUser } from '../../../lib/session-user';

interface Entry {
  id: string;
  description: string;
  classification: string;
  workedMinutes: number;
  billableMinutes: number;
  status: string;
  entryDate: string;
  overlapWarning: boolean;
  returnReason: string | null;
}

interface TimerState {
  status: 'RUNNING' | 'PAUSED';
  elapsed_seconds: number;
  fetchedAt: number;
}

export default function HorasPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    const [me, list, current] = await Promise.all([
      apiCall<{ user: SessionUser }>('auth/me'),
      apiCall<Entry[]>('time-entries'),
      apiCall<Omit<TimerState, 'fetchedAt'> | null>('time-entries/timer'),
    ]);
    setUser(me.user);
    setEntries(list);
    setTimer(current ? { ...current, fetchedAt: Date.now() } : null);
  }

  useEffect(() => {
    void load().catch((cause: unknown) =>
      setError(cause instanceof ApiError ? cause.message : 'Falha ao carregar horas.'),
    );
  }, []);

  useEffect(() => {
    if (timer?.status !== 'RUNNING') return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timer?.status]);

  const elapsed = useMemo(() => {
    if (!timer) return 0;
    if (timer.status !== 'RUNNING') return timer.elapsed_seconds;
    return timer.elapsed_seconds + Math.floor((now - timer.fetchedAt) / 1000);
  }, [now, timer]);

  async function run(action: 'start' | 'pause' | 'resume' | 'stop') {
    setError(null);
    try {
      if (action === 'stop') {
        await apiCall('time-entries/timer/stop', { method: 'POST' });
      } else if (action === 'start') {
        await apiCall('time-entries/timer/start', {
          method: 'POST',
          body: JSON.stringify({ description: 'Atividade', classification: 'atividade' }),
        });
      } else {
        await apiCall(`time-entries/timer/${action}`, { method: 'POST' });
      }
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Falha no cronômetro.');
    }
  }

  async function manual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await apiCall('time-entries', {
        method: 'POST',
        body: JSON.stringify({
          entry_date: String(data.get('entry_date') ?? ''),
          worked_minutes: Number(data.get('worked_minutes')),
          billable_minutes: Number(data.get('billable_minutes')),
          description: String(data.get('description') ?? ''),
          classification: String(data.get('classification') ?? ''),
        }),
      });
      event.currentTarget.reset();
      setNotice('Lançamento gravado em rascunho.');
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Falha ao lançar horas.');
    }
  }

  async function transition(id: string, action: 'submit' | 'approve' | 'return', reason?: string) {
    try {
      await apiCall(`time-entries/${id}/${action}`, {
        method: 'POST',
        body: action === 'return' ? JSON.stringify({ reason }) : undefined,
      });
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Falha ao atualizar o lançamento.');
    }
  }

  async function closePeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const body = await apiCall<{ id: string }>('periods/close', {
        method: 'POST',
        body: JSON.stringify({
          starts_on: String(data.get('starts_on') ?? ''),
          ends_on: String(data.get('ends_on') ?? ''),
        }),
      });
      setNotice(`Período fechado. Identificador para reabrir: ${body.id}`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Falha ao fechar o período.');
    }
  }

  const reviewer = user ? can(user, 'time.review') : false;

  return (
    <>
      <header>
        <h1>Horas</h1>
        <p className="muted">
          Hora trabalhada e hora faturável são campos separados. A pausa não entra na contagem.
        </p>
      </header>
      {error ? (
        <p className="banner error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? <p className="banner ok">{notice}</p> : null}
      <section className="card">
        <p className="clock" aria-live="polite">
          {formatClock(elapsed)}
        </p>
        <div className="actions">
          <button type="button" onClick={() => run('start')}>
            Iniciar
          </button>
          <button type="button" onClick={() => run('pause')}>
            Pausar
          </button>
          <button type="button" onClick={() => run('resume')}>
            Retomar
          </button>
          <button type="button" onClick={() => run('stop')}>
            Encerrar
          </button>
        </div>
      </section>
      {entries.length === 0 ? <p className="banner">Nenhum lançamento.</p> : null}
      <div className="table-wrap card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Trabalhada</th>
              <th>Faturável</th>
              <th>Situação</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td data-label="Data">{formatDate(entry.entryDate)}</td>
                <td data-label="Descrição">
                  {entry.description}
                  {entry.overlapWarning ? ' · sobreposição' : ''}
                  {entry.returnReason ? ` · ${entry.returnReason}` : ''}
                </td>
                <td data-label="Trabalhada">{formatMinutes(entry.workedMinutes)}</td>
                <td data-label="Faturável">{formatMinutes(entry.billableMinutes)}</td>
                <td data-label="Situação">{labels.time(entry.status)}</td>
                <td data-label="Ação">
                  <div className="actions">
                    {entry.status === 'DRAFT' || entry.status === 'RETURNED' ? (
                      <button type="button" onClick={() => transition(entry.id, 'submit')}>
                        Enviar
                      </button>
                    ) : null}
                    {reviewer && entry.status === 'SUBMITTED' ? (
                      <>
                        <button type="button" onClick={() => transition(entry.id, 'approve')}>
                          Aprovar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const reason = window.prompt('Motivo da devolução');
                            if (reason) void transition(entry.id, 'return', reason);
                          }}
                        >
                          Devolver
                        </button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="card form" onSubmit={manual}>
        <h2>Lançamento manual</h2>
        <label htmlFor="entry_date">
          Data
          <input id="entry_date" name="entry_date" type="date" required />
        </label>
        <label htmlFor="worked_minutes">
          Minutos trabalhados
          <input id="worked_minutes" name="worked_minutes" type="number" min={1} required />
        </label>
        <label htmlFor="billable_minutes">
          Minutos faturáveis
          <input id="billable_minutes" name="billable_minutes" type="number" min={0} required />
        </label>
        <label htmlFor="description">
          Descrição
          <input id="description" name="description" required />
        </label>
        <label htmlFor="classification">
          Classificação
          <input id="classification" name="classification" required />
        </label>
        <button className="primary" type="submit">
          Gravar rascunho
        </button>
      </form>
      {reviewer ? (
        <form className="card form" onSubmit={closePeriod}>
          <h2>Fechar período</h2>
          <label htmlFor="starts_on">
            Início
            <input id="starts_on" name="starts_on" type="date" required />
          </label>
          <label htmlFor="ends_on">
            Fim
            <input id="ends_on" name="ends_on" type="date" required />
          </label>
          <button type="submit">Fechar</button>
        </form>
      ) : null}
    </>
  );
}
