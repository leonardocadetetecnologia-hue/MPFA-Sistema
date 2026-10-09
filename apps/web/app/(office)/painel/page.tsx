import Link from 'next/link';
import { formatMinutes } from '../../../lib/format';
import { ApiError, apiGet, requireUser } from '../../../lib/server-api';
import { can, type Permission, type SessionUser } from '../../../lib/session-user';

const KINDS = ['individual', 'administrative', 'managerial'] as const;
type Kind = (typeof KINDS)[number];

const KIND_PERMISSION: Record<Kind, Permission> = {
  individual: 'dashboard.individual',
  administrative: 'dashboard.administrative',
  managerial: 'dashboard.managerial',
};

const KIND_LABEL: Record<Kind, string> = {
  individual: 'Individual',
  administrative: 'Administrativo',
  managerial: 'Gestão',
};

const RECORD_HREF: Record<string, string> = {
  publications_received: '/publicacoes',
  pending_links: '/publicacoes?link=PENDING',
  open_tasks: '/tarefas',
  hours: '/horas',
};

const VALUE_LABEL: Record<string, string> = {
  publications_received: 'Publicações recebidas',
  pending_links: 'Vínculos pendentes',
  open_tasks: 'Tarefas abertas',
  overdue_tasks: 'Tarefas atrasadas',
  ingestion_failures: 'Lotes com falha',
  hours_worked: 'Horas trabalhadas',
  hours_billable: 'Horas faturáveis',
  hours_approved: 'Horas aprovadas',
};

function allowedKinds(user: SessionUser): Kind[] {
  return KINDS.filter((kind) => can(user, KIND_PERMISSION[kind]));
}

function preferredKind(user: SessionUser): Kind | undefined {
  return ([...KINDS].reverse() as Kind[]).find((kind) => can(user, KIND_PERMISSION[kind]));
}

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const user = await requireUser();
  const kinds = allowedKinds(user);
  const requested = (await searchParams).kind;
  const kind = kinds.find((item) => item === requested) ?? preferredKind(user);
  if (!kind) {
    return <p className="banner">Este perfil não consulta painel.</p>;
  }

  let data: {
    formulas: Record<string, string>;
    values: Record<string, number>;
  };
  try {
    data = await apiGet(`/api/v1/dashboards/${kind}`);
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : 'Não foi possível carregar o painel.';
    return (
      <p className="banner error" role="alert">
        {message}
      </p>
    );
  }

  return (
    <>
      <header>
        <h1>Painel</h1>
        <p className="muted">
          Os números saem dos registros da organização. Cada cartão traz a fórmula usada.
        </p>
      </header>
      <nav className="actions" aria-label="Tipo de painel">
        {kinds.map((item) => (
          <Link
            key={item}
            href={item === kinds[0] ? '/painel' : `/painel?kind=${item}`}
            aria-current={item === kind ? 'page' : undefined}
          >
            {KIND_LABEL[item]}
          </Link>
        ))}
      </nav>
      <section className="metrics">
        {Object.entries(data.values).map(([key, value]) => (
          <article key={key} className="card metric">
            <h2>{VALUE_LABEL[key] ?? key}</h2>
            <strong>{key.startsWith('hours_') ? formatMinutes(value) : value}</strong>
            <p className="muted">{data.formulas[key] ?? ''}</p>
            {RECORD_HREF[key] ? <Link href={RECORD_HREF[key]}>Abrir registros</Link> : null}
          </article>
        ))}
      </section>
    </>
  );
}
