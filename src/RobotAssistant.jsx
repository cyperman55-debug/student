import { useEffect, useRef } from 'react';
import robotImage from '../WhatsApp Image 2026-09-30 at 4.14.49 AM.jpeg';

export default function RobotAssistant() {
  const rootRef = useRef(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    // entrance after mount
    requestAnimationFrame(() => el.classList.add('robot-entered'));
  }, []);

  return (
    <div ref={rootRef} className="robot-assistant" aria-hidden="true">
      <div className="robot-shadow" />
      <img src={robotImage} alt="robot" className="robot-image" />
      <div className="robot-wave-indicator" />
    </div>
  );
}
