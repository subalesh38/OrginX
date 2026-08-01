import Avatar from '../shared/Avatar'

interface Props {
  name: string
  subtitle?: string
}

export default function ProfileHeader({ name, subtitle = "Ready for today's workout?" }: Props) {
  const firstName = name.trim().split(/\s+/)[0] || 'there'
  return (
    <div className="flex items-center gap-3.5">
      <Avatar name={name} size={54} />
      <div className="min-w-0">
        <h1 className="font-display font-semibold text-xl text-ink truncate">Hello, {firstName}</h1>
        <p className="text-mist text-sm">{subtitle}</p>
      </div>
    </div>
  )
}
