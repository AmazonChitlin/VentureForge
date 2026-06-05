import type { ReactNode } from "react";

export type BuilderIconName =
  | "arrow-left"
  | "arrow-right"
  | "check"
  | "chevron"
  | "clipboard"
  | "document"
  | "globe"
  | "help"
  | "layers"
  | "lightbulb"
  | "lock"
  | "pencil"
  | "refresh"
  | "spark"
  | "store"
  | "truck"
  | "user";

const paths: Record<BuilderIconName, ReactNode> = {
  "arrow-left": <path d="m15 18-6-6 6-6" />,
  "arrow-right": <path d="m9 18 6-6-6-6" />,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 10 3 3 3-3" />,
  clipboard: (
    <>
      <path d="M9 5h6" />
      <path d="M9 3h6v4H9z" />
      <path d="M7 5H5v16h14V5h-2" />
      <path d="M8 11h8M8 15h8" />
    </>
  ),
  document: (
    <>
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.7 9a2.4 2.4 0 0 1 4.7.7c0 1.8-2.4 2.1-2.4 3.8M12 17h.01" />
    </>
  ),
  layers: <path d="m12 3 9 5-9 5-9-5zm-7.5 9L12 16l7.5-4M4.5 16 12 20l7.5-4" />,
  lightbulb: (
    <>
      <path d="M9 18h6M10 22h4" />
      <path d="M8 14a6 6 0 1 1 8 0c-1.2.8-1 2.1-1 2H9s.2-1.2-1-2Z" />
    </>
  ),
  lock: (
    <>
      <rect width="14" height="11" x="5" y="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  pencil: <path d="m4 20 4.5-1L19 8.5 15.5 5 5 15.5zm9.5-13L17 10" />,
  refresh: <path d="M20 7v5h-5M4 17v-5h5M6.1 9A7 7 0 0 1 18 7l2 5M4 12l2 5a7 7 0 0 0 11.9-2" />,
  spark: <path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8zM19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7z" />,
  store: (
    <>
      <path d="M4 10v11h16V10M3 10l2-6h14l2 6" />
      <path d="M8 21v-6h8v6M3 10c0 2 4 2 4 0 0 2 5 2 5 0 0 2 5 2 5 0 0 2 4 2 4 0" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20c.8-3.6 3.1-5 7-5s6.2 1.4 7 5" />
    </>
  ),
};

export function BuilderIcon({
  name,
  size = 18,
  className = "",
}: {
  name: BuilderIconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
      width={size}
    >
      {paths[name]}
    </svg>
  );
}
