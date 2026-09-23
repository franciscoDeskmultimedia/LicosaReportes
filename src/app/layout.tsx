import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '@/components/Navigation';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'LICOSA - Control de Obra Vial & Bodega',
  description: 'Sistema integral de control de avance de obra vial, planillaje de rubros, kardex de bodega y reportes diarios oficiales',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="es" className="h-full bg-slate-50 text-slate-900 antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <Navigation currentUser={currentUser}>{children}</Navigation>
      </body>
    </html>
  );
}

