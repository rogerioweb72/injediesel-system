import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, ...props }, ref) => (
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        'h-4 w-4 rounded border border-zinc-600 bg-zinc-800 accent-red-600 cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-zinc-900',
        className
      )}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  )
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
