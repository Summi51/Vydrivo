'use client';

import { useEffect, useState } from 'react';
import {
  CURRENT_PROJECT_KEY,
  getProject,
  listProjects,
  projectStoryboardSummary,
} from '../../lib/projects-client.js';
import CreateVideoHero from './CreateVideoHero';
import DashboardSections from './DashboardSections';
import StudioShell from './StudioShell';

function draftFromProject(project) {
  if (!project) return null;
  return {
    id: project.id,
    title: project.title,
    topic: project.topic,
    format: project.format,
    formatId: project.formatId,
    targetSeconds: project.targetSeconds,
    targetLabel: project.targetLabel,
    aspect: project.aspect,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    status: project.status,
    persistence: 'postgres',
  };
}

function storyboardFromProject(project) {
  if (!project?.storyboard?.scenes?.length) return null;
  const summary = projectStoryboardSummary(project);
  return {
    storyboard: project.storyboard,
    review: project.review,
    sceneCount: summary.sceneCount,
    seconds: summary.seconds,
    persistence: 'postgres',
    videoGeneration: 'not-connected',
  };
}

export default function CreatorStudio({ user }) {
  const [project, setProject] = useState(undefined);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;

    async function loadProject() {
      try {
        const data = await listProjects({ limit: 20 });
        if (!active) return;
        const currentId = window.sessionStorage.getItem(CURRENT_PROJECT_KEY);
        let current = data.projects.find((item) => item.id === currentId) || null;
        if (!current && currentId) {
          try {
            current = await getProject(currentId);
          } catch {
            current = null;
          }
          if (!active) return;
        }
        current = current || data.projects[0] || null;
        if (current) window.sessionStorage.setItem(CURRENT_PROJECT_KEY, current.id);
        setProject(current);
      } catch (error) {
        if (!active) return;
        setProject(null);
        setNotice(error.message || 'Could not load projects.');
      }
    }

    loadProject();
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadProject();
    };
    window.addEventListener('focus', loadProject);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      window.removeEventListener('focus', loadProject);
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

  const draft = project ? draftFromProject(project) : null;
  const storyboard = project ? storyboardFromProject(project) : null;

  return (
    <StudioShell user={user} onNew={focusCreate} onNotice={setNotice} notice={notice}>
      <div id="create-video" className="scroll-mt-24">
        <CreateVideoHero
          draft={draft}
          onSaved={(saved) => {
            setProject(saved);
            window.sessionStorage.setItem(CURRENT_PROJECT_KEY, saved.id);
          }}
        />
      </div>
      <DashboardSections
        draft={project === undefined ? undefined : draft}
        storyboard={project === undefined ? undefined : storyboard}
        onNew={focusCreate}
      />
    </StudioShell>
  );
}
