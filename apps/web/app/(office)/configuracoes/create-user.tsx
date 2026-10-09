'use client';

import { useState, type FormEvent } from 'react';
import { ApiError, apiCall } from '../../../lib/browser-api';

export function CreateUserForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState('LAWYER');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    setMessage(null);
    try {
      await apiCall('auth/users', {
        method: 'POST',
        body: JSON.stringify({
          name: String(data.get('name') ?? ''),
          email: String(data.get('email') ?? ''),
          password: String(data.get('password') ?? ''),
          role,
          client_id: role === 'CLIENT' ? String(data.get('client_id') ?? '') : null,
        }),
      });
      event.currentTarget.reset();
      setMessage('Usuário criado.');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Falha ao criar o usuário.');
    }
  }

  return (
    <form className="card form" onSubmit={onSubmit}>
      <h2>Novo usuário</h2>
      <label htmlFor="user-name">
        Nome
        <input id="user-name" name="name" required />
      </label>
      <label htmlFor="user-email">
        E-mail
        <input id="user-email" name="email" type="email" required />
      </label>
      <label htmlFor="user-password">
        Senha inicial
        <input id="user-password" name="password" type="password" minLength={10} required />
      </label>
      <label htmlFor="user-role">
        Perfil
        <select id="user-role" value={role} onChange={(event) => setRole(event.target.value)}>
          <option value="LAWYER">Advogado</option>
          <option value="MANAGER">Gestão</option>
          <option value="ADMINISTRATIVE">Administrativo</option>
          <option value="CLIENT">Cliente</option>
        </select>
      </label>
      {role === 'CLIENT' ? (
        <label htmlFor="user-client">
          Identificador do cliente
          <input id="user-client" name="client_id" required />
        </label>
      ) : null}
      {error ? (
        <p className="banner error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="banner ok">{message}</p> : null}
      <button className="primary" type="submit">
        Criar usuário
      </button>
    </form>
  );
}
