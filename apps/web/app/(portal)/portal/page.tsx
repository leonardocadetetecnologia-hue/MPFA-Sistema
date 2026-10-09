import { ApiError, apiGet } from '../../../lib/server-api';
import { formatDate, plain } from '../../../lib/format';

interface PortalItem {
  id: string;
  cnj: string | null;
  act_type: string | null;
  publication_date: string | null;
  text: string;
}

export default async function PortalPage() {
  try {
    const items = await apiGet<PortalItem[]>('/api/v1/portal/publications');
    return (
      <>
        <header>
          <h1>Publicações</h1>
          <p className="muted">Somente o que foi publicado para o seu cliente.</p>
        </header>
        {items.length === 0 ? <p className="banner">Nenhuma publicação liberada.</p> : null}
        {items.map((item) => (
          <article key={item.id} className="card">
            <h2>{item.cnj ?? 'Processo'}</h2>
            <p className="muted">
              {item.act_type ?? 'Ato'} · {formatDate(item.publication_date)}
            </p>
            <p className="publication-text">{plain(item.text)}</p>
          </article>
        ))}
      </>
    );
  } catch (error) {
    return (
      <p className="banner error" role="alert">
        {error instanceof ApiError ? error.message : 'Não foi possível abrir o portal.'}
      </p>
    );
  }
}
