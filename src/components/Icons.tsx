import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function BrandLogo({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true" {...props}>
      <rect width="36" height="36" rx="10" fill="var(--brand-tile-bg)" />
      <rect
        x="0.75"
        y="0.75"
        width="34.5"
        height="34.5"
        rx="9.25"
        stroke="var(--brand-tile-border)"
        strokeWidth="1.5"
      />
      <path
        d="M8 24.5L14.2 17.8L18.8 21.2L27.5 11.5"
        stroke="#10B981"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21.8 11.5H27.5V17.2"
        stroke="#10B981"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="24.5" r="2.2" fill="#F59E0B" />
      <circle cx="14.2" cy="17.8" r="1.8" fill="#34D399" />
      <circle cx="18.8" cy="21.2" r="1.8" fill="#34D399" />
    </svg>
  );
}

export function StarIcon({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4" aria-hidden="true" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 1.5l1.95 4.12 4.55.62-3.32 3.18.82 4.52L8 11.76l-4 2.18.82-4.52L1.5 6.24l4.55-.62L8 1.5z"
      />
    </svg>
  );
}

export function ForkIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
    </svg>
  );
}

export function TrendUpIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 11.5l4-4 3 2.5 5-5.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 4.5H14V8" />
    </svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 8a5.5 5.5 0 1 1-1.45-3.73" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 2.5v3h-3" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M4.5 3.2a.6.6 0 0 1 .92-.5l7.2 4.8a.6.6 0 0 1 0 1l-7.2 4.8a.6.6 0 0 1-.92-.5V3.2z" />
    </svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true" {...props}>
      <rect x="4" y="3" width="2.8" height="10" rx="0.8" />
      <rect x="9.2" y="3" width="2.8" height="10" rx="0.8" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
      <circle cx="8" cy="8" r="3" />
      <path strokeLinecap="round" d="M8 1.5v1.3M8 13.2v1.3M1.5 8h1.3M13.2 8h1.3M3.4 3.4l.95.95M11.65 11.65l.95.95M12.6 3.4l-.95.95M4.35 11.65l-.95.95" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.4 9.9A5.5 5.5 0 0 1 6.1 2.6a5.5 5.5 0 1 0 7.3 7.3z" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
      <circle cx="7" cy="7" r="4.5" />
      <path strokeLinecap="round" d="M10.4 10.4L14 14" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
      <path strokeLinecap="round" d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" {...props}>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path strokeLinecap="round" d="M10.5 5.5V3.8A1.3 1.3 0 0 0 9.2 2.5H3.8A1.3 1.3 0 0 0 2.5 3.8v5.4a1.3 1.3 0 0 0 1.3 1.3h1.7" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.2 8.5l3 3 6.6-7" />
    </svg>
  );
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 3.5H3.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3M9.5 2.5h4v4M13.3 2.7L7.5 8.5" />
    </svg>
  );
}

export function BookmarkIcon({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 2.5h8a.8.8 0 0 1 .8.8v10.4L8 10.6l-4.8 3.1V3.3a.8.8 0 0 1 .8-.8z" />
    </svg>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" {...props}>
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
      <path strokeLinecap="round" d="M5.5 4h8.5M5.5 8h8.5M5.5 12h8.5M2.2 4h.6M2.2 8h.6M2.2 12h.6" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
    </svg>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M2.3 8h11.4M8 2c1.7 1.7 2.5 3.7 2.5 6S9.7 12.3 8 14C6.3 12.3 5.5 10.3 5.5 8S6.3 3.7 8 2z" />
    </svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <path strokeLinecap="round" d="M12 7.5v5.5M12 16.5h.01" />
    </svg>
  );
}
