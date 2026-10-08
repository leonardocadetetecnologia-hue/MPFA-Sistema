'use client';

import { useState, type FormEvent } from 'react';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
    window.location.href = '/importacao';
  }

  return (
    <main className="shell">
      <header>
        <p className="eyebrow">MPFA-S</p>
        <h1>Entrar</h1>
      </header>
      <form className="card form" onSubmit={onSubmit}>
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {error ? (
          <p className="pill error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="button" type="submit" disabled={pending}>
          {pending ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
