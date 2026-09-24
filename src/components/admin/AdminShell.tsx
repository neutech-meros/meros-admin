import { Toaster } from '@/components/ui/sonner';

import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen"
      style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
    >
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="mx-auto w-full flex-1 p-8" style={{ maxWidth: '1440px' }}>
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
