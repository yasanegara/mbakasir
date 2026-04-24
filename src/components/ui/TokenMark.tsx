import type { CSSProperties } from "react";

interface TokenMarkProps {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}

export default function TokenMark({
  size = 24,
  className,
  style,
  strokeWidth = 2,
}: TokenMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      <text
        x="50%"
        y="53%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="8.5"
        fontWeight="800"
        fill="currentColor"
        fontFamily="inherit"
      >
        T.
      </text>
    </svg>
  );
}
