import { ApiError, apiGet, requireUser } from '../../../lib/server-api';
import { can } from '../../../lib/session-user';
import { formatDate, labels } from '../../../lib/format';

interface TaskRow {
  id: string;
  title: string;
  status: string;
  dueOn: string | null;
}

export default async function AgendaPage() {
  const user = await requireUser();
  let tasks: { list: TaskRow[]; calendar: Record<string, TaskRow[]> } | null = null;
  let taskError: string | null = null;
  if (can(user, 'task.manage')) {
    try {
      tasks = await apiGet('/api/v1/tasks');
    } catch (error) {
      taskError = error instanceof ApiError ? error.message : 'Falha ao consultar a agenda.';
    }
  }

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

  const days = Object.entries(tasks?.calendar ?? {}).sort(([a], [b]) => a.localeCompare(b));

  return (
    <>
      <header>
        <h1>Agenda</h1>
        <p className="muted">
          A agenda mostra as tarefas com data. O calendário do Microsoft 365 não foi importado.
        </p>
      </header>
      <p className="banner">
        Demonstração desconectada.
        {microsoft
          ? ` Microsoft 365: ${microsoft.status}. Validação externa: ${microsoft.externally_validated ? 'sim' : 'não'}. Motivo: ${microsoft.reason}.`
          : ' A situação da caixa exige permissão de integração.'}
      </p>
      {taskError ? (
        <p className="banner error" role="alert">
          {taskError}
        </p>
      ) : null}
      {days.length === 0 ? <p className="banner">Nenhuma tarefa com data.</p> : null}
      {days.map(([day, items]) => (
        <section key={day} className="card">
          <h2>{day === 'sem-data' ? 'Sem data' : formatDate(day)}</h2>
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                {item.title} · {labels.task(item.status)}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
