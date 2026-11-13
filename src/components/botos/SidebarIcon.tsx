import type { ReactNode } from 'react';

const glyphs = {
  home: <>
    <path d="M4 14.5a4 4 0 0 1 1.4-3l7.8-6.8a4.2 4.2 0 0 1 5.6 0l7.8 6.8a4 4 0 0 1 1.4 3V24a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" />
    <g fill="var(--u4f-on-primary)">
      <circle cx="10.5" cy="16.5" r="1.9" />
      <circle cx="21.5" cy="16.5" r="1.9" />
      <path d="M13 28v-4.6a3 3 0 0 1 6 0V28Z" />
    </g>
  </>,
  market: <>
    <path d="M7 6h18a3 3 0 0 1 2.7 1.7l2.1 4.4a2.6 2.6 0 0 1-.6 3.1 4.8 4.8 0 0 1-6.6 0 4.8 4.8 0 0 1-6.6 0 4.8 4.8 0 0 1-6.6 0 4.8 4.8 0 0 1-6.6 0 2.6 2.6 0 0 1-.6-3.1l2.1-4.4A3 3 0 0 1 7 6Z" />
    <path d="M5 18.7a7 7 0 0 0 4.4-.9 7 7 0 0 0 6.6 0 7 7 0 0 0 6.6 0 7 7 0 0 0 4.4.9V24a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z" />
    <g fill="var(--u4f-on-primary)"><circle cx="10.5" cy="23" r="1.9" /><circle cx="21.5" cy="23" r="1.9" /></g>
  </>,
} satisfies Record<string, ReactNode>;

export default function SidebarIcon({ kind }: { kind: keyof typeof glyphs }) {
  return <svg className="bos-side-glyph" viewBox="0 0 32 32" width={24} height={24} fill="currentColor" aria-hidden="true">
    {glyphs[kind]}
  </svg>;
}
