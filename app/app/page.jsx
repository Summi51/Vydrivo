import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ACCESS_COOKIE } from '../../lib/auth-server.js';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'App — Vydrivo',
  robots: { index: false, follow: false },
};

export default async function AppHome() {
  const store = await cookies();
  if (!store.get(ACCESS_COOKIE)?.value) redirect('/sign-in');
  return (
    <main className="min-h-screen bg-[#0D0A0E] px-6 py-12 text-white">
      <div className="mx-auto max-w-xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#F0839E]">Signed in</p>
        <h1 className="mt-3 font-headline text-4xl font-extrabold">Projects are not connected yet.</h1>
        <p className="mt-4 text-white/70">
          This session cookie is present. The project list, generation, and billing are not built. A cookie is not treated as a verified identity for those actions.
        </p>
        <Link href="/projects/new" className="mt-8 inline-flex rounded-xl bg-gradient-to-r from-[#D946EF] via-[#F0839E] to-[#FBBF24] px-5 py-3 font-headline font-bold text-neutral-950">
          Open the local draft
        </Link>
      </div>
    </main>
  );
}
