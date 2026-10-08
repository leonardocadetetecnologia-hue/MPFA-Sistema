import type { DependencyCheck } from '@mpfa/contracts';
import { fetchApiStatus, type ApiStatus } from '../lib/api-status';

export const dynamic = 'force-dynamic';

const SUMMARY: Record<ApiStatus['kind'], { label: string; tone: string; text: string }> = {
  ready: {
    label: 'Operacional',
    tone: 'ok',
    text: 'API, banco de dados e Redis respondendo.',
  },
  degraded: {
    label: 'Degradado',
    tone: 'warn',
    text: 'A API respondeu, mas uma dependência crítica está indisponível.',
  },
  unreachable: {
    label: 'Indisponível',
    tone: 'error',
    text: 'Não foi possível contatar a API. Verifique se o serviço está em execução.',
  },
};

const DEPENDENCY_LABELS = { database: 'PostgreSQL', redis: 'Redis' } as const;

function DependencyRow({ name, check }: { name: string; check: DependencyCheck }) {
  const up = check.status === 'up';
  return (
    <li className="dependency">
      <span>{name}</span>
      <span className={`pill ${up ? 'ok' : 'error'}`}>
        {up ? 'Disponível' : 'Indisponível'}
        <span className="latency">· {check.latency_ms} ms</span>
      </span>
    </li>
  );
}

export default async function HomePage() {
  const { environment, status } = await fetchApiStatus();
  const summary = SUMMARY[status.kind];
  const checks = status.kind === 'unreachable' ? undefined : status.health.checks;

  return (
    <main className="shell">
      <header>
        <p className="eyebrow">Fundação técnica</p>
        <h1>Plataforma MPFA</h1>
        <p className="muted">
          Ambiente <strong>{environment}</strong>
        </p>
        <p>
          <a href="/login">Entrar</a>
          {' · '}
          <a href="/importacao">Importar publicação</a>
        </p>
      </header>

      <section className="card" aria-labelledby="status-title">
        <div className="card-head">
          <h2 id="status-title">Status da plataforma</h2>
          <span className={`pill ${summary.tone}`} role="status">
            {summary.label}
          </span>
        </div>
        <p className="muted">{summary.text}</p>

        {checks && (
          <ul className="dependencies" aria-label="Dependências críticas">
            {(Object.keys(DEPENDENCY_LABELS) as (keyof typeof DEPENDENCY_LABELS)[]).map((key) => (
              <DependencyRow key={key} name={DEPENDENCY_LABELS[key]} check={checks[key]} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
