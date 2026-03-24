'use client';

import { useState, useEffect } from 'react';

interface MacroRingProps {
  label: string;
  value: number;
  target: number;
  color: string;
  unit?: string;
}

export function MacroRing({ label, value, target, color, unit = 'g' }: MacroRingProps) {
  const size = 60;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const targetOffset = circumference * (1 - pct);

  // Start at empty, animate to real value after mount
  const [offset, setOffset] = useState(circumference);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOffset(targetOffset));
    return () => cancelAnimationFrame(id);
  }, [targetOffset]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="var(--border)" strokeWidth={strokeWidth}
          />
          {/* progress */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center font-medium"
          style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text)', fontSize: '0.6rem' }}
        >
          {value}{unit}
        </div>
      </div>
      <div className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
        {label}
      </div>
    </div>
  );
}
