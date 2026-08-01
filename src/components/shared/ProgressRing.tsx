interface Props {
  percent: number // 0-100
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  children?: React.ReactNode
}

export default function ProgressRing({
  percent,
  size = 64,
  strokeWidth = 7,
  color = '#5B4FE9',
  trackColor = '#EAEBF5',
  children,
}: Props) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, percent))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}
