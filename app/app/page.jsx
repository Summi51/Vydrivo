import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../../lib/auth-server.js';
import SessionKeeper from '../../components/SessionKeeper';
import SignOutButton from '../../components/SignOutButton';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Workspace — Vydrivo',
  robots: { index: false, follow: false },
};

function accessExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64url').toString('utf8'));
    return typeof payload.exp === 'number' ? payload.exp * 1000 <= Date.now() + 30_000 : false;
  } catch {
    return true;
  }
}

export default async function AppHome() {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  const refresh = store.get(REFRESH_COOKIE)?.value;
  if (!access && !refresh) redirect('/sign-in');
  const needsRefresh = accessExpired(access);

  return (
    <main className="min-h-screen bg-[#0D0A0E] text-white">
      {needsRefresh && refresh ? <SessionKeeper /> : null}

      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#D946EF] via-[#F0839E] to-[#FBBF24]">
              <span className="ml-0.5 block h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-white" />
            </span>
            <span className="font-headline text-xl font-extrabold tracking-tight">Vydrivo</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/projects/new"
              className="hidden rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/5 sm:inline-flex"
            >
              New project
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-14">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#F0839E]">Signed in</p>
        <h1 className="mt-3 max-w-2xl font-headline text-4xl font-extrabold tracking-tight sm:text-5xl">
          Your workspace is ready for the next milestone.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
          This is a real Supabase session cookie, not a demo screen. Project lists, storyboard generation, and billing are
          not connected yet. A cookie is not treated as verified identity for those actions.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#D946EF] via-[#F0839E] to-[#FBBF24] px-5 py-3 font-headline font-bold text-neutral-950"
          >
            Open the local draft
            <span className="material-symbols-outlined text-lg" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/5"
          >
            Back to homepage
          </Link>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            ['Session', 'Supabase cookies are present. Sign-out revokes the provider session and clears them.'],
            ['Next step', 'Project persistence, storyboard review, and generation are still design-only.'],
            ['Budget', '₹0 incremental service spend. No paid provider or cloud resource is active.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="font-headline text-base font-bold">{title}</p>
              <p className="mt-2 text-sm leading-6 text-white/55">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
