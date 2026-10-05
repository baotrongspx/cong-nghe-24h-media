// MC ảo vẽ bằng SVG (nửa người). Biến CSS do sân khấu cập nhật:
//   --m (0 → 1): độ mở miệng theo âm lượng giọng nói
//   lớp "dang-noi" trên phần tử cha: đang nói → tay phải làm cử chỉ, chân mày linh hoạt
export default function NhanVatAo({ mauAo = '#1e3a8a', chuHuyHieu = '24H' }: { mauAo?: string; chuHuyHieu?: string }) {
  return (
    <svg viewBox="0 0 400 600" className="nv-tho h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="nv-toc" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#4a2c20" />
          <stop offset="0.55" stopColor="#2b1913" />
          <stop offset="1" stopColor="#1a0f0b" />
        </linearGradient>
        <linearGradient id="nv-toc-sang" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a5a44" stopOpacity="0" />
          <stop offset="0.5" stopColor="#a87458" stopOpacity="0.55" />
          <stop offset="1" stopColor="#8a5a44" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="nv-da" cx="0.5" cy="0.42" r="0.62">
          <stop offset="0" stopColor="#ffe8d9" />
          <stop offset="0.75" stopColor="#f7cfb4" />
          <stop offset="1" stopColor="#eab496" />
        </radialGradient>
        <linearGradient id="nv-co" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfa587" />
          <stop offset="1" stopColor="#f2c3a6" />
        </linearGradient>
        <linearGradient id="nv-vest" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mauAo} />
          <stop offset="1" stopColor={mauAo} stopOpacity="0.88" />
        </linearGradient>
        <radialGradient id="nv-trong" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#8b5e3c" />
          <stop offset="0.6" stopColor="#4a2f1d" />
          <stop offset="1" stopColor="#24160d" />
        </radialGradient>
        <linearGradient id="nv-moi" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2566e" />
          <stop offset="1" stopColor="#c93a55" />
        </linearGradient>
      </defs>

      {/* Tóc sau (dài qua vai) */}
      <path
        d="M96 200 C82 92 160 38 214 42 C300 48 336 120 326 214 C322 300 336 370 352 430 C300 452 262 440 250 420 L150 420 C138 440 100 452 50 430 C70 370 92 300 96 200Z"
        fill="url(#nv-toc)"
      />

      {/* Thân: áo trong + vest */}
      <path d="M44 600 C40 500 70 446 150 424 L250 424 C330 446 360 500 356 600Z" fill="url(#nv-vest)" />
      <path d="M168 424 L200 520 L232 424Z" fill="#f8fafc" />
      <path d="M150 424 L200 520 L176 600 L132 600 C140 540 146 470 150 424Z" fill="#000" opacity="0.12" />
      <path d="M250 424 L200 520 L224 600 L268 600 C260 540 254 470 250 424Z" fill="#000" opacity="0.12" />
      {/* Ve áo */}
      <path d="M150 424 L184 470 L170 486 L200 520 L160 450Z" fill={mauAo} stroke="#fff" strokeOpacity="0.15" strokeWidth="2" />
      <path d="M250 424 L216 470 L230 486 L200 520 L240 450Z" fill={mauAo} stroke="#fff" strokeOpacity="0.15" strokeWidth="2" />
      {/* Huy hiệu shop */}
      <g transform="translate(244 500) rotate(-6)">
        <rect x="-26" y="-13" width="52" height="26" rx="7" fill="#fbbf24" />
        <text x="0" y="6" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1e293b" fontFamily="system-ui, sans-serif">
          {chuHuyHieu}
        </text>
      </g>

      {/* Cổ */}
      <path d="M170 330 L170 420 C186 438 214 438 230 420 L230 330Z" fill="url(#nv-co)" />
      <path d="M170 400 C186 416 214 416 230 400 L230 420 C214 438 186 438 170 420Z" fill="#000" opacity="0.06" />

      {/* Mặt */}
      <path d="M108 214 C106 136 150 104 200 104 C252 104 294 136 292 214 C290 282 252 338 200 340 C148 338 110 282 108 214Z" fill="url(#nv-da)" />

      {/* Tóc mái + tóc hai bên mặt */}
      <path
        d="M104 222 C96 130 150 84 212 86 C276 88 312 140 300 226 C296 186 280 160 262 148 C238 176 186 182 150 168 C132 186 116 204 104 222Z"
        fill="url(#nv-toc)"
      />
      <path d="M118 150 C150 112 220 100 270 132" stroke="url(#nv-toc-sang)" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M104 222 C98 280 108 340 128 380 C112 330 112 270 120 230Z" fill="url(#nv-toc)" />
      <path d="M296 222 C302 280 292 340 272 380 C288 330 288 270 280 230Z" fill="url(#nv-toc)" />

      {/* Chân mày (nhướng nhẹ theo giọng) */}
      <g className="nv-may">
        <path d="M138 194 Q160 180 184 186" stroke="#4a2c20" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M216 186 Q240 180 262 194" stroke="#4a2c20" strokeWidth="5" strokeLinecap="round" fill="none" />
      </g>

      {/* Mắt (chớp) */}
      <g className="nv-chop" style={{ transformOrigin: '200px 222px' }}>
        {[162, 238].map((cx) => (
          <g key={cx}>
            <path d={`M${cx - 22} 224 Q${cx} 204 ${cx + 22} 224 Q${cx} 238 ${cx - 22} 224Z`} fill="#fff" />
            <circle cx={cx + 1} cy="223" r="11" fill="url(#nv-trong)" />
            <circle cx={cx + 1} cy="223" r="5" fill="#120a06" />
            <circle cx={cx + 5} cy="218" r="3.4" fill="#fff" />
            <circle cx={cx - 3} cy="227" r="1.6" fill="#fff" opacity="0.8" />
            <path d={`M${cx - 24} 224 Q${cx} 200 ${cx + 24} 222`} stroke="#1f120c" strokeWidth="4.5" fill="none" strokeLinecap="round" />
            {/* Lông mi chĩa ra phía đuôi mắt */}
            <path d={cx < 200 ? `M${cx - 18} 214 l-7 -6 M${cx - 22} 219 l-8 -4` : `M${cx + 18} 214 l7 -6 M${cx + 22} 219 l8 -4`} stroke="#1f120c" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        ))}
      </g>

      {/* Mũi, má hồng */}
      <path d="M198 238 Q194 262 200 270 Q206 272 210 268" stroke="#d99b7c" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <ellipse cx="142" cy="270" rx="20" ry="11" fill="#fb7185" opacity="0.28" />
      <ellipse cx="258" cy="270" rx="20" ry="11" fill="#fb7185" opacity="0.28" />

      {/* Miệng: cười khi im lặng, mở theo --m khi nói */}
      <path className="nv-cuoi" d="M174 294 Q200 314 226 294" stroke="#c93a55" strokeWidth="6" strokeLinecap="round" fill="none" />
      <g className="nv-mieng" style={{ transform: 'scaleY(calc(var(--m, 0) * 1))', transformOrigin: '200px 292px' }}>
        <path d="M176 292 Q200 288 224 292 Q222 322 200 326 Q178 322 176 292Z" fill="#8f1d36" />
        <path d="M182 293 Q200 290 218 293 L216 301 Q200 299 184 301Z" fill="#fff" />
        <ellipse cx="200" cy="316" rx="13" ry="6" fill="#f472b6" />
        <path d="M174 292 Q200 284 226 292" stroke="url(#nv-moi)" strokeWidth="5" fill="none" strokeLinecap="round" />
      </g>

      {/* Tai nghe micro MC */}
      <path d="M108 206 C104 92 296 92 292 206" stroke="#111827" strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.9" />
      <rect x="96" y="196" width="22" height="44" rx="10" fill="#111827" />
      <path d="M110 238 C116 290 140 306 172 302" stroke="#111827" strokeWidth="5" fill="none" strokeLinecap="round" />
      <ellipse cx="176" cy="301" rx="8" ry="6.5" fill="#111827" />

      {/* Tay phải: giơ lên làm cử chỉ khi đang nói */}
      <g className="nv-tay" style={{ transformOrigin: '320px 470px' }}>
        <path d="M300 452 C330 452 352 420 350 380 L332 376 C330 404 318 424 296 430Z" fill="url(#nv-vest)" />
        <path d="M330 382 C326 360 334 344 344 340 C352 338 358 346 356 360 L360 340 C362 330 374 332 372 344 L368 372 C366 384 356 392 344 390Z" fill="url(#nv-da)" />
        <path d="M344 340 L346 326 C347 318 357 318 356 328 L354 352" fill="url(#nv-da)" />
      </g>

      <style>{`
        .nv-chop { animation: nv-chop 4.6s infinite; }
        @keyframes nv-chop { 0%, 93%, 100% { transform: scaleY(1); } 95.5% { transform: scaleY(0.06); } }
        .nv-tho { animation: nv-tho 5.5s ease-in-out infinite; transform-origin: 50% 100%; }
        @keyframes nv-tho { 0%, 100% { transform: rotate(-0.8deg) translateY(0) scale(1); } 50% { transform: rotate(0.8deg) translateY(-3px) scale(1.006); } }
        .nv-mieng { transition: transform 70ms linear; }
        .nv-cuoi { transition: opacity 120ms; }
        .dang-noi .nv-cuoi { opacity: 0.25; }
        .nv-may { transform: translateY(calc(var(--m, 0) * -4px)); transition: transform 90ms linear; }
        .nv-tay { transform: rotate(32deg) translateY(30px); opacity: 0; transition: transform 500ms cubic-bezier(.3,1.4,.6,1), opacity 300ms; }
        .dang-noi .nv-tay { transform: rotate(0deg); opacity: 1; animation: nv-tay 2.4s ease-in-out infinite 500ms; }
        @keyframes nv-tay { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-9deg); } }
      `}</style>
    </svg>
  )
}
