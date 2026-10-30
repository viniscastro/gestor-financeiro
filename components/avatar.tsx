export default function Avatar({
  name,
  image,
  className = 'h-9 w-9 text-sm',
}: {
  name?: string | null
  image?: string | null
  className?: string
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatares são data URLs ou imagens remotas
      <img
        src={image}
        alt={name ?? 'Avatar'}
        referrerPolicy="no-referrer"
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    )
  }

  const initials = name
    ? name
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?'

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900 font-bold text-brand-600 dark:text-brand-400 ${className}`}
    >
      {initials}
    </div>
  )
}
