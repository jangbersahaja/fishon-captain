// same folder as page.tsx
type StarsProps = { value: number; size?: number };
export default function Stars({ value, size = 16 }: StarsProps) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const total = 5;

  return (
    <span
      className="align-middle"
      aria-label={`Rating ${value.toFixed(1)} out of 5`}
    >
      {Array.from({ length: total }, (_, i) => {
        const filled = i < full;
        const showHalf = !filled && i === full && half;
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="inline-block"
          >
            <defs>
              <linearGradient id={`half-${i}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <path
              d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
              fill={filled ? "#f59e0b" : showHalf ? `url(#half-${i})` : "none"}
              stroke="#f59e0b"
              strokeWidth="1"
            />
          </svg>
        );
      })}
    </span>
  );
}
