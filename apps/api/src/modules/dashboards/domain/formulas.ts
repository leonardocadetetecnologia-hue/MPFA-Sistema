export const DASHBOARD_FORMULAS = {
  publications_received:
    'Contagem de ocorrências de publicação criadas no período, na organização.',
  pending_links: 'Ocorrências cujo vínculo está PENDING.',
  open_tasks: 'Tarefas com status OPEN ou IN_PROGRESS do usuário (individual) ou da organização.',
  hours_worked: 'Soma de worked_minutes dos lançamentos não cancelados no período.',
  hours_approved: 'Soma de worked_minutes com status APPROVED no período.',
  overdue_tasks: 'Tarefas abertas com due_on anterior a hoje.',
  ingestion_failures: 'Lotes com status FAILED.',
} as const;
