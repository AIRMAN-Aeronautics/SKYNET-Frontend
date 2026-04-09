// AI-inspired aircraft constellation hologram — pure SVG + CSS keyframes, no extra deps.

// ── Constellation nodes: top-down aircraft silhouette, 400×320 viewBox ──────
const NODES = [
  // Fuselage spine
  { id: 'nose', x: 200, y: 46  },
  { id: 'f1',   x: 200, y: 80  },
  { id: 'f2',   x: 200, y: 120 },
  { id: 'f3',   x: 200, y: 158 },
  { id: 'f4',   x: 200, y: 198 },
  { id: 'f5',   x: 200, y: 232 },
  { id: 'tail', x: 200, y: 272 },

  // Left wing
  { id: 'lwlr', x: 183, y: 115 }, // leading-edge root
  { id: 'lwle', x: 58,  y: 150 }, // leading-edge tip
  { id: 'lwte', x: 74,  y: 178 }, // trailing-edge tip
  { id: 'lwtr', x: 183, y: 162 }, // trailing-edge root

  // Left engine pod (short node pair below wing)
  { id: 'lef',  x: 106, y: 138 },
  { id: 'ler',  x: 109, y: 163 },

  // Right wing
  { id: 'rwlr', x: 217, y: 115 },
  { id: 'rwle', x: 342, y: 150 },
  { id: 'rwte', x: 326, y: 178 },
  { id: 'rwtr', x: 217, y: 162 },

  // Right engine pod
  { id: 'ref_', x: 294, y: 138 },
  { id: 'rer',  x: 291, y: 163 },

  // Left horizontal stabiliser
  { id: 'lsr',  x: 184, y: 225 }, // root
  { id: 'lsl',  x: 132, y: 238 }, // tip
  { id: 'lst',  x: 140, y: 254 }, // trailing tip

  // Right horizontal stabiliser
  { id: 'rsr',  x: 216, y: 225 },
  { id: 'rsl',  x: 268, y: 238 },
  { id: 'rst',  x: 260, y: 254 },
] as const;

// ── Connections ──────────────────────────────────────────────────────────────
const EDGES: [string, string][] = [
  // Fuselage
  ['nose','f1'],['f1','f2'],['f2','f3'],['f3','f4'],['f4','f5'],['f5','tail'],

  // Left wing outline
  ['lwlr','lwle'],['lwle','lwte'],['lwte','lwtr'],
  ['lwlr','f2'],['lwtr','f3'],

  // Left engine pod + pylon
  ['lef','ler'],['lef','lwlr'],

  // Right wing outline
  ['rwlr','rwle'],['rwle','rwte'],['rwte','rwtr'],
  ['rwlr','f2'],['rwtr','f3'],

  // Right engine pod + pylon
  ['ref_','rer'],['ref_','rwlr'],

  // Left stabiliser
  ['f5','lsr'],['lsr','lsl'],['lsl','lst'],['lst','f5'],

  // Right stabiliser
  ['f5','rsr'],['rsr','rsl'],['rsl','rst'],['rst','f5'],
];

// ── Ambient drift particles around the canvas ────────────────────────────────
const AMBIENT = [
  { x: '12%', y: '18%', delay: 0,   dur: 4.2 },
  { x: '82%', y: '12%', delay: 1.5, dur: 5.0 },
  { x: '8%',  y: '68%', delay: 0.7, dur: 3.8 },
  { x: '88%', y: '72%', delay: 2.2, dur: 4.6 },
  { x: '48%', y: '6%',  delay: 0.3, dur: 6.1 },
  { x: '52%', y: '92%', delay: 1.9, dur: 5.3 },
  { x: '22%', y: '85%', delay: 3.0, dur: 3.5 },
  { x: '78%', y: '82%', delay: 2.6, dur: 4.8 },
];

const CYCLE = 10; // seconds — full constellation cycle

export function AircraftHologram() {
  const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]));

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden">

      <style>{`
        /* ── Particle drift-in / dissolve ── */
        @keyframes _ahParticle {
          0%        { opacity: 0;    transform: scale(0.3); }
          18%       { opacity: 1;    transform: scale(1.4); }
          28%, 65%  { opacity: 0.85; transform: scale(1);   }
          82%       { opacity: 0;    transform: scale(0.3); }
          100%      { opacity: 0;    transform: scale(0.3); }
        }

        /* ── Line draw-in via stroke-dashoffset ── */
        @keyframes _ahLine {
          0%, 8%  { stroke-dashoffset: 500; opacity: 0;    }
          28%     { stroke-dashoffset: 0;   opacity: 0.65; }
          65%     { stroke-dashoffset: 0;   opacity: 0.65; }
          82%     { stroke-dashoffset:-500; opacity: 0;    }
          100%    { stroke-dashoffset: 500; opacity: 0;    }
        }

        /* ── Outer glow ring expand ── */
        @keyframes _ahRing {
          0%,100% { opacity: 0;   transform: scale(1);   }
          45%     { opacity: 0.3; transform: scale(2.2); }
          65%     { opacity: 0;   transform: scale(3);   }
        }

        /* ── SVG drop-shadow glow pulse ── */
        @keyframes _ahGlow {
          0%,100% { filter: drop-shadow(0 0 3px #60A5FA88); }
          50%     { filter: drop-shadow(0 0 10px #60A5FAcc) drop-shadow(0 0 22px #3B82F666); }
        }

        /* ── Radar scan line ── */
        @keyframes _ahScan {
          0%   { transform: translateY(0px);   opacity: 0; }
          4%   { opacity: 0.35; }
          96%  { opacity: 0.35; }
          100% { transform: translateY(320px); opacity: 0; }
        }

        /* ── Ambient floating dots ── */
        @keyframes _ahFloat {
          0%,100% { transform: translate(0,0)      scale(1);   opacity: 0.35; }
          33%     { transform: translate(5px,-8px)  scale(1.4); opacity: 0.9;  }
          66%     { transform: translate(-4px,4px)  scale(0.7); opacity: 0.2;  }
        }
      `}</style>

      {/* ── Ambient background particles ── */}
      {AMBIENT.map((p, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-blue-400"
          style={{
            left: p.x,
            top:  p.y,
            animation: `_ahFloat ${p.dur}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}

      {/* ── SVG constellation ── */}
      <svg
        viewBox="0 0 400 320"
        className="w-72 h-56 sm:w-80 sm:h-64"
        style={{ animation: `_ahGlow ${CYCLE}s ease-in-out infinite` }}
        aria-hidden
      >
        {/* Subtle grid backdrop */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#60A5FA" strokeWidth="0.15" opacity="0.25" />
          </pattern>
          <radialGradient id="vignette" cx="50%" cy="50%" r="55%">
            <stop offset="0%"   stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="white" stopOpacity="0.85" />
          </radialGradient>
        </defs>
        <rect width="400" height="320" fill="url(#grid)" />
        <rect width="400" height="320" fill="url(#vignette)" />

        {/* Radar scan line */}
        <line
          x1="0" y1="0" x2="400" y2="0"
          stroke="#60A5FA"
          strokeWidth="0.8"
          style={{ animation: `_ahScan 3.5s linear infinite` }}
        />

        {/* ── Edges ── */}
        {EDGES.map(([from, to], i) => {
          const a = nodeMap[from];
          const b = nodeMap[to];
          if (!a || !b) return null;
          return (
            <line
              key={`e${i}`}
              x1={a.x} y1={a.y}
              x2={b.x} y2={b.y}
              stroke="#60A5FA"
              strokeWidth="0.9"
              strokeLinecap="round"
              strokeDasharray="500"
              strokeDashoffset="500"
              style={{
                animation: `_ahLine ${CYCLE}s ease-in-out infinite`,
                animationDelay: `${i * 0.07}s`,
              }}
            />
          );
        })}

        {/* ── Nodes ── */}
        {NODES.map((node, i) => (
          <g
            key={node.id}
            style={{
              transformOrigin: `${node.x}px ${node.y}px`,
              animation: `_ahParticle ${CYCLE}s ease-in-out infinite`,
              animationDelay: `${i * 0.05}s`,
            }}
          >
            {/* Glow ring */}
            <circle
              cx={node.x} cy={node.y} r={5}
              fill="none"
              stroke="#93C5FD"
              strokeWidth="0.6"
              style={{
                transformOrigin: `${node.x}px ${node.y}px`,
                animation: `_ahRing ${CYCLE}s ease-in-out infinite`,
                animationDelay: `${i * 0.05 + 1.5}s`,
              }}
            />
            {/* Core dot */}
            <circle cx={node.x} cy={node.y} r={2.2} fill="#60A5FA" />
            {/* Bright center */}
            <circle cx={node.x} cy={node.y} r={1}   fill="#DBEAFE" />
          </g>
        ))}
      </svg>

      {/* ── Label ── */}
      <div className="mt-6 text-center z-10">
        <p className="text-sm font-semibold text-slate-400 tracking-wide">
          Select an aircraft
        </p>
        <p className="text-xs text-slate-300 mt-1 max-w-[240px] leading-relaxed">
          Choose from the roster to view details, or click&nbsp;
          <span className="font-semibold">+ Add Aircraft</span> to register a new one.
        </p>
      </div>
    </div>
  );
}
