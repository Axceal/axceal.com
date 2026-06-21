// Icon representing battery / charging (battery body + lightning bolt).
// Gray body uses `currentColor`; lightning bolt stroke is always white for contrast.
// Use className for sizing (e.g. w-10 h-auto).
export function BatteryIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      width="42"
      height="30"
      viewBox="0 0 42 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Battery body fill */}
      <path
        d="M1 3C1 1.89543 1.89543 1 3 1H32V29H3C1.89543 29 1 28.1046 1 27V3Z"
        fill="currentColor"
      />
      {/* Battery outline + terminal nub */}
      <path
        d="M41 10.3333C41 9.92077 40.8378 9.5251 40.5495 9.2334C40.2609 8.94167 39.8695 8.77778 39.4615 8.77778H37.9231V4.11111C37.9231 3.28598 37.5988 2.49467 37.0218 1.91121C36.4449 1.32779 35.6622 1 34.8462 1H4.07692C3.26086 1 2.47825 1.32779 1.90121 1.91121C1.32418 2.49467 1 3.28598 1 4.11111V25.8889C1 26.714 1.32418 27.5054 1.90121 28.0888C2.47825 28.6721 3.26086 29 4.07692 29H34.8462C35.6622 29 36.4449 28.6721 37.0218 28.0888C37.5988 27.5054 37.9231 26.714 37.9231 25.8889V21.2222H39.4615C39.8695 21.2222 40.2609 21.0583 40.5495 20.7666C40.8378 20.4749 41 20.0792 41 19.6667V10.3333Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Lightning bolt — always white so it reads against the gray body */}
      <path
        d="M21.5445 7.71436L16.4438 14.6823H23.1153L19.4758 21.3103"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
