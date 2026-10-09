import { ApiError, apiGet, requireUser } from '../../../lib/server-api';
import { can, type Permission } from '../../../lib/session-user';
import { formatMinutes } from '../../../lib/format';

const ORDER = ['managerial', 'administrative', 'individual'] as const;
type Kind = (typeof ORDER)[number];
const PERMISSION: Record<Kind, Permission> = {
  managerial: 'dashboard.managerial',
  administrative: 'dashboard.administrative',
  individual: 'dashboard.individual',
};

export default async function RelatoriosPage() {
  const user = await requireUser();
  const kind = ORDER.find((item) => can(user, PERMISSION[item]));
  if (!kind) return <p className="banner">Este perfil não consulta relatório.</p>;

  try {
    const data = await apiGet<{ formulas: Record<string, string>; values: Record<string, number> }>(
      `/api/v1/dashboards/${kind}`,
    );
    return (
      <>
        <header>
          <h1>Relatórios</h1>
          <p className="muted">
            A exportação de arquivo e o envio por e-mail ainda não têm contrato. Os números abaixo
            são a consulta atual.
          </p>
        </header>
        <section className="metrics">
          {Object.entries(data.values).map(([key, value]) => (
            <article key={key} className="card metric">
              <h2>{key}</h2>
              <strong>{key.startsWith('hours_') ? formatMinutes(value) : value}</strong>
              <p className="muted">{data.formulas[key] ?? ''}</p>
            </article>
          ))}
        </section>
      </>
    );
  } catch (error) {
    return (
      <p className="banner error" role="alert">
        {error instanceof ApiError ? error.message : 'Falha ao montar o relatório.'}
      </p>
    );
  }
}
