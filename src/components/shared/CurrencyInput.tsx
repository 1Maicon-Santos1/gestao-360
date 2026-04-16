import { forwardRef, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string
  onChange: (value: number) => void
  className?: string
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const internalRef = useRef<HTMLInputElement>(null)
    const inputRef = (ref as React.RefObject<HTMLInputElement>) || internalRef

    const formatDisplay = (val: number | string): string => {
      const num = typeof val === 'string' ? parseFloat(val) || 0 : val
      return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^\d]/g, '')
      const num = parseInt(raw || '0', 10) / 100
      onChange(num)
    }

    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.value = formatDisplay(value)
      }
    }, [value])

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
          R$
        </span>
        <Input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          defaultValue={formatDisplay(value)}
          onChange={handleChange}
          className={cn('pl-9', className)}
          {...props}
        />
      </div>
    )
  },
)

CurrencyInput.displayName = 'CurrencyInput'
