'use client';

import type { DayName } from '@/lib/types';

const DAYS: DayName[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT: Record<DayName, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

interface DayTabsProps {
  activeDay: DayName;
  onSelect: (day: DayName) => void;
}

export function DayTabs({ activeDay, onSelect }: DayTabsProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {DAYS.map(day => {
        const active = day === activeDay;
        return (
          <button
            key={day}
            onClick={() => onSelect(day)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{
              background: active ? 'var(--accent)' : 'var(--surface)',
              color: active ? '#fff' : 'var(--text)',
              border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
              fontFamily: 'DM Mono, monospace',
            }}
          >
            {DAY_SHORT[day]}
          </button>
        );
      })}
    </div>
  );
}
