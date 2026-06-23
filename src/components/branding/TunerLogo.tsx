type TunerLogoProps = {
  className?: string
  style?: React.CSSProperties
}

export function TunerLogo({ className, style }: TunerLogoProps) {
  return (
    <img
      src="/tuner-logo.svg"
      alt="Injediesel System"
      className={className}
      style={style}
      draggable={false}
    />
  )
}
