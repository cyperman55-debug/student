import { useEffect, useRef, useState } from 'react';

export const progressKey = (studentId) => `shefo-progress-v1:${studentId}`;
export function readProgress(studentId) {
  try {
    const data = JSON.parse(localStorage.getItem(progressKey(studentId)) || '{}');
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    return Object.fromEntries(Object.entries(data).filter(([, entry]) => entry && Number.isFinite(entry.seconds) && entry.seconds >= 0 && Number.isFinite(entry.duration) && entry.duration > 0));
  } catch { return {}; }
}
export function saveProgress(studentId, video, seconds, duration) {
  if (!Number.isFinite(seconds) || seconds < 0 || !Number.isFinite(duration) || duration <= 0) return;
  try {
    const entries = readProgress(studentId);
    entries[video.id] = { videoId: video.id, url: video.url, seconds: Math.min(seconds, duration), duration, updatedAt: Date.now(), completed: duration - seconds <= 5 };
    localStorage.setItem(progressKey(studentId), JSON.stringify(entries));
  } catch { /* Playback still works when storage is disabled or full. */ }
}
export function formatPosition(seconds = 0) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

// Progress stays on this device, scoped to the signed-in student and exact video URL.
export default function ResumePlayer({ studentId, video, src, onError, watermark }) {
  const frame = useRef(null);
  const native = useRef(null);
  const player = useRef(null);
  const initial = useRef(readProgress(studentId)[video.id]);
  const saved = initial.current?.url === video.url ? initial.current : null;
  const start = saved && !saved.completed ? saved.seconds : 0;
  const [position, setPosition] = useState(start);
  const latest = useRef(saved);
  const lastWrite = useRef(0);
  const record = (seconds, duration, force = false) => {
    latest.current = { seconds, duration };
    setPosition(Number(seconds) || 0);
    if (force || Date.now() - lastWrite.current > 2000) {
      saveProgress(studentId, video, seconds, duration); lastWrite.current = Date.now();
    }
  };
  useEffect(() => {
    const flush = () => { if (latest.current) saveProgress(studentId, video, latest.current.seconds, latest.current.duration); };
    window.addEventListener('pagehide', flush);
    return () => { flush(); window.removeEventListener('pagehide', flush); };
  }, [studentId, video.id, video.url]);
  const isNative = /\.(mp4|webm|ogg)(?:$|[?#])/i.test(src);
  const isBunny = /^https:\/\/(iframe|player)\.mediadelivery\.net\//i.test(src);
  const frameSrc = isBunny && start > 0 ? (() => { const url = new URL(src); url.searchParams.set('t', String(Math.floor(start))); return url.toString(); })() : src;

  useEffect(() => {
    if (!isBunny || !frame.current) return;
    const iframe = frame.current;
    const origin = new URL(src).origin;
    const send = (method, value, listener) => iframe.contentWindow?.postMessage(JSON.stringify({ context: 'player.js', version: '0.0.11', method, value, listener }), origin);
    player.current = { setCurrentTime: (value) => send('setCurrentTime', value) };
    let restored = false;
    const receive = (event) => {
      if (event.origin !== origin || event.source !== iframe.contentWindow) return;
      let data;
      try { data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch { return; }
      if (data?.context !== 'player.js') return;
      if (data.event === 'ready') {
        send('addEventListener', 'timeupdate', 'resume-time');
        send('addEventListener', 'ended', 'resume-ended');
        if (!restored && start > 0) send('setCurrentTime', start);
        restored = true;
      }
      if (data.event === 'timeupdate') {
        const { seconds, duration } = data.value || {};
        record(Number(seconds), Number(duration));
      }
      if (data.event === 'ended') {
        const entry = latest.current;
        if (entry) record(entry.duration, entry.duration, true);
      }
    };
    window.addEventListener('message', receive);
    send('addEventListener', 'ready', 'resume-ready');
    return () => {
      send('removeEventListener', 'timeupdate', 'resume-time');
      send('removeEventListener', 'ended', 'resume-ended');
      window.removeEventListener('message', receive);
      player.current = null;
    };
  }, [studentId, video.id, video.url, src]);

  const updateNative = (event) => {
    const media = event.currentTarget;
    record(media.currentTime, media.duration, event.type !== 'timeupdate');
  };
  return <>
    <div className="lesson-video-frame-wrap">
      {isNative ? <video ref={native} className="lesson-video-frame lesson-video-native" src={src} title={`شرح المحاضرة: ${video.title}`} controls playsInline
        onLoadedMetadata={(event) => { if (start > 0) event.currentTarget.currentTime = Math.min(start, Math.max(0, event.currentTarget.duration - 1)); }}
        onTimeUpdate={updateNative} onPause={updateNative} onEnded={updateNative} onError={onError} />
        : <iframe ref={frame} className="lesson-video-frame" src={frameSrc} title={`شرح المحاضرة: ${video.title}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />}
      <div className="video-watermark" aria-hidden="true">{watermark}</div>
    </div>
    <div className="resume-player-status">
      {isNative || isBunny ? <><span>موضع المشاهدة: <b dir="ltr">{formatPosition(position)}</b> • محفوظ على هذا الجهاز</span>
        <button type="button" className="secondary-btn" onClick={() => {
          if (native.current) native.current.currentTime = 0;
          if (player.current) player.current.setCurrentTime(0);
          if (latest.current?.duration) record(0, latest.current.duration, true);
          else setPosition(0);
        }}>ابدأ من الأول</button></> : <span>استكمال الموضع تلقائيًا متاح لفيديوهات Bunny وملفات الفيديو المباشرة. هذا المشغّل لا يدعمه حاليًا.</span>}
    </div>
  </>;
}
