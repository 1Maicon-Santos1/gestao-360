import { Badge } from '@/components/ui/badge'
import { getStatusLabel, getStatusColor } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(getStatusColor(status), 'font-medium', className)}
    >
      {getStatusLabel(status)}
    </Badge>
  )
}
