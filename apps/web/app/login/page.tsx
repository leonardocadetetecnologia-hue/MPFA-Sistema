'use client';

import { useState, type FormEvent } from 'react';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [recovery, setRecovery] = useState<string | null>(null);
  const [token, setToken] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
      }),
    });
    setPending(false);
    if (!response.ok) {
      setError('Não foi possível entrar. Confira e-mail e senha.');
      return;
    }
    window.location.href = '/painel';
  }

  async function requestRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecovery(null);
    const email = String(new FormData(event.currentTarget).get('recovery_email') ?? '');
    const response = await fetch('/api/recovery', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const body = (await response.json()) as {
      delivered?: boolean;
      dev_token?: string;
      error?: { message?: string };
    };
    if (!response.ok) {
      setRecovery(body.error?.message ?? 'Não foi possível registrar a recuperação.');
      return;
    }
    if (body.dev_token) setToken(body.dev_token);
    setRecovery(
      'O envio de e-mail não está ligado. A intenção de recuperação foi registrada. Em ambiente local, o token aparece abaixo para concluir a troca.',
    );
  }

  async function confirmRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/recovery/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: String(form.get('token') ?? ''),
        password: String(form.get('new_password') ?? ''),
      }),
    });
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    setRecovery(
      response.ok
        ? 'Senha atualizada. Entre com a nova senha.'
        : (body?.error?.message ?? 'Falha ao confirmar.'),
    );
  }

  return (
    <main className="gate">
      <section className="gate-card">
        <div className="brand-plate">
          <img className="logo-light" src="/brand/logo.png" alt="MPFA" />
          <img className="logo-piano" src="/brand/logo-negative.png" alt="" />
        </div>
        <h1>Entrar</h1>
        <form className="form" onSubmit={onSubmit}>
          <label htmlFor="email">
            E-mail
            <input id="email" name="email" type="email" autoComplete="username" required />
          </label>
          <label htmlFor="password">
            Senha
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error ? (
            <p className="banner error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="primary" type="submit" disabled={pending}>
            {pending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <details>
          <summary>Esqueci a senha</summary>
          <form className="form" onSubmit={requestRecovery}>
            <label htmlFor="recovery_email">
              E-mail da conta
              <input id="recovery_email" name="recovery_email" type="email" required />
            </label>
            <button type="submit">Registrar recuperação</button>
          </form>
          <form className="form" onSubmit={confirmRecovery}>
            <label htmlFor="token">
              Token
              <input
                id="token"
                name="token"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                required
              />
            </label>
            <label htmlFor="new_password">
              Nova senha
              <input
                id="new_password"
                name="new_password"
                type="password"
                minLength={10}
                autoComplete="new-password"
                required
              />
            </label>
            <button type="submit">Confirmar nova senha</button>
          </form>
          {recovery ? <p className="banner">{recovery}</p> : null}
        </details>
      </section>
    </main>
  );
}
