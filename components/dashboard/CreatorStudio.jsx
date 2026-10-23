'use client';

import { useEffect, useState } from 'react';
import { readDraft } from '../../lib/project-draft.js';
import { readStoryboard } from '../../lib/storyboard-storage.js';
import CreateVideoHero from './CreateVideoHero';
import DashboardSections from './DashboardSections';
import StudioShell from './StudioShell';

export default function CreatorStudio({ user }) {
  const [draft, setDraft] = useState(undefined);
  const [storyboard, setStoryboard] = useState(undefined);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    function loadLocalState() {
      try {
        setDraft(readDraft(window.sessionStorage));
      } catch {
        setDraft(null);
      }
      try {
        setStoryboard(readStoryboard(window.sessionStorage));
      } catch {
        setStoryboard(null);
      }
    }
    loadLocalState();
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadLocalState();
    };
    window.addEventListener('focus', loadLocalState);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', loadLocalState);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function focusCreate() {
    const section = document.getElementById('create-video');
    section?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      document.getElementById('topic-input')?.focus({ preventScroll: true });
    }, 320);
  }

  return (
    <StudioShell user={user} onNew={focusCreate} onNotice={setNotice} notice={notice}>
      <div id="create-video" className="scroll-mt-24">
        <CreateVideoHero
          draft={draft}
          onSaved={(saved) => {
            setDraft(saved);
            setStoryboard(null);
          }}
        />
      </div>
      <DashboardSections draft={draft} storyboard={storyboard} onNew={focusCreate} />
    </StudioShell>
  );
}
