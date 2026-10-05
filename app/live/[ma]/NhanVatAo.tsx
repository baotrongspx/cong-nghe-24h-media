// MC ảo vẽ bằng SVG. Độ mở miệng lấy từ biến CSS --m (0 → 1) do sân khấu cập nhật theo âm lượng giọng nói.
export default function NhanVatAo({ mauAo = '#2563eb' }: { mauAo?: string }) {
  return (
    <svg viewBox="0 0 400 520" className="nv-lac h-full w-full drop-shadow-2xl" aria-hidden>
      <defs>
        <linearGradient id="nv-toc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b2219" />
          <stop offset="1" stopColor="#1f120d" />
        </linearGradient>
        <linearGradient id="nv-da" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde2cf" />
          <stop offset="1" stopColor="#f5c9ab" />
        </linearGradient>
        <linearGradient id="nv-ao" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mauAo} />
          <stop offset="1" stopColor={mauAo} stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {/* Tóc phía sau */}
      <path d="M92 210 C80 90 170 40 220 48 C320 60 335 160 318 250 C312 330 300 380 286 410 L118 410 C100 370 92 300 92 210Z" fill="url(#nv-toc)" />

      {/* Vai, áo */}
      <path d="M40 520 C44 440 110 400 160 392 L240 392 C290 400 356 440 360 520Z" fill="url(#nv-ao)" />
      <path d="M168 392 L200 440 L232 392" fill="#fff" opacity="0.9" />
      {/* Cổ */}
      <path d="M172 330 L172 395 C185 410 215 410 228 395 L228 330Z" fill="#f2c2a2" />

      {/* Mặt */}
      <ellipse cx="200" cy="222" rx="96" ry="112" fill="url(#nv-da)" />
      {/* Tai + bông tai */}
      <ellipse cx="106" cy="232" rx="14" ry="22" fill="#f4c6a6" />
      <ellipse cx="294" cy="232" rx="14" ry="22" fill="#f4c6a6" />
      <circle cx="104" cy="262" r="6" fill="#fbbf24" />
      <circle cx="296" cy="262" r="6" fill="#fbbf24" />

      {/* Tóc mái */}
      <path d="M104 200 C100 120 160 92 214 96 C270 100 306 140 298 206 C278 160 236 140 196 150 C160 158 128 176 104 200Z" fill="url(#nv-toc)" />

      {/* Lông mày */}
      <path d="M140 182 Q162 170 182 180" stroke="#3b2219" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M218 180 Q238 170 260 182" stroke="#3b2219" strokeWidth="6" strokeLinecap="round" fill="none" />

      {/* Mắt (chớp) */}
      <g className="nv-chop" style={{ transformOrigin: '200px 214px' }}>
        <ellipse cx="162" cy="214" rx="17" ry="20" fill="#fff" />
        <ellipse cx="238" cy="214" rx="17" ry="20" fill="#fff" />
        <circle cx="164" cy="217" r="12" fill="#3b2a20" />
        <circle cx="240" cy="217" r="12" fill="#3b2a20" />
        <circle cx="168" cy="211" r="4" fill="#fff" />
        <circle cx="244" cy="211" r="4" fill="#fff" />
      </g>

      {/* Má hồng, mũi */}
      <ellipse cx="140" cy="262" rx="18" ry="10" fill="#fb7185" opacity="0.35" />
      <ellipse cx="260" cy="262" rx="18" ry="10" fill="#fb7185" opacity="0.35" />
      <path d="M196 240 Q200 256 206 252" stroke="#d9987a" strokeWidth="4" strokeLinecap="round" fill="none" />

      {/* Miệng: mở theo --m */}
      <g style={{ transform: 'scaleY(calc(0.14 + var(--m, 0) * 0.86))', transformOrigin: '200px 286px', transition: 'transform 60ms linear' }}>
        <ellipse cx="200" cy="292" rx="26" ry="20" fill="#9f1239" />
        <rect x="182" y="272" width="36" height="9" rx="4" fill="#fff" />
        <ellipse cx="200" cy="304" rx="15" ry="8" fill="#fb7185" />
      </g>
      <path d="M172 286 Q200 280 228 286" stroke="#be123c" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.7" />

      {/* Tai nghe + micro của MC */}
      <path d="M100 210 C96 96 304 96 300 210" stroke="#111827" strokeWidth="10" fill="none" strokeLinecap="round" />
      <rect x="86" y="200" width="26" height="50" rx="12" fill="#111827" />
      <rect x="288" y="200" width="26" height="50" rx="12" fill="#111827" />
      <path d="M104 246 C110 300 140 312 176 304" stroke="#111827" strokeWidth="6" fill="none" strokeLinecap="round" />
      <ellipse cx="182" cy="303" rx="10" ry="8" fill="#111827" />

      <style>{`
        .nv-chop { animation: nv-chop 4.2s infinite; }
        @keyframes nv-chop { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.08); } }
        .nv-lac { animation: nv-lac 6s ease-in-out infinite; transform-origin: 50% 100%; }
        @keyframes nv-lac { 0%, 100% { transform: rotate(-1.2deg) translateY(0); } 50% { transform: rotate(1.2deg) translateY(-4px); } }
      `}</style>
    </svg>
  )
}
