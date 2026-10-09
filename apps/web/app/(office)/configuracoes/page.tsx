import { fetchApiStatus } from '../../../lib/api-status';
import { ApiError, apiGet, requireUser } from '../../../lib/server-api';
import { can, ROLE_LABEL } from '../../../lib/session-user';
import { CreateUserForm } from './create-user';

export default async function ConfiguracoesPage() {
  const user = await requireUser();
  const status = await fetchApiStatus();
  let microsoft: { status: string; externally_validated: boolean; reason: string } | null = null;
  if (can(user, 'integration.read')) {
    try {
      microsoft = await apiGet('/api/v1/integrations/microsoft365');
    } catch (error) {
      microsoft = {
        status: 'disconnected',
        externally_validated: false,
        reason: error instanceof ApiError ? error.message : 'consulta indisponível',
      };
    }
  }

  const health =
    status.status.kind === 'ready'
      ? 'API, banco e Redis disponíveis.'
      : status.status.kind === 'degraded'
        ? 'A API respondeu com dependência indisponível.'
        : 'A API não respondeu.';

  return (
    <>
      <header>
        <h1>Configurações</h1>
        <p className="muted">
          Conta atual e integrações que ainda não foram validadas fora da plataforma.
        </p>
      </header>
      <section className="card">
        <h2>Conta</h2>
        <p>
          {user.email} · {ROLE_LABEL[user.role]}
        </p>
        <p className="muted">
          Ambiente {status.environment}. {health}
        </p>
      </section>
      <section className="card">
        <h2>Microsoft 365</h2>
        <p className="banner">
          Demonstração. A caixa Publicações não é lida automaticamente e nenhum e-mail é enviado.
          {microsoft
            ? ` Situação: ${microsoft.status}. Validação externa: ${microsoft.externally_validated ? 'sim' : 'não'}. ${microsoft.reason}.`
            : ''}
        </p>
      </section>
      {can(user, 'user.manage') ? <CreateUserForm /> : null}
    </>
  );
}
