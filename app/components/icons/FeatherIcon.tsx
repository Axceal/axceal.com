// Icon representing Feather Light weight (stylised feather/pen nib).
// Stroke and fill both use `currentColor` for full color control.
export function FeatherIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      width="43"
      height="43"
      viewBox="0 0 43 43"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M22.8418 35.5025C23.368 35.5024 23.8891 35.3985 24.3751 35.1968C24.8611 34.9951 25.3025 34.6995 25.674 34.327L37.983 21.9881C40.2349 19.7374 41.5 16.6847 41.5 13.5017C41.5 10.3186 40.2349 7.26596 37.983 5.01521C35.7312 2.76446 32.6769 1.5 29.4923 1.5C26.3077 1.5 23.2535 2.76446 21.0016 5.01521L8.67259 17.3381C7.92233 18.0877 7.50071 19.1046 7.50049 20.1649V33.5034C7.50049 34.0336 7.71122 34.5421 8.08632 34.917C8.46143 35.2919 8.97018 35.5025 9.50065 35.5025H22.8418Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M29.5023 13.5117L1.5 41.5001"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32.5024 27.5059H15.501"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.1681 30.1646C11.6986 29.422 12.5144 28.934 13.4196 28.818L25.606 27.2556C28.249 26.9168 30.2827 29.5432 29.2931 32.0172C28.8063 33.2343 27.6789 34.0764 26.3737 34.1978L14.1403 35.3358C11.344 35.5959 9.53579 32.4499 11.1681 30.1646Z"
        fill="currentColor"
      />
    </svg>
  );
}
