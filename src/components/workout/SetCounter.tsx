interface Props {
  value: number
  target: number
}

export default function SetCounter({ value, target }: Props) {
  return (
    <div className="card p-4 flex flex-col items-center justify-center">
      <span className="text-mist text-[11px] font-medium uppercase tracking-wide mb-1">Sets</span>
      <span className="odometer text-4xl font-bold text-success leading-none">{String(value).padStart(2, '0')}</span>
      <span className="text-mist text-xs mt-1.5">of {target}</span>
    </div>
  )
}
