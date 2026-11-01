import React, { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, Clock } from 'lucide-react';

interface QrCodeViewProps {
  token: string;
  qrGeneratedAt: number;
  refreshIntervalSeconds?: number;
  sessionStartedAt: number;
  windowMinutes?: number;
  subjectName: string;
  sectionName: string;
  room: string;
  onCloseSession?: () => void;
}

export const QrCodeView: React.FC<QrCodeViewProps> = ({
  token,
  qrGeneratedAt,
  refreshIntervalSeconds = 5,
  sessionStartedAt,
  windowMinutes = 15,
  subjectName,
  sectionName,
  room,
  onCloseSession,
}) => {
  const [secondsRemainingInCycle, setSecondsRemainingInCycle] = useState(5);
  const [windowTimeRemaining, setWindowTimeRemaining] = useState('');
  const [windowExpired, setWindowExpired] = useState(false);

  useEffect(() => {
    const updateTimers = () => {
      const now = Date.now();
      
      // Cycle timer (5s)
      const msSinceGen = now - qrGeneratedAt;
      const cycleMs = refreshIntervalSeconds * 1000;
      const remCycle = Math.max(0, Math.ceil((cycleMs - (msSinceGen % cycleMs)) / 1000));
      setSecondsRemainingInCycle(remCycle === 0 ? 5 : remCycle);

      // 15-minute window timer
      const totalWindowMs = windowMinutes * 60 * 1000;
      const elapsedWindowMs = now - sessionStartedAt;
      const remWindowMs = totalWindowMs - elapsedWindowMs;

      if (remWindowMs <= 0) {
        setWindowExpired(true);
        setWindowTimeRemaining('00:00 (Window Closed)');
      } else {
        setWindowExpired(false);
        const mins = Math.floor(remWindowMs / 60000);
        const secs = Math.floor((remWindowMs % 60000) / 1000);
        setWindowTimeRemaining(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 250);
    return () => clearInterval(interval);
  }, [qrGeneratedAt, refreshIntervalSeconds, sessionStartedAt, windowMinutes]);

  // Generate deterministic grid pattern based on token string
  const gridSize = 21;
  const cells: boolean[][] = [];
  let seed = 0;
  for (let i = 0; i < token.length; i++) {
    seed = (seed * 31 + token.charCodeAt(i)) % 100000;
  }

  for (let r = 0; r < gridSize; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < gridSize; c++) {
      // Finder patterns (3 corners)
      const isTopLeft = r < 7 && c < 7;
      const isTopRight = r < 7 && c >= gridSize - 7;
      const isBottomLeft = r >= gridSize - 7 && c < 7;

      if (isTopLeft || isTopRight || isBottomLeft) {
        // Standard finder square pattern
        const lr = isTopLeft ? r : isTopRight ? r : r - (gridSize - 7);
        const lc = isTopLeft ? c : isTopRight ? c - (gridSize - 7) : c;
        const isBorder = lr === 0 || lr === 6 || lc === 0 || lc === 6;
        const isCenter = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
        row.push(isBorder || isCenter);
      } else {
        // Pseudo-random deterministic fill based on token seed
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        row.push(seed % 3 === 0);
      }
    }
    cells.push(row);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col items-center max-w-md mx-auto">
      {/* Session header */}
      <div className="w-full text-center pb-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900 text-lg">{subjectName}</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {sectionName} · {room} · Period Attendance
        </p>
      </div>

      {/* 15-Minute Window Indicator */}
      <div className="mt-4 flex items-center justify-between w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Clock className="w-4 h-4 text-indigo-600" />
          <span>Session Window:</span>
        </div>
        <span className={`font-mono font-medium ${windowExpired ? 'text-rose-600' : 'text-slate-900'}`}>
          {windowTimeRemaining}
        </span>
      </div>

      {/* Dynamic QR Display */}
      <div className="relative mt-5 p-4 bg-white rounded-xl border-2 border-indigo-100 shadow-inner">
        {windowExpired ? (
          <div className="w-64 h-64 flex flex-col items-center justify-center bg-slate-100 rounded-lg p-4 text-center">
            <span className="text-sm font-semibold text-slate-700">Attendance Window Closed</span>
            <span className="text-xs text-slate-500 mt-1">
              15 minutes have elapsed since session start. Scans are no longer accepted.
            </span>
          </div>
        ) : (
          <div className="relative">
            <svg
              className="w-64 h-64 select-none"
              viewBox="0 0 21 21"
              shapeRendering="crispEdges"
            >
              {cells.map((row, r) =>
                row.map((active, c) =>
                  active ? (
                    <rect
                      key={`${r}-${c}`}
                      x={c}
                      y={r}
                      width={1}
                      height={1}
                      fill="#0f172a"
                    />
                  ) : null
                )
              )}
            </svg>

            {/* Center security watermark badge */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 bg-white rounded-md border-2 border-indigo-600 flex items-center justify-center shadow-md">
                <ShieldCheck className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rotating cycle progress bar */}
      {!windowExpired && (
        <div className="w-full mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <div className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
              <span>Rotating dynamic QR code</span>
            </div>
            <span className="font-mono text-indigo-600 font-medium">
              Refreshes in {secondsRemainingInCycle}s
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300 ease-linear rounded-full"
              style={{ width: `${(secondsRemainingInCycle / refreshIntervalSeconds) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Dynamic Token Hash */}
      <div className="mt-4 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono text-slate-600 text-center w-full truncate">
        Token: {token}
      </div>

      {/* Close Session action */}
      {onCloseSession && (
        <button
          type="button"
          onClick={onCloseSession}
          className="mt-4 w-full py-2 px-4 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
        >
          Close Attendance Session Now
        </button>
      )}
    </div>
  );
};
