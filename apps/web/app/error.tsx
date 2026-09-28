'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="shell">
      <section className="card" role="alert">
        <h2>Não foi possível carregar a página</h2>
        <p className="muted">Ocorreu um erro inesperado. Tente novamente em instantes.</p>
        <button type="button" className="button" onClick={reset}>
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
