'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { ApiError, apiCall, fileToBase64 } from '../../../lib/browser-api';
import { formatClock, formatDate, labels, plain, safeHttpUrl } from '../../../lib/format';
import { can, type SessionUser } from '../../../lib/session-user';

interface PublicationRow {
  id: string;
  ordinal: number | null;
  cnjFormatted: string | null;
  actType: string | null;
  publicationDate: string | null;
  availabilityDate: string | null;
  state: string;
  isRevision: boolean;
  ambiguous: boolean;
  text: string;
  link: { status: string; processId: string | null } | null;
  decision: { outcome: string; reason: string | null; assigneeId: string | null } | null;
}

interface PublicationDetail {
  id: string;
  cnj: string | null;
  act_type: string | null;
  text: string;
  publication_date: string | null;
  availability_date: string | null;
  journal: string | null;
  notebook: string | null;
  location: string | null;
  page: string | null;
  parties: { role?: string; name?: string }[];
  lawyers: { name?: string; oab?: string }[];
  state: string;
  issues: string[];
  is_revision: boolean;
  ambiguous: boolean;
  document_id: string | null;
  document_url: string | null;
  link: { status: string; processId: string | null } | null;
  decision: { outcome: string; reason: string | null } | null;
  comments: { id: string; body: string; createdAt: string }[];
  batch: { id: string; subject: string | null } | null;
}

interface ProcessOption {
  id: string;
  cnj: string | null;
  title: string;
}

interface TimerState {
  status: 'RUNNING' | 'PAUSED';
  elapsed_seconds: number;
  description: string;
  fetchedAt: number;
}

type Tab = 'publicacao' | 'tratamento' | 'horas';

export function PublicationsBoard() {
  const params = useSearchParams();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [query, setQuery] = useState('');
  const [link, setLink] = useState(params.get('link') ?? '');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<PublicationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<PublicationDetail | null>(null);
  const [tab, setTab] = useState<Tab>('publicacao');
  const [notice, setNotice] = useState<string | null>(null);
  const [processes, setProcesses] = useState<ProcessOption[]>([]);
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const search = new URLSearchParams();
    if (query.trim()) search.set('q', query.trim());
    if (link) search.set('link', link);
    search.set('page', String(page));
    try {
      const body = await apiCall<{ items: PublicationRow[]; total: number }>(
        `publications?${search.toString()}`,
      );
      setRows(body.items);
      setTotal(body.total);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Falha ao listar publicações.');
    } finally {
      setLoading(false);
    }
  }, [query, link, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void apiCall<{ user: SessionUser }>('auth/me')
      .then((body) => setUser(body.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    void apiCall<PublicationDetail>(`publications/${selected}`)
      .then(setDetail)
      .catch((cause: unknown) =>
        setError(cause instanceof ApiError ? cause.message : 'Falha ao abrir a publicação.'),
      );
  }, [selected]);

  useEffect(() => {
    if (timer?.status !== 'RUNNING') return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timer?.status]);

  const elapsed = useMemo(() => {
    if (!timer) return 0;
    if (timer.status !== 'RUNNING') return timer.elapsed_seconds;
    return timer.elapsed_seconds + Math.floor((now - timer.fetchedAt) / 1000);
  }, [timer, now]);

  async function importFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = (form.elements.namedItem('file') as HTMLInputElement).files?.[0];
    if (!file) return;
    setNotice(null);
    setError(null);
    try {
      const contentBase64 = await fileToBase64(file);
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filename: file.name, content_base64: contentBase64 }),
      });
      const body = (await response.json()) as {
        status?: string;
        occurrence_count?: number;
        distinct_cases?: number;
        revision_count?: number;
        error?: { message?: string };
      };
      if (!response.ok) {
        setError(body.error?.message ?? 'A importação não foi concluída.');
        return;
      }
      setNotice(
        `Lote ${body.status ?? 'recebido'} · ${body.occurrence_count ?? 0} publicações · ${body.distinct_cases ?? 0} processos · ${body.revision_count ?? 0} revisões.`,
      );
      form.reset();
      await load();
    } catch {
      setError('Não foi possível ler o arquivo.');
    }
  }

  async function openTreatment() {
    setTab('tratamento');
    const body = await apiCall<{ items: ProcessOption[] }>('processes?page=1');
    setProcesses(body.items);
  }

  async function confirmLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const processId = String(new FormData(event.currentTarget).get('process_id') ?? '');
    try {
      await apiCall(`publications/${selected}/link`, {
        method: 'POST',
        body: JSON.stringify({ process_id: processId }),
      });
      setNotice('Vínculo confirmado.');
      await load();
      setDetail(await apiCall<PublicationDetail>(`publications/${selected}`));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Falha ao confirmar o vínculo.');
    }
  }

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = event.currentTarget;
    const body = String(new FormData(form).get('body') ?? '');
    try {
      await apiCall(`publications/${selected}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
      form.reset();
      setDetail(await apiCall<PublicationDetail>(`publications/${selected}`));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Falha ao gravar o comentário.');
    }
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    const form = event.currentTarget;
    const title = String(new FormData(form).get('title') ?? '');
    try {
      await apiCall('tasks', {
        method: 'POST',
        body: JSON.stringify({
          title,
          occurrence_id: detail.id,
          process_id: detail.link?.processId,
        }),
      });
      form.reset();
      setNotice('Tarefa criada a partir da publicação.');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Falha ao criar a tarefa.');
    }
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const clientId = String(new FormData(event.currentTarget).get('client_id') ?? '');
    try {
      await apiCall(`publications/${selected}/publish`, {
        method: 'POST',
        body: JSON.stringify({ client_id: clientId }),
      });
      setNotice('Publicação liberada no portal do cliente indicado.');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Falha ao publicar.');
    }
  }

  async function timerAction(action: 'start' | 'pause' | 'resume' | 'stop') {
    try {
      if (action === 'stop') {
        await apiCall('time-entries/timer/stop', { method: 'POST' });
        setTimer(null);
        setNotice('Cronômetro encerrado. O lançamento ficou em rascunho.');
        return;
      }
      const body =
        action === 'start'
          ? JSON.stringify({
              description: detail?.act_type ?? 'Publicação',
              classification: 'publicacao',
            })
          : undefined;
      await apiCall(`time-entries/timer/${action}`, { method: 'POST', body });
      const current = await apiCall<Omit<TimerState, 'fetchedAt'> | null>('time-entries/timer');
      setTimer(current ? { ...current, fetchedAt: Date.now() } : null);
      setNow(Date.now());
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Falha no cronômetro.');
    }
  }

  const documentUrl = safeHttpUrl(detail?.document_url);
  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <>
      <header>
        <h1>Publicações</h1>
        <p className="muted">
          A leitura automática da caixa ainda não está ligada. A entrada é o arquivo do e-mail.
        </p>
      </header>

      {user && can(user, 'ingestion.import') ? (
        <form className="card form" onSubmit={importFile}>
          <label htmlFor="arquivo">
            Arquivo .msg, .eml ou .pdf
            <input id="arquivo" name="file" type="file" accept=".msg,.eml,.pdf" required />
          </label>
          <button className="primary" type="submit">
            Importar
          </button>
        </form>
      ) : null}

      {notice ? <p className="banner ok">{notice}</p> : null}
      {error ? (
        <p className="banner error" role="alert">
          {error}
        </p>
      ) : null}

      <form
        className="filters"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          void load();
        }}
      >
        <label htmlFor="busca">
          Busca
          <input id="busca" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label htmlFor="vinculo">
          Vínculo
          <select
            id="vinculo"
            value={link}
            onChange={(event) => {
              setLink(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            <option value="PENDING">Pendente</option>
            <option value="CONFIRMED">Confirmado</option>
            <option value="REJECTED">Recusado</option>
          </select>
        </label>
        <button type="submit">Filtrar</button>
      </form>

      {loading ? <p className="muted">Carregando publicações…</p> : null}
      {!loading && rows.length === 0 ? (
        <p className="banner">Nenhuma publicação neste filtro.</p>
      ) : null}

      <div className="split">
        <div className="table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Processo</th>
                <th>Ato</th>
                <th>Publicação</th>
                <th>Situação</th>
                <th>Vínculo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} aria-selected={selected === row.id}>
                  <td data-label="Processo">
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(row.id);
                        setTab('publicacao');
                      }}
                    >
                      {row.cnjFormatted ?? 'Abrir'}
                    </button>
                  </td>
                  <td data-label="Ato">
                    {row.actType ?? '—'}
                    {row.isRevision ? ' · revisão' : ''}
                    {row.ambiguous ? ' · conferir responsável' : ''}
                    <div className="excerpt">{plain(row.text)}</div>
                  </td>
                  <td data-label="Publicação">{formatDate(row.publicationDate)}</td>
                  <td data-label="Situação">{labels.state(row.state)}</td>
                  <td data-label="Vínculo">{labels.link(row.link?.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pager">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Anterior
            </button>
            <span>
              Página {page} de {pages}
            </span>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage((value) => value + 1)}
            >
              Próxima
            </button>
          </div>
        </div>

        <aside className="card" aria-label="Detalhe da publicação">
          {!detail ? <p className="muted">Selecione uma publicação.</p> : null}
          {detail ? (
            <>
              <h2>{detail.cnj ?? 'Sem número'}</h2>
              <div className="tabs" role="tablist">
                {(
                  [
                    ['publicacao', 'Publicação'],
                    ['tratamento', 'Tratamento'],
                    ['horas', 'Horas'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => {
                      setTab(id);
                      if (id === 'tratamento') void openTreatment();
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {tab === 'publicacao' ? (
                <div>
                  <p className="muted">
                    {detail.journal ?? 'Diário não informado'} · disponibilização{' '}
                    {formatDate(detail.availability_date)} · publicação{' '}
                    {formatDate(detail.publication_date)}
                  </p>
                  <p className="publication-text">{plain(detail.text) || 'Sem texto extraído.'}</p>
                  <ul>
                    {(Array.isArray(detail.parties) ? detail.parties : []).map((party, index) => (
                      <li key={`${party.name ?? 'parte'}-${index}`}>
                        {party.role ?? 'Parte'}: {party.name ?? '—'}
                      </li>
                    ))}
                    {(Array.isArray(detail.lawyers) ? detail.lawyers : []).map((lawyer, index) => (
                      <li key={`${lawyer.oab ?? 'oab'}-${index}`}>
                        {lawyer.name ?? 'Advogado'} · {lawyer.oab ?? 'OAB não informada'}
                      </li>
                    ))}
                  </ul>
                  {documentUrl ? (
                    <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                      Documento {detail.document_id ?? ''}
                    </a>
                  ) : null}
                  {detail.issues.length > 0 ? (
                    <p className="banner">{detail.issues.join(', ')}</p>
                  ) : null}
                </div>
              ) : null}
              {tab === 'tratamento' ? (
                <div className="form">
                  <p>
                    Vínculo: {labels.link(detail.link?.status)}. Encaminhamento:{' '}
                    {detail.decision?.outcome ?? '—'}.
                  </p>
                  <form className="form" onSubmit={confirmLink}>
                    <label htmlFor="process_id">
                      Processo
                      <select id="process_id" name="process_id" required>
                        <option value="">Selecione</option>
                        {processes.map((process) => (
                          <option key={process.id} value={process.id}>
                            {process.cnj ?? process.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="submit">Confirmar vínculo</button>
                  </form>
                  <form className="form" onSubmit={addComment}>
                    <label htmlFor="comentario">
                      Comentário interno
                      <textarea id="comentario" name="body" required />
                    </label>
                    <button type="submit">Gravar comentário</button>
                  </form>
                  <ul>
                    {detail.comments.map((comment) => (
                      <li key={comment.id}>{plain(comment.body)}</li>
                    ))}
                  </ul>
                  <form className="form" onSubmit={addTask}>
                    <label htmlFor="tarefa">
                      Providência
                      <input id="tarefa" name="title" required />
                    </label>
                    <button type="submit">Criar tarefa</button>
                  </form>
                  {user && can(user, 'publication.publish') ? (
                    <form className="form" onSubmit={publish}>
                      <label htmlFor="client_id">
                        Publicar no portal (identificador do cliente)
                        <input id="client_id" name="client_id" required />
                      </label>
                      <button type="submit">Publicar</button>
                    </form>
                  ) : null}
                </div>
              ) : null}
              {tab === 'horas' ? (
                <div>
                  <p className="clock" aria-live="polite">
                    {formatClock(elapsed)}
                  </p>
                  <div className="actions">
                    <button type="button" onClick={() => timerAction('start')}>
                      Iniciar
                    </button>
                    <button type="button" onClick={() => timerAction('pause')}>
                      Pausar
                    </button>
                    <button type="button" onClick={() => timerAction('resume')}>
                      Retomar
                    </button>
                    <button type="button" onClick={() => timerAction('stop')}>
                      Encerrar
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </aside>
      </div>
    </>
  );
}
