'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDayMonthYear } from '../../lib/date-format.js';
import { apiRequest } from '../../lib/session-fetch.js';
import StudioShell from './StudioShell';

const FLASH = {
  connected: 'Instagram connected. You can post a video from a project Publish step or the Videos page.',
  denied: 'Connection cancelled. Nothing was changed.',
  state: 'This connection link is no longer valid. Start again.',
  expired: 'This connection link expired. Start again.',
  no_account: 'No professional Instagram account was shared. Use a Business or Creator account and try again.',
  token: 'Instagram did not complete the sign-in. Try again.',
  setup: 'Instagram connection is not set up on this server yet.',
  failed: 'Instagram could not be connected. Try again.',
};

function Badge({ status = 'disconnected' }) {
  const styles = {
    connected: { tone: 'border-[#34D399]/35 bg-[#34D399]/10 text-[#6EE7B7]', dot: 'bg-[#34D399]', label: 'Connected' },
    loading: { tone: 'border-[#FBBF24]/35 bg-[#FBBF24]/10 text-[#FCD34D]', dot: 'bg-[#FBBF24]', label: 'Checking' },
    unavailable: { tone: 'border-[#F87171]/35 bg-[#F87171]/10 text-[#FCA5A5]', dot: 'bg-[#F87171]', label: 'Unavailable' },
    disconnected: { tone: 'border-[#2B2B35] bg-[#0B0B0F] text-[#9A9AA5]', dot: 'bg-[#5F5F6B]', label: 'Not connected' },
  };
  const state = styles[status] || styles.disconnected;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.1em] ${state.tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} aria-hidden="true" />
      {state.label}
    </span>
  );
}

export default function StudioSettings({ user }) {
  const router = useRouter();
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState('');
  const [flash, setFlash] = useState(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('instagram');
    if (result) {
      const reason = params.get('reason') || '';
      const message = result === 'connected'
        ? FLASH.connected
        : FLASH[reason] || FLASH.failed;
      setFlash({ tone: result === 'connected' ? 'ok' : 'error', message });
      params.delete('instagram');
      params.delete('reason');
      const query = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const response = await apiRequest('/api/v1/instagram/connection');
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error?.message || 'Instagram settings could not load.');
        if (!cancelled) setConnection(payload.data?.account || null);
      } catch (error) {
        if (!cancelled) setLoadError(error.message || 'Instagram settings could not load.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function connect() {
    if (busy) return;
    setBusy('connect');
    setFlash(null);
    try {
      const response = await apiRequest('/api/v1/instagram/connect');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || 'Instagram connection is not available yet.');
      if (!payload.data?.url) throw new Error('Instagram connection is not available yet.');
      window.location.assign(payload.data.url);
    } catch (error) {
      setBusy('');
      setFlash({ tone: 'error', message: error.message || FLASH.failed });
    }
  }

  async function disconnect() {
    if (busy) return;
    if (!confirmDisconnect) {
      setConfirmDisconnect(true);
      return;
    }
    setBusy('disconnect');
    setFlash(null);
    try {
      const response = await apiRequest('/api/v1/instagram/connection', { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || 'Instagram could not be disconnected.');
      setConnection(null);
      setConfirmDisconnect(false);
      setFlash({ tone: 'ok', message: 'Instagram disconnected. Nothing will be published to that account.' });
    } catch (error) {
      setFlash({ tone: 'error', message: error.message || FLASH.failed });
    } finally {
      setBusy('');
    }
  }

  return (
    <StudioShell
      user={user}
      onNew={() => router.push('/app#create-video')}
      notice=""
      sectionLabel="Settings"
      showStages={false}
    >
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.2em] text-[#9A9AA5]">Your studio</p>
          <h1 className="mt-1 font-landing text-[28px] font-bold leading-[1.08] tracking-[-0.045em] text-[#F5F5F7] sm:text-[36px]">
            Settings
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#9A9AA5]">
            Manage the account Vydrivo can publish to. Nothing is posted automatically.
          </p>
        </div>
      </section>

      {flash ? (
        <p
          role="status"
          className={`mt-4 rounded-xl border px-4 py-3 text-[13px] leading-6 ${
            flash.tone === 'ok'
              ? 'border-[#34D399]/30 bg-[#34D399]/10 text-[#6EE7B7]'
              : 'border-[#F87171]/35 bg-[#F87171]/10 text-[#FCA5A5]'
          }`}
        >
          {flash.message}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="studio-surface rounded-3xl border border-[#26262E] p-5 sm:p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[#2B2B35] bg-[#0B0B0F] text-[#C4B5FD]">
                <span className="material-symbols-outlined text-[22px]" aria-hidden="true">photo_camera</span>
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-[#F5F5F7]">Instagram</h2>
                <p className="text-[12px] text-[#777781]">Professional account connection</p>
              </div>
            </div>
            <Badge status={loading ? 'loading' : loadError ? 'unavailable' : connection ? 'connected' : 'disconnected'} />
          </div>

          {loading ? (
            <div className="mt-5 space-y-3">
              <div className="h-3 w-2/5 animate-pulse rounded bg-[#26262E]" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-[#26262E]" />
              <div className="h-10 w-40 animate-pulse rounded-xl bg-[#1B1B22]" />
            </div>
          ) : loadError ? (
            <div className="mt-5 rounded-xl border border-[#F87171]/30 bg-[#F87171]/5 px-4 py-4">
              <p className="text-[13px] leading-6 text-[#FCA5A5]">{loadError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#2B2B35] bg-[#141419] px-3.5 py-2 text-[13px] font-semibold text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7]"
              >
                Try again
              </button>
            </div>
          ) : connection ? (
            <div className="mt-5">
              <div className="rounded-2xl border border-[#26262E] bg-[#0B0B0F]/60 px-4 py-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#777781]">Connected account</p>
                <p className="mt-1 text-[16px] font-semibold text-[#F5F5F7]">@{connection.username}</p>
                {connection.connectedAt ? (
                  <p className="mt-1 text-[12px] text-[#9A9AA5]">Connected {formatDayMonthYear(connection.connectedAt)}</p>
                ) : null}
              </div>
              <p className="mt-4 text-[13px] leading-6 text-[#9A9AA5]">
                This account is connected. Post a video from a project Publish step or the Videos page when you
                want; nothing is posted automatically.
              </p>
              <button
                type="button"
                onClick={disconnect}
                disabled={busy === 'disconnect'}
                className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#F87171]/40 bg-[#F87171]/10 px-4 py-2 text-[13px] font-semibold text-[#FCA5A5] transition hover:border-[#F87171]/70 hover:bg-[#F87171]/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">link_off</span>
                {busy === 'disconnect' ? 'Disconnecting…' : confirmDisconnect ? 'Confirm disconnect' : 'Disconnect'}
              </button>
              {confirmDisconnect ? (
                <button
                  type="button"
                  onClick={() => setConfirmDisconnect(false)}
                  className="ml-2 mt-4 text-[13px] font-semibold text-[#9A9AA5] underline-offset-4 transition hover:text-[#F5F5F7] hover:underline"
                >
                  Keep connected
                </button>
              ) : null}
            </div>
          ) : (
            <div className="mt-5">
              <p className="text-[13px] leading-6 text-[#9A9AA5]">
                Connect the professional Instagram account you want to use for Vydrivo videos. You choose each video
                on a project Publish step or the Videos page and nothing is posted automatically.
              </p>
              <button
                type="button"
                onClick={connect}
                disabled={busy === 'connect'}
                className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_10px_30px_rgba(124,58,237,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">link</span>
                {busy === 'connect' ? 'Opening Instagram…' : 'Connect Instagram'}
              </button>
            </div>
          )}
        </section>

        <aside className="studio-surface rounded-3xl border border-[#26262E] p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold text-[#F5F5F7]">Before you connect</h2>
          <ul className="mt-3 space-y-3 text-[13px] leading-6 text-[#9A9AA5]">
            <li className="flex gap-2.5">
              <span className="material-symbols-outlined mt-0.5 text-[16px] text-[#C4B5FD]" aria-hidden="true">check_circle</span>
              Use a Business or Creator account, not a personal account.
            </li>
            <li className="flex gap-2.5">
              <span className="material-symbols-outlined mt-0.5 text-[16px] text-[#C4B5FD]" aria-hidden="true">check_circle</span>
              Keep the account public so your videos can be seen.
            </li>
            <li className="flex gap-2.5">
              <span className="material-symbols-outlined mt-0.5 text-[16px] text-[#C4B5FD]" aria-hidden="true">check_circle</span>
              Approve only the account you want Vydrivo to use.
            </li>
          </ul>
          <p className="mt-4 border-t border-[#26262E] pt-4 text-[12px] leading-5 text-[#777781]">
            Your Instagram permission is stored securely on the server. It is never shown in this browser.
          </p>
        </aside>
      </div>
    </StudioShell>
  );
}
