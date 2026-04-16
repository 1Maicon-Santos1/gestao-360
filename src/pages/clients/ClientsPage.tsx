import { useState } from 'react'
import { Plus, Edit, Trash2, Search, MoreHorizontal, Users, Building2, User, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useClients, useCreateClient, useUpdateClient, useDeleteClient, type Client } from '@/hooks/useClients'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  client_type: z.enum(['individual', 'company']),
  trade_name: z.string().optional().nullable(),
  document: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')).nullable(),
  is_recurring: z.boolean().default(false),
  default_amount: z.number().optional().nullable(),
  due_day: z.number().min(1).max(31).optional().nullable(),
  service_description: z.string().optional().nullable(),
  origin: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
  notes: z.string().optional().nullable(),
})

type FormData = z.infer<typeof schema>

export default function ClientsPage() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: clients = [], isLoading } = useClients()
  const create = useCreateClient()
  const update = useUpdateClient()
  const del = useDeleteClient()

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { client_type: 'individual', status: 'active', is_recurring: false },
  })

  const openCreate = () => {
    reset({ client_type: 'individual', status: 'active', is_recurring: false })
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (c: Client) => {
    setEditing(c)
    reset({
      name: c.name, client_type: c.client_type, trade_name: c.trade_name,
      document: c.document, phone: c.phone, email: c.email,
      is_recurring: c.is_recurring, default_amount: c.default_amount,
      due_day: c.due_day, service_description: c.service_description,
      origin: c.origin, status: c.status, notes: c.notes,
    })
    setDialogOpen(true)
  }

  const onSubmit = async (data: FormData) => {
    const payload = { ...data, email: data.email || null, tags: null }
    if (editing) await update.mutateAsync({ id: editing.id, ...payload })
    else await create.mutateAsync(payload as any)
    setDialogOpen(false)
  }

  const filtered = clients.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Gerencie sua carteira de clientes"
        action={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Cliente
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-muted-foreground" /></button>}
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum cliente encontrado"
          description="Adicione seu primeiro cliente para começar a gerenciar seus recebimentos."
          action={{ label: 'Novo Cliente', onClick: openCreate }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.id} className={cn('hover:shadow-md transition-all', c.status === 'inactive' && 'opacity-60')}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      {c.client_type === 'company' ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.client_type === 'company' ? 'Empresa' : 'Pessoa Física'}
                        {c.is_recurring && ' · Recorrente'}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(c)} className="gap-2"><Edit className="h-4 w-4" /> Editar</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setDeleteId(c.id)} className="gap-2 text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" /> Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-3 space-y-1">
                  {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                  {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                </div>
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total recebido</p>
                    <p className="text-sm font-semibold text-green-600">{formatCurrency(c.total_received)}</p>
                  </div>
                  <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                    {c.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input placeholder="Nome do cliente" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={watch('client_type')} onValueChange={(v) => setValue('client_type', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Pessoa Física</SelectItem>
                    <SelectItem value="company">Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input placeholder="(11) 99999-9999" {...register('phone')} />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" placeholder="email@exemplo.com" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>CPF/CNPJ</Label>
                <Input placeholder="000.000.000-00" {...register('document')} />
              </div>
              <div className="space-y-1.5">
                <Label>Origem</Label>
                <Input placeholder="Ex: Indicação" {...register('origin')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Serviço / Produto contratado</Label>
              <Input placeholder="Descrição do serviço" {...register('service_description')} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Cliente recorrente</p>
                <p className="text-xs text-muted-foreground">Gera cobranças mensais automáticas</p>
              </div>
              <Switch
                checked={watch('is_recurring')}
                onCheckedChange={(v) => setValue('is_recurring', v)}
              />
            </div>
            {watch('is_recurring') && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Valor padrão (R$)</Label>
                  <Input type="number" step="0.01" placeholder="0,00" {...register('default_amount', { valueAsNumber: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Dia de vencimento</Label>
                  <Input type="number" min={1} max={31} placeholder="Ex: 10" {...register('due_day', { valueAsNumber: true })} />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea placeholder="Informações adicionais..." rows={3} {...register('notes')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : editing ? 'Salvar' : 'Criar cliente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Excluir cliente?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => { if (deleteId) del.mutate(deleteId); setDeleteId(null) }}
      />
    </div>
  )
}
