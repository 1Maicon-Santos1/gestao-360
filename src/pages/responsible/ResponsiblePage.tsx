import { useState } from 'react'
import { Plus, Edit, Trash2, MoreHorizontal, UserCheck, Power } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useResponsible, useCreateResponsible, useUpdateResponsible, useDeleteResponsible, type Responsible } from '@/hooks/useResponsible'
import { cn } from '@/lib/utils'

const PERSON_TYPES: Record<string, string> = {
  partner: 'Sócio',
  employee: 'Colaborador',
  family: 'Familiar',
  other: 'Outro',
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6b7280',
]

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  person_type: z.enum(['partner', 'employee', 'family', 'other']),
  color: z.string().default('#f59e0b'),
  is_active: z.boolean().default(true),
})

type FormData = z.infer<typeof schema>

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function ResponsiblePage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Responsible | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: responsible = [], isLoading } = useResponsible()
  const create = useCreateResponsible()
  const update = useUpdateResponsible()
  const del = useDeleteResponsible()

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { person_type: 'partner', color: '#f59e0b', is_active: true },
  })

  const openCreate = () => {
    reset({ person_type: 'partner', color: '#f59e0b', is_active: true })
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (r: Responsible) => {
    setEditing(r)
    reset({ name: r.name, person_type: r.person_type, color: r.color, is_active: r.is_active })
    setDialogOpen(true)
  }

  const onSubmit = async (data: FormData) => {
    if (editing) await update.mutateAsync({ id: editing.id, ...data })
    else await create.mutateAsync({ ...data, avatar_url: null })
    setDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Responsáveis"
        description="Gerencie os responsáveis por gastos e movimentações"
        action={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Responsável
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : responsible.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="Nenhum responsável cadastrado"
          description="Adicione os responsáveis por gastos para melhor controle e relatórios."
          action={{ label: 'Novo Responsável', onClick: openCreate }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {responsible.map((r) => (
            <Card key={r.id} className={cn('hover:shadow-md transition-all', !r.is_active && 'opacity-60')}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-white text-sm font-bold"
                    style={{ backgroundColor: r.color }}
                  >
                    {getInitials(r.name)}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(r)} className="gap-2"><Edit className="h-4 w-4" /> Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => update.mutate({ id: r.id, is_active: !r.is_active })} className="gap-2">
                        <Power className="h-4 w-4" /> {r.is_active ? 'Desativar' : 'Ativar'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setDeleteId(r.id)} className="gap-2 text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" /> Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-3">
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{PERSON_TYPES[r.person_type]}</p>
                </div>
                <div className="mt-3">
                  <Badge variant={r.is_active ? 'default' : 'secondary'} className="text-xs">
                    {r.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar Responsável' : 'Novo Responsável'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Nome completo" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select value={watch('person_type')} onValueChange={(v) => setValue('person_type', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PERSON_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cor de identificação</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c} type="button" onClick={() => setValue('color', c)}
                    className={cn('h-7 w-7 rounded-full border-2', watch('color') === c ? 'border-foreground scale-110' : 'border-transparent')}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
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
        title="Excluir responsável?" description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir" destructive
        onConfirm={() => { if (deleteId) del.mutate(deleteId); setDeleteId(null) }}
      />
    </div>
  )
}
