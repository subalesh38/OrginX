interface Props {
  name: string
  size?: number
  className?: string
}

const PALETTE = ['#5B4FE9', '#4536D1', '#22C55E', '#FF6B57', '#4EA8FF', '#8B7FFF']

function colorFor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'F'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Avatar({ name, size = 48, className = '' }: Props) {
  const bg = colorFor(name || 'FitRight')
  return (
    <div
      className={`flex items-center justify-center rounded-full text-white font-display font-semibold shrink-0 ${className}`}
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}
    >
      {initialsFor(name || 'FitRight')}
    </div>
  )
}
