import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  return format(d, 'dd/MM/yyyy')
}

export function formatDateRelative(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  if (isToday(d)) return 'Hoje'
  if (isTomorrow(d)) return 'Amanhã'
  return format(d, 'dd/MM/yyyy')
}

export function formatDateTimeRelative(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR })
}

export function isOverdue(date: string | Date | null | undefined, status: string): boolean {
  if (!date || status === 'paid' || status === 'received' || status === 'cancelled') return false
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  return isPast(d) && !isToday(d)
}

type TransactionStatus = 'pending' | 'paid' | 'received' | 'overdue' | 'cancelled'

const STATUS_LABELS: Record<TransactionStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  received: 'Recebido',
  overdue: 'Atrasado',
  cancelled: 'Cancelado',
}

const STATUS_COLORS: Record<TransactionStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  paid: 'bg-green-100 text-green-800 border-green-200',
  received: 'bg-green-100 text-green-800 border-green-200',
  overdue: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status as TransactionStatus] ?? status
}

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status as TransactionStatus] ?? 'bg-gray-100 text-gray-600'
}

type TransactionType = 'income' | 'expense' | 'transfer'

const TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Entrada',
  expense: 'Saída',
  transfer: 'Transferência',
}

export function getTypeLabel(type: string): string {
  return TYPE_LABELS[type as TransactionType] ?? type
}

export function getTypeColor(type: string): string {
  if (type === 'income') return 'text-green-600'
  if (type === 'expense') return 'text-red-500'
  return 'text-blue-500'
}

export function getContextLabel(context: string): string {
  return context === 'personal' ? 'Pessoal' : 'Empresa'
}

export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}
