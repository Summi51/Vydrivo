'use client';

import { useEffect, useRef, useState } from 'react';

export default function BackgroundPlaylist({ sources, poster }) {
  const refs = useRef([]);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    refs.current.forEach((video, index) => {
      if (!video) return;
      if (index !== active) {
        video.pause();
        return;
      }
      if (!playing) {
        video.pause();
        return;
      }
      if (video.ended) video.currentTime = 0;
      video.play().catch(() => {});
    });
  }, [active, playing]);

  function advance() {
    setActive((current) => (current + 1) % sources.length);
  }

  return (
    <>
      <div className="landing-hero-fallback absolute inset-0" aria-hidden="true" />
      <div
        className="absolute inset-0 scale-105 bg-cover bg-center opacity-85 blur-[1px] brightness-[0.82] contrast-[1.04] saturate-[0.95] motion-reduce:opacity-100"
        style={{ backgroundImage: `url(${poster})` }}
        aria-hidden="true"
      />
      {sources.map((source, index) => (
        <video
          key={source}
          ref={(element) => { refs.current[index] = element; }}
          src={source}
          muted
          playsInline
          preload="auto"
          onEnded={index === active ? advance : undefined}
          className={`absolute inset-0 h-full w-full scale-105 object-cover blur-[1px] brightness-[0.82] contrast-[1.04] saturate-[0.95] transition-opacity duration-700 ${
            index === active ? 'opacity-90' : 'opacity-0'
          } motion-reduce:hidden`}
          aria-hidden="true"
        />
      ))}
      <button
        type="button"
        onClick={() => setPlaying((current) => !current)}
        className="absolute bottom-4 right-4 z-20 hidden items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[10px] font-semibold text-white/70 backdrop-blur transition hover:bg-black/55 hover:text-white sm:inline-flex motion-reduce:hidden"
      >
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
          {playing ? 'pause' : 'play_arrow'}
        </span>
        {playing ? 'Pause background' : 'Play background'}
      </button>
    </>
  );
}
