import { useState, useCallback } from 'react'
import {
  Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Copy,
  CheckCircle2, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight,
  X,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  useTransactions, useCreateTransaction, useUpdateTransaction,
  useDeleteTransaction, useMarkAsPaid, type Transaction, type TransactionFilters,
} from '@/hooks/useTransactions'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { useResponsible } from '@/hooks/useResponsible'
import { useClients } from '@/hooks/useClients'
import { formatCurrency, formatDate, getTypeColor, getTypeLabel } from '@/lib/formatters'
import { cn } from '@/lib/utils'

const schema = z.object({
  transaction_type: z.enum(['income', 'expense', 'transfer']),
  context_type: z.enum(['personal', 'business']),
  status: z.enum(['pending', 'paid', 'received', 'overdue', 'cancelled']),
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number({ invalid_type_error: 'Valor inválido' }).positive('Valor deve ser positivo'),
  competency_date: z.string().min(1, 'Data é obrigatória'),
  due_date: z.string().optional().nullable(),
  account_id: z.string().optional().nullable(),
  destination_account_id: z.string().optional().nullable(),
  category_id: z.string().optional().nullable(),
  responsible_person_id: z.string().optional().nullable(),
  client_id: z.string().optional().nullable(),
  payment_method: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

type FormData = z.infer<typeof schema>

const TODAY = format(new Date(), 'yyyy-MM-dd')
const MONTH_START = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd')
const MONTH_END = format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd')

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>({
    startDate: MONTH_START,
    endDate: MONTH_END,
  })
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: transactions = [], isLoading } = useTransactions({
    ...filters,
    search: search || undefined,
  })
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const { data: responsible = [] } = useResponsible()
  const { data: clients = [] } = useClients()

  const createMutation = useCreateTransaction()
  const updateMutation = useUpdateTransaction()
  const deleteMutation = useDeleteTransaction()
  const markAsPaid = useMarkAsPaid()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      transaction_type: 'expense',
      context_type: 'personal',
      status: 'pending',
      competency_date: TODAY,
      amount: 0,
    },
  })

  const txType = watch('transaction_type')

  const openCreate = useCallback(() => {
    reset({
      transaction_type: 'expense',
      context_type: 'personal',
      status: 'pending',
      competency_date: TODAY,
      amount: 0,
    })
    setEditing(null)
    setDialogOpen(true)
  }, [reset])

  const openEdit = useCallback((t: Transaction) => {
    setEditing(t)
    reset({
      transaction_type: t.transaction_type,
      context_type: t.context_type,
      status: t.status,
      description: t.description,
      amount: t.amount,
      competency_date: t.competency_date,
      due_date: t.due_date ?? null,
      account_id: t.account_id ?? null,
      destination_account_id: t.destination_account_id ?? null,
      category_id: t.category_id ?? null,
      responsible_person_id: t.responsible_person_id ?? null,
      client_id: t.client_id ?? null,
      payment_method: t.payment_method ?? null,
      notes: t.notes ?? null,
    })
    setDialogOpen(true)
  }, [reset])

  const onSubmit = async (data: FormData) => {
    const payload = {
      ...data,
      amount: data.amount,
      account_id: data.account_id || null,
      destination_account_id: data.destination_account_id || null,
      category_id: data.category_id || null,
      responsible_person_id: data.responsible_person_id || null,
      client_id: data.client_id || null,
      due_date: data.due_date || null,
      notes: data.notes || null,
      payment_method: data.payment_method || null,
      subcategory_id: null,
      supplier_id: null,
      cost_center_id: null,
      recurring_rule_id: null,
      installment_number: null,
      installment_total: null,
      settlement_date: null,
      tags: null,
      card_id: null,
    }
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    setDialogOpen(false)
  }

  const handleDuplicate = (t: Transaction) => {
    setEditing(null)
    reset({
      transaction_type: t.transaction_type,
      context_type: t.context_type,
      status: 'pending',
      description: `${t.description} (cópia)`,
      amount: t.amount,
      competency_date: TODAY,
      due_date: null,
      account_id: t.account_id ?? null,
      category_id: t.category_id ?? null,
      responsible_person_id: t.responsible_person_id ?? null,
      client_id: t.client_id ?? null,
      notes: t.notes ?? null,
    })
    setDialogOpen(true)
  }

  const typeIcon = (type: string) => {
    if (type === 'income') return <ArrowUpCircle className="h-4 w-4 text-green-500" />
    if (type === 'expense') return <ArrowDownCircle className="h-4 w-4 text-red-500" />
    return <ArrowLeftRight className="h-4 w-4 text-blue-500" />
  }

  const totals = {
    income: transactions.filter((t) => t.transaction_type === 'income').reduce((s, t) => s + t.amount, 0),
    expense: transactions.filter((t) => t.transaction_type === 'expense').reduce((s, t) => s + t.amount, 0),
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lançamentos"
        description="Controle de todas as movimentações"
        action={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Lançamento
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-green-700 font-medium">Entradas</p>
            <p className="text-lg font-bold text-green-700 tabular-nums">{formatCurrency(totals.income)}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-red-700 font-medium">Saídas</p>
            <p className="text-lg font-bold text-red-700 tabular-nums">{formatCurrency(totals.expense)}</p>
          </CardContent>
        </Card>
        <Card className={cn(
          totals.income - totals.expense >= 0
            ? 'bg-blue-50 border-blue-200'
            : 'bg-orange-50 border-orange-200',
        )}>
          <CardContent className="pt-4 pb-3 px-4">
            <p className={cn('text-xs font-medium', totals.income - totals.expense >= 0 ? 'text-blue-700' : 'text-orange-700')}>
              Resultado
            </p>
            <p className={cn('text-lg font-bold tabular-nums', totals.income - totals.expense >= 0 ? 'text-blue-700' : 'text-orange-700')}>
              {formatCurrency(totals.income - totals.expense)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar lançamentos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Input
          type="date"
          value={filters.startDate || ''}
          onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
          className="w-36"
        />
        <Input
          type="date"
          value={filters.endDate || ''}
          onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
          className="w-36"
        />
        <Select
          value={filters.type || 'all'}
          onValueChange={(v) => setFilters((f) => ({ ...f, type: v as any }))}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="income">Entradas</SelectItem>
            <SelectItem value="expense">Saídas</SelectItem>
            <SelectItem value="transfer">Transferências</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.context || 'all'}
          onValueChange={(v) => setFilters((f) => ({ ...f, context: v as any }))}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Contexto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Pessoal e Empresa</SelectItem>
            <SelectItem value="personal">Pessoal</SelectItem>
            <SelectItem value="business">Empresa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="Nenhum lançamento encontrado"
          description="Você ainda não tem lançamentos neste período. Clique em Novo Lançamento para começar."
          action={{ label: 'Novo Lançamento', onClick: openCreate }}
        />
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-8"></TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden md:table-cell">Data</TableHead>
                <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                <TableHead className="hidden lg:table-cell">Conta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id} className="group">
                  <TableCell>{typeIcon(t.transaction_type)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{t.description}</p>
                      <p className="text-xs text-muted-foreground md:hidden">{formatDate(t.competency_date)}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {formatDate(t.competency_date)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {t.category ? (
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: t.category.color }} />
                        <span className="text-sm text-muted-foreground">{t.category.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {t.account?.name ?? '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn('font-semibold tabular-nums text-sm', getTypeColor(t.transaction_type))}>
                      {t.transaction_type === 'expense' ? '−' : '+'}{formatCurrency(t.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {t.status === 'pending' && (
                          <DropdownMenuItem
                            onClick={() => markAsPaid.mutate({ id: t.id, type: t.transaction_type as 'income' | 'expense' })}
                            className="gap-2"
                          >
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            Marcar como {t.transaction_type === 'income' ? 'Recebido' : 'Pago'}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => openEdit(t)} className="gap-2">
                          <Edit className="h-4 w-4" />Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(t)} className="gap-2">
                          <Copy className="h-4 w-4" />Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteId(t.id)}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Type + Context row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select
                  value={watch('transaction_type')}
                  onValueChange={(v) => setValue('transaction_type', v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Entrada</SelectItem>
                    <SelectItem value="expense">Saída</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Contexto *</Label>
                <Select
                  value={watch('context_type')}
                  onValueChange={(v) => setValue('context_type', v as any)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Pessoal</SelectItem>
                    <SelectItem value="business">Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Input placeholder="Ex: Aluguel do escritório" {...register('description')} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            {/* Amount + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  {...register('amount', { valueAsNumber: true })}
                />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Data de competência *</Label>
                <Input type="date" {...register('competency_date')} />
                {errors.competency_date && <p className="text-xs text-destructive">{errors.competency_date.message}</p>}
              </div>
            </div>

            {/* Due date + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Vencimento</Label>
                <Input type="date" {...register('due_date')} />
              </div>
              <div className="space-y-1.5">
                <Label>Status *</Label>
                <Select
                  value={watch('status')}
                  onValueChange={(v) => setValue('status', v as any)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="received">Recebido</SelectItem>
                    <SelectItem value="overdue">Atrasado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Account */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{txType === 'transfer' ? 'Conta de Origem' : 'Conta'}</Label>
                <Select
                  value={watch('account_id') ?? 'none'}
                  onValueChange={(v) => setValue('account_id', v === 'none' ? null : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem conta</SelectItem>
                    {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {txType === 'transfer' ? (
                <div className="space-y-1.5">
                  <Label>Conta de Destino</Label>
                  <Select
                    value={watch('destination_account_id') ?? 'none'}
                    onValueChange={(v) => setValue('destination_account_id', v === 'none' ? null : v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem conta</SelectItem>
                      {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select
                    value={watch('category_id') ?? 'none'}
                    onValueChange={(v) => setValue('category_id', v === 'none' ? null : v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem categoria</SelectItem>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Responsible + Client */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Responsável</Label>
                <Select
                  value={watch('responsible_person_id') ?? 'none'}
                  onValueChange={(v) => setValue('responsible_person_id', v === 'none' ? null : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem responsável</SelectItem>
                    {responsible.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Select
                  value={watch('client_id') ?? 'none'}
                  onValueChange={(v) => setValue('client_id', v === 'none' ? null : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem cliente</SelectItem>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea placeholder="Informações adicionais..." rows={3} {...register('notes')} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar lançamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Excluir lançamento?"
        description="Esta ação não poderá ser desfeita. O lançamento será removido permanentemente."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId)
          setDeleteId(null)
        }}
      />
    </div>
  )
}
