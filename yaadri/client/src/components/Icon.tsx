const P: Record<string, string> = {
  play: 'M8 5v14l11-7z', games: 'M6 12h4M8 10v4M15 11h.01M18 13h.01M7 6h10a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4h-1.5l-2-2h-3l-2 2H7a4 4 0 0 1-4-4v-4a4 4 0 0 1 4-4z',
  talk: 'M4 5h16v11H9l-5 4z', memory: 'M12 3c-4 0-7 2.6-7 6.5 0 2 .9 3.3 1.8 4.4.7.9 1.2 1.6 1.2 2.6V18h8v-1.5c0-1 .5-1.7 1.2-2.6C18.1 12.8 19 11.5 19 9.5 19 5.6 16 3 12 3zM9 21h6',
  journey: 'M4 20c3-1 4-5 8-5s5 4 8 3M6 6l3 3m6-3l-3 3M12 3v4', more: 'M5 12h.01M12 12h.01M19 12h.01', globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  speaker: 'M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 0 1 0 7', 'speaker-off': 'M4 9v6h4l5 4V5L8 9zM17 9l4 6M21 9l-4 6',
  trophy: 'M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 21h8M9 18h6',
  family: 'M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 20v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2M3 9.5l9-6.5 9 6.5',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 1 2-2h13', help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6', gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3', x: 'M6 6l12 12M18 6L6 18',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3', pause: 'M8 5v14M16 5v14', stop: 'M6 6h12v12H6z',
  replay: 'M4 12a8 8 0 1 0 3-6.2M4 4v5h5', send: 'M4 12l16-8-6 16-3-7z', plus: 'M12 5v14M5 12h14', trash: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13',
  pencil: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3', heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.500-7 10-7 10z', check: 'M5 12l5 5 9-10',
  home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z', star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z', sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  camera: 'M4 8h4l2-3h4l2 3h4v11H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  chev: 'M9 6l6 6-6 6', back: 'M15 6l-6 6 6 6', info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5h.01',
}
export default function Icon({ name, size = 22, className, filled }: { name: keyof typeof P | string; size?: number; className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] ?? P.info} />
    </svg>
  )
}
