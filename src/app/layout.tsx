import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navigation } from '@/components/Navigation';
import { getCurrentUser } from '@/lib/auth';
import { AiChatAssistant } from '@/components/chat/AiChatAssistant';
import { AiChatProvider } from '@/components/chat/AiChatContext';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';

export const viewport: Viewport = {
  themeColor: '#ea580c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'LICOSA - Control de Obra Vial & Bodega',
  description: 'Sistema integral de control de avance de obra vial, planillaje de rubros, kardex de bodega y reportes diarios oficiales',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LICOSA',
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
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
        <ServiceWorkerRegister />
        <AiChatProvider>
          <Navigation currentUser={currentUser}>
            {children}
          </Navigation>
          {currentUser && <AiChatAssistant />}
        </AiChatProvider>
      </body>
    </html>
  );
}

