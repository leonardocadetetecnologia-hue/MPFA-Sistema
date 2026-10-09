'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { can, ROLE_LABEL, type Permission, type SessionUser } from '../lib/session-user';

const OFFICE_LINKS: { href: string; label: string; allow: Permission[] }[] = [
  {
    href: '/painel',
    label: 'Painel',
    allow: ['dashboard.individual', 'dashboard.administrative', 'dashboard.managerial'],
  },
  { href: '/publicacoes', label: 'Publicações', allow: ['publication.read'] },
  { href: '/processos', label: 'Processos', allow: ['publication.read'] },
  { href: '/tarefas', label: 'Tarefas', allow: ['task.manage'] },
  { href: '/horas', label: 'Horas', allow: ['time.entry'] },
  { href: '/clientes', label: 'Clientes', allow: ['publication.read'] },
  { href: '/agenda', label: 'Agenda', allow: ['task.manage'] },
  {
    href: '/relatorios',
    label: 'Relatórios',
    allow: ['dashboard.administrative', 'dashboard.managerial', 'dashboard.individual'],
  },
  { href: '/configuracoes', label: 'Configurações', allow: ['publication.read'] },
];

export function Shell({
  user,
  mode,
  children,
}: {
  user: SessionUser;
  mode: 'office' | 'portal';
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'piano'>('light');
  const links =
    mode === 'portal'
      ? [{ href: '/portal', label: 'Publicações', allow: ['portal.read'] as Permission[] }]
      : OFFICE_LINKS;

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'piano' ? 'piano' : 'light');
  }, []);

  function chooseTheme(next: 'light' | 'piano') {
    document.documentElement.dataset.theme = next;
    localStorage.setItem('mpfa-theme', next);
    setTheme(next);
  }

  async function logout() {
    await fetch('/api/session', { method: 'DELETE' });
    window.location.href = '/login';
  }

  return (
    <div className="app">
      <a className="skip" href="#conteudo">
        Ir para o conteúdo
      </a>
      <aside className={open ? 'sidebar open' : 'sidebar'} id="navegacao">
        <div className="brand-plate">
          <img className="logo-light" src="/brand/logo.png" alt="MPFA" />
          <img className="logo-piano" src="/brand/logo-negative.png" alt="" />
        </div>
        <nav className="nav" aria-label="Módulos">
          {links
            .filter((link) => link.allow.some((permission) => can(user, permission)))
            .map((link) => {
              const current = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={current ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="navegacao"
            onClick={() => setOpen((value) => !value)}
          >
            Menu
          </button>
          <p className="who">
            {user.email} · {ROLE_LABEL[user.role]}
          </p>
          <div className="topbar-actions">
            <div className="theme-switch" role="group" aria-label="Tema">
              <button
                type="button"
                aria-pressed={theme === 'light'}
                onClick={() => chooseTheme('light')}
              >
                Claro
              </button>
              <button
                type="button"
                aria-pressed={theme === 'piano'}
                onClick={() => chooseTheme('piano')}
              >
                Black Piano
              </button>
            </div>
            <button type="button" onClick={logout}>
              Sair
            </button>
          </div>
        </header>
        <main className="content" id="conteudo">
          {children}
        </main>
      </div>
    </div>
  );
}
