import { GUIDE_NAME } from "../content/paths";

// Nara's mark: a lens with its focus point, the lab's one recurring figure.
export function GuideMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      className="guide-mark"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
    >
      <circle
        cx="20"
        cy="20"
        r="18.5"
        fill="#173a3a"
        stroke="#8ce3ca"
        strokeWidth="1.5"
      />
      <circle
        cx="20"
        cy="20"
        r="10.5"
        fill="none"
        stroke="#8ce3ca"
        strokeWidth="1.5"
      />
      <circle cx="23.5" cy="17" r="3.5" fill="#f7c782" />
    </svg>
  );
}
export function GuideName({ label }: { label?: string }) {
  return (
    <small className="guide-name">
      {GUIDE_NAME}
      {label ? ` · ${label}` : " · pemandu lab"}
    </small>
  );
}
