export default function StudentRobot() {
  return (
    <div className="student-robot-companion" aria-hidden="true">
      <svg viewBox="0 0 220 250" role="presentation">
              <defs>
                <linearGradient id="edge-bot-shell" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#75e7ff" /><stop offset=".45" stopColor="#2784dc" /><stop offset="1" stopColor="#174c9d" /></linearGradient>
                <linearGradient id="edge-bot-side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#183b72" /><stop offset="1" stopColor="#4f9bea" /></linearGradient>
                <linearGradient id="edge-bot-face" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#12233b" /><stop offset="1" stopColor="#07111f" /></linearGradient>
                <linearGradient id="edge-bot-glow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffdb72" /><stop offset="1" stopColor="#ff784f" /></linearGradient>
                <radialGradient id="edge-bot-aura"><stop offset="0" stopColor="#39c9ff" stopOpacity=".38" /><stop offset="1" stopColor="#39c9ff" stopOpacity="0" /></radialGradient>
                <filter id="edge-bot-shadow" x="-45%" y="-35%" width="190%" height="190%"><feDropShadow dx="0" dy="12" stdDeviation="9" floodColor="#08172d" floodOpacity=".3" /></filter>
              </defs>
              <ellipse cx="124" cy="221" rx="88" ry="24" fill="url(#edge-bot-aura)" />
              <ellipse cx="124" cy="229" rx="47" ry="7" fill="#08172d" opacity=".2" />
              <g className="student-robot-float" filter="url(#edge-bot-shadow)">
                <path d="M72 74 57 62l-18 8 3 30 18 13 13-14m88-26 17-13 18 7-2 28-18 14-13-13" fill="url(#edge-bot-side)" stroke="#153c78" strokeWidth="4" strokeLinejoin="round" />
                <path d="M70 56q8-19 31-22l39 4q26 4 34 28l7 57q3 32-22 47l-10 6q-26 13-57 4l-16-5q-23-8-25-34l-3-49q-1-23 22-36Z" fill="url(#edge-bot-shell)" stroke="#174b92" strokeWidth="5" />
                <path d="M85 47q22-14 48-7" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="6" strokeLinecap="round" />
                <path d="m112 34 4-18q2-7 9-5l9 3-4 23" fill="#ff9859" stroke="#c75d3f" strokeWidth="3" strokeLinejoin="round" />
                <circle cx="126" cy="11" r="7" fill="#ffe08a" stroke="#fff4cf" strokeWidth="2" />
                <rect x="67" y="75" width="99" height="70" rx="24" fill="url(#edge-bot-face)" stroke="#9cecff" strokeWidth="3" />
                <path d="M83 99q9-13 19 0m29 0q9-13 19 0" fill="none" stroke="#91f5ff" strokeWidth="6" strokeLinecap="round" />
                <path d="M103 122q12 10 25 0" fill="none" stroke="#ffb56a" strokeWidth="4" strokeLinecap="round" />
                <circle cx="58" cy="103" r="9" fill="url(#edge-bot-glow)" /><circle cx="175" cy="103" r="9" fill="url(#edge-bot-glow)" />
                <path d="M77 159h82l-8 24q-3 9-14 11l-28 5-28-8q-10-3-11-13Z" fill="#152f56" stroke="#4e9be7" strokeWidth="3" />
                <path d="M97 172h40m-31 10h22" stroke="#6ce9ff" strokeWidth="4" strokeLinecap="round" />
                <g className="student-robot-wave">
                  <path d="m73 143-22-18-7-27" fill="none" stroke="#174887" strokeWidth="19" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="m73 143-22-18-7-27" fill="none" stroke="url(#edge-bot-shell)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="73" cy="143" r="10" fill="url(#edge-bot-glow)" stroke="#fff1ce" strokeWidth="2" />
                  <path d="M44 100q-8-2-8-11l1-12q0-5 4-5t4 5l1 8 5-18q2-6 7-4t3 7l-3 15 8-12q3-5 7-2t0 8l-7 13 8-8q4-4 7 0t-1 8l-10 14q-8 10-21 7l-7-2q-11-4-10-16l1-8q1-7 8-6Z" fill="url(#edge-bot-glow)" stroke="#df7949" strokeWidth="3" strokeLinejoin="round" />
                </g>
                <path d="M105 203q19 9 39 0" fill="none" stroke="#ffb15e" strokeWidth="5" strokeLinecap="round" />
              </g>
            </svg>
    </div>
  );
}