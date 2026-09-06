import React from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
  fullPage?: boolean;
  size?: number;
  label?: string;
}

export function Spinner({ fullPage = false, size = 24, label = 'Loading…' }: Props) {
  if (fullPage) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          color: 'var(--color-text-tertiary)',
        }}
        aria-label={label}
        role="status"
      >
        <Loader2 size={36} className="spin" />
        <span style={{ fontSize: 'var(--text-sm)' }}>{label}</span>
      </div>
    );
  }

  return (
    <Loader2
      size={size}
      className="spin"
      aria-label={label}
      role="status"
      style={{ color: 'var(--color-primary)' }}
    />
  );
}
