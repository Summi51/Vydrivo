'use client';
import { useState } from 'react';

export default function IdeaForm() {
  const [idea, setIdea] = useState('');
  const [message, setMessage] = useState('');
  function submit(event) {
    event.preventDefault();
    if (!idea.trim()) { setMessage('Add a topic or a few notes to start.'); return; }
    setMessage('Your idea is ready to copy. The connected storyboard workspace is the next milestone; no generation request has been sent.');
  }
  return <form onSubmit={submit} className="idea-form">
    <label htmlFor="idea">YOUR TOPIC OR ROUGH NOTES</label>
    <textarea id="idea" value={idea} onChange={e => { setIdea(e.target.value); setMessage(''); }} maxLength={10000} rows={3} placeholder="Why do we dream? Explain the science with a little wonder…" aria-describedby="idea-note idea-status" />
    <div className="form-bottom"><span id="idea-note">60–90s · Vertical video <small>{idea.length.toLocaleString()} / 10,000</small></span><button className="button gradient" type="submit">Start a project <span aria-hidden="true">↗</span></button></div>
    <p className="form-note">Private prototype · Planning and generation are not connected yet.</p>
    <p id="idea-status" role="status">{message}</p>
  </form>;
}
