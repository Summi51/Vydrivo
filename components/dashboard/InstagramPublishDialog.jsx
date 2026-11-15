'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../lib/session-fetch.js';

const MAX_CAPTION = 2200;
const POLL_MS = 5000;
const MAX_POLLS = 36;

function publishReason(code) {
  switch (code) {
    case 'INSTAGRAM_RATE_LIMIT':
      return 'Instagram is limiting posts right now. Try again later.';
    case 'INSTAGRAM_MEDIA_REJECTED':
    case 'MEDIA_REJECTED':
      return 'Instagram rejected this video. Use a 9:16 MP4 under 1 GB.';
    case 'CONTAINER_EXPIRED':
      return 'Instagram took too long to process this video. Try again.';
    case 'INSTAGRAM_TOKEN_INVALID':
      return 'Reconnect Instagram in Settings, then try again.';
    case 'NOT_CONNECTED':
      return 'Instagram is no longer connected. Reconnect in Settings.';
    default:
      return 'Instagram could not complete this post. Try again.';
  }
}

export default function InstagramPublishDialog({ video, onClose, onPublished }) {
  const [phase, setPhase] = useState(video.instagram ? 'published' : 'loading');
  const [account, setAccount] = useState('');
  const [caption, setCaption] = useState(video.title || '');
  const [message, setMessage] = useState('');
  const [permalink, setPermalink] = useState(video.instagram?.permalink || '');
  const cancelled = useRef(false);
  const timer = useRef(null);

  useEffect(() => {
    cancelled.current = false;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelled.current = true;
      if (timer.current) clearTimeout(timer.current);
      document.body.style.overflow = previous;
    };
  }, []);

  // Escape closes this dialog. Capturing on document stops the key from also
  // closing the Videos modal underneath it.
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  useEffect(() => {
    if (video.instagram) return undefined;
    let alive = true;
    (async () => {
      try {
        const response = await apiRequest('/api/v1/instagram/connection');
        const payload = await response.json().catch(() => ({}));
        if (!alive) return;
        if (!response.ok) {
          setPhase('blocked');
          setMessage('Instagram settings are not available yet.');
          return;
        }
        if (!payload.data?.connected) {
          setPhase('blocked');
          setMessage('Connect a professional Instagram account in Settings first.');
          return;
        }
        setAccount(payload.data.account?.username || '');
        setPhase('ready');
      } catch {
        if (!alive) return;
        setPhase('blocked');
        setMessage('Could not check the Instagram connection. Reload and try again.');
      }
    })();
    return () => { alive = false; };
  }, [video]);

  function finish(job) {
    setPermalink(job?.permalink || '');
    setPhase('published');
    onPublished(video.runId, job?.permalink || '');
  }

  async function publishNow() {
    setPhase('working');
    setMessage('Creating the Reel container…');
    try {
      const endpoint = `/api/v1/projects/${video.projectId}/graphics-render/${video.runId}/instagram`;
      const response = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({ caption }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || 'Could not start posting.');
      let job = payload.data?.publish;
      if (job?.status === 'published') {
        finish(job);
        return;
      }
      setPhase('processing');
      setMessage('Instagram is processing the video. This usually takes under a minute.');
      for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
        await new Promise((resolve) => { timer.current = setTimeout(resolve, POLL_MS); });
        if (cancelled.current) return;
        const poll = await apiRequest(endpoint);
        const data = await poll.json().catch(() => ({}));
        if (cancelled.current) return;
        if (!poll.ok) {
          setMessage(data.error?.message || 'Instagram is still processing. Keep this window open.');
          continue;
        }
        job = data.data?.publish;
        if (job?.status === 'published') {
          finish(job);
          return;
        }
        if (job?.status === 'failed') {
          setPhase('failed');
          setMessage(publishReason(job.error));
          return;
        }
      }
      setPhase('failed');
      setMessage('Instagram is still processing. Open this video again to check the result.');
    } catch (error) {
      if (cancelled.current) return;
      setPhase('failed');
      setMessage(error.message || 'Could not post to Instagram.');
    }
  }

  const primaryButton = 'inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#7C3AED]';
  const quietButton = 'inline-flex min-h-[38px] items-center justify-center rounded-xl border border-[#2B2B35] bg-[#141419] px-4 py-2 text-[13px] font-semibold text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7]';

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Post to Instagram"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-[420px] overflow-y-auto rounded-2xl border border-[#2B2B35] bg-[#111116] p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#9A9AA5]">Instagram</p>
            <h2 className="mt-1 font-landing text-[20px] font-bold tracking-[-0.03em] text-[#F5F5F7]">Post to Instagram</h2>
            <p className="mt-1 truncate text-[12px] text-[#9A9AA5]">{video.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 bg-[#141419] text-[#F5F5F7] transition hover:border-white/30 hover:bg-[#1B1B22]"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
          </button>
        </div>

        {phase === 'loading' ? (
          <div className="mt-5 flex items-center gap-2 text-[13px] text-[#9A9AA5]">
            <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">progress_activity</span>
            Checking Instagram…
          </div>
        ) : null}

        {phase === 'blocked' ? (
          <>
            <p className="mt-5 rounded-xl border border-[#FBBF24]/35 bg-[#FBBF24]/10 px-3 py-2.5 text-[12px] leading-5 text-[#FCD34D]">
              {message}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} className={quietButton}>Close</button>
              <Link href="/app/settings" className={primaryButton}>
                Open Settings
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
              </Link>
            </div>
          </>
        ) : null}

        {phase === 'ready' ? (
          <>
            {account ? (
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-3 py-1 text-[11px] font-semibold text-[#6EE7B7]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" aria-hidden="true" />
                Posts as @{account}
              </p>
            ) : null}
            <label htmlFor="instagram-caption" className="mt-4 block text-[12px] font-semibold text-[#C9C9D2]">
              Caption
            </label>
            <textarea
              id="instagram-caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value.slice(0, MAX_CAPTION))}
              rows={5}
              maxLength={MAX_CAPTION}
              className="mt-1.5 w-full resize-none rounded-xl border border-[#2B2B35] bg-[#0F0F14] px-3 py-2.5 text-[13px] leading-5 text-[#F5F5F7] outline-none transition focus:border-[#8B5CF6]/60"
            />
            <div className="mt-1 flex justify-end font-mono text-[11px] text-[#5F5F6B]">
              {caption.length}/{MAX_CAPTION}
            </div>
            <p className="mt-3 rounded-xl border border-[#FBBF24]/30 bg-[#FBBF24]/10 px-3 py-2 text-[11px] leading-4 text-[#FCD34D]">
              This posts a public Reel now. It cannot be undone from Vydrivo.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} className={quietButton}>Cancel</button>
              <button type="button" onClick={publishNow} className={primaryButton}>
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">photo_camera</span>
                Post now
              </button>
            </div>
          </>
        ) : null}

        {phase === 'working' || phase === 'processing' ? (
          <>
            <div className="mt-5 rounded-xl border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-3 py-3">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-[#C4B5FD]">
                <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">progress_activity</span>
                {phase === 'working' ? 'Starting the post…' : 'Publishing the Reel…'}
              </p>
              <p className="mt-1.5 text-[12px] leading-5 text-[#B7B7C2]">{message}</p>
            </div>
            <p className="mt-3 text-[11px] leading-4 text-[#777781]">
              Keep this window open for the result. If you close it, open the video again to check.
            </p>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={onClose} className={quietButton}>Close</button>
            </div>
          </>
        ) : null}

        {phase === 'published' ? (
          <>
            <div className="mt-5 rounded-xl border border-[#34D399]/30 bg-[#34D399]/10 px-3 py-3">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-[#6EE7B7]">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check_circle</span>
                Posted{account ? ` as @${account}` : ''}
              </p>
              <p className="mt-1 text-[12px] leading-5 text-[#B7B7C2]">The Reel is live on Instagram.</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} className={quietButton}>Done</button>
              {permalink ? (
                <a href={permalink} target="_blank" rel="noreferrer" className={primaryButton}>
                  View on Instagram
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">open_in_new</span>
                </a>
              ) : null}
            </div>
          </>
        ) : null}

        {phase === 'failed' ? (
          <>
            <p className="mt-5 rounded-xl border border-[#F87171]/35 bg-[#F87171]/10 px-3 py-2.5 text-[12px] leading-5 text-[#FCA5A5]">
              {message}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} className={quietButton}>Close</button>
              <button
                type="button"
                onClick={() => { setMessage(''); setPhase('ready'); }}
                className={primaryButton}
              >
                Try again
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
