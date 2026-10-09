import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Plataforma MPFA',
  description: 'Operação de publicações, processos, tarefas e horas.',
  robots: { index: false, follow: false },
};

const themeScript = `(function(){try{var t=localStorage.getItem('mpfa-theme');document.documentElement.dataset.theme=t==='piano'?'piano':'light';}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
