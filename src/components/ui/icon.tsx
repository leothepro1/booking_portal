import { cn } from "@/lib/utils"

interface IconProps {
  name: string
  size?: number
  fill?: boolean
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700
  className?: string
}

export function Icon({
  name,
  size = 24,
  fill = false,
  weight = 400,
  className,
}: IconProps): React.ReactElement {
  return (
    <span
      className={cn("material-symbols-outlined select-none leading-none", className)}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
      }}
    >
      {name}
    </span>
  )
}
