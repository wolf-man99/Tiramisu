import { Sidebar } from '@/components/app/Sidebar';
import { TopBar } from '@/components/app/TopBar';

/** The authenticated app shell: sidebar + top bar around the course routes. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
