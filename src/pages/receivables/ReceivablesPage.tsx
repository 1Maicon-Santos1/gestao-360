import { useState } from 'react'
import { Plus, Search, MoreHorizontal, Edit, Trash2, CheckCircle2, AlertCircle, Clock, TrendingUp, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  useTransactions, useCreateTransaction, useUpdateTransaction,
  useDeleteTransaction, useMarkAsPaid, type Transaction,
} from '@/hooks/useTransactions'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { useClients } from '@/hooks/useClients'
import { formatCurrency, formatDate, isOverdue } from '@/lib/formatters'
import { cn } from '@/lib/utils'

const TODAY = format(new Date(), 'yyyy-MM-dd')

const schema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().positive('Valor deve ser positivo'),
  competency_date: z.string().min(1),
  due_date: z.string().optional().nullable(),
  context_type: z.enum(['personal', 'business']),
  status: z.enum(['pending', 'paid', 'received', 'overdue', 'cancelled']),
  account_id: z.string().optional().nullable(),
  category_id: z.string().optional().nullable(),
  client_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

type FormData = z.infer<typeof schema>

export default function ReceivablesPage() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: transactions = [], isLoading } = useTransactions({ type: 'income' })
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const { data: clients = [] } = useClients()
  const create = useCreateTransaction()
  const update = useUpdateTransaction()
  const del = useDeleteTransaction()
  const markReceived = useMarkAsPaid()

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { context_type: 'business', status: 'pending', competency_date: TODAY, amount: 0 },
  })

  const openCreate = () => {
    reset({ context_type: 'business', status: 'pending', competency_date: TODAY, amount: 0 })
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (t: Transaction) => {
    setEditing(t)
    reset({
      description: t.description, amount: t.amount, competency_date: t.competency_date,
      due_date: t.due_date, context_type: t.context_type, status: t.status,
      account_id: t.account_id, category_id: t.category_id, client_id: t.client_id, notes: t.notes,
    })
    setDialogOpen(true)
  }

  const onSubmit = async (data: FormData) => {
    const payload = {
      ...data, transaction_type: 'income' as const,
      account_id: data.account_id || null, category_id: data.category_id || null,
      client_id: data.client_id || null, due_date: data.due_date || null, notes: data.notes || null,
      subcategory_id: null, supplier_id: null, responsible_person_id: null, cost_center_id: null,
      recurring_rule_id: null, installment_number: null, installment_total: null,
      settlement_date: null, tags: null, card_id: null, destination_account_id: null, payment_method: null,
    }
    if (editing) await update.mutateAsync({ id: editing.id, ...payload })
    else await create.mutateAsync(payload)
    setDialogOpen(false)
  }

  const filtered = transactions.filter((t) => {
    const matchSearch = !search || t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.client?.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || t.status === filterStatus
    return matchSearch && matchStatus
  })

  const totals = {
    pending: filtered.filter((t) => t.status === 'pending').reduce((s, t) => s + t.amount, 0),
    received: filtered.filter((t) => t.status === 'received').reduce((s, t) => s + t.amount, 0),
    overdue: filtered.filter((t) => isOverdue(t.due_date, t.status)).reduce((s, t) => s + t.amount, 0),
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a Receber"
        description="Acompanhe seus recebimentos e cobranças pendentes"
        action={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Conta a Receber
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-600" /><p className="text-xs text-amber-700 font-medium">Pendente</p></div>
            <p className="text-lg font-bold text-amber-700 mt-1 tabular-nums">{formatCurrency(totals.pending)}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-600" /><p className="text-xs text-red-700 font-medium">Atrasado</p></div>
            <p className="text-lg font-bold text-red-700 mt-1 tabular-nums">{formatCurrency(totals.overdue)}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /><p className="text-xs text-green-700 font-medium">Recebido</p></div>
            <p className="text-lg font-bold text-green-700 mt-1 tabular-nums">{formatCurrency(totals.received)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-muted-foreground" /></button>}
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="received">Recebido</SelectItem>
            <SelectItem value="overdue">Atrasado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Nenhuma conta a receber"
          description="Adicione suas cobranças e acompanhe seus recebimentos com facilidade."
          action={{ label: 'Nova Conta a Receber', onClick: openCreate }}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const overdue = isOverdue(t.due_date, t.status)
            return (
              <div
                key={t.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border bg-card p-4 hover:bg-muted/20 transition-colors',
                  overdue && 'border-red-200 bg-red-50/30',
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-sm">{t.description}</p>
                    {overdue && <Badge variant="destructive" className="text-xs">Atrasado</Badge>}
                    <StatusBadge status={t.status} className="text-xs" />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    {t.client && <p className="text-xs text-primary font-medium">{t.client.name}</p>}
                    <p className="text-xs text-muted-foreground">Competência: {formatDate(t.competency_date)}</p>
                    {t.due_date && <p className="text-xs text-muted-foreground">Vence: {formatDate(t.due_date)}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-base tabular-nums text-green-600">{formatCurrency(t.amount)}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {t.status === 'pending' && (
                        <DropdownMenuItem onClick={() => markReceived.mutate({ id: t.id, type: 'income' })} className="gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" /> Marcar como Recebido
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => openEdit(t)} className="gap-2"><Edit className="h-4 w-4" /> Editar</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setDeleteId(t.id)} className="gap-2 text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" /> Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Input placeholder="Ex: Mensalidade cliente X" {...register('description')} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" placeholder="0,00" {...register('amount', { valueAsNumber: true })} />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento</Label>
                <Input type="date" {...register('due_date')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Competência *</Label>
                <Input type="date" {...register('competency_date')} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={watch('status')} onValueChange={(v) => setValue('status', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="received">Recebido</SelectItem>
                    <SelectItem value="overdue">Atrasado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Select value={watch('client_id') ?? 'none'} onValueChange={(v) => setValue('client_id', v === 'none' ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem cliente</SelectItem>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Conta de destino</Label>
                <Select value={watch('account_id') ?? 'none'} onValueChange={(v) => setValue('account_id', v === 'none' ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem conta</SelectItem>
                    {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea placeholder="Informações adicionais..." rows={2} {...register('notes')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}
        title="Excluir conta a receber?" description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir" destructive
        onConfirm={() => { if (deleteId) del.mutate(deleteId); setDeleteId(null) }}
      />
    </div>
  )
}
