import { useState } from 'react'
import { Plus, Edit, Trash2, MoreHorizontal, FolderKanban, Power } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useCostCenters, useCreateCostCenter, useUpdateCostCenter, useDeleteCostCenter, type CostCenter } from '@/hooks/useCostCenters'
import { cn } from '@/lib/utils'

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6b7280',
]

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional().nullable(),
  color: z.string().default('#10b981'),
  is_active: z.boolean().default(true),
})

type FormData = z.infer<typeof schema>

export default function CostCentersPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CostCenter | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: costCenters = [], isLoading } = useCostCenters()
  const create = useCreateCostCenter()
  const update = useUpdateCostCenter()
  const del = useDeleteCostCenter()

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { color: '#10b981', is_active: true },
  })

  const openCreate = () => {
    reset({ color: '#10b981', is_active: true })
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (c: CostCenter) => {
    setEditing(c)
    reset({ name: c.name, description: c.description, color: c.color, is_active: c.is_active })
    setDialogOpen(true)
  }

  const onSubmit = async (data: FormData) => {
    if (editing) await update.mutateAsync({ id: editing.id, ...data })
    else await create.mutateAsync({ ...data, description: data.description ?? null })
    setDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centros de Custo"
        description="Organize gastos por projeto ou área"
        action={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Centro de Custo
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : costCenters.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Nenhum centro de custo"
          description="Crie centros de custo para organizar seus gastos por projeto, área ou departamento."
          action={{ label: 'Novo Centro de Custo', onClick: openCreate }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {costCenters.map((c) => (
            <Card key={c.id} className={cn('hover:shadow-md transition-all', !c.is_active && 'opacity-60')}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: c.color + '22', color: c.color }}
                    >
                      <FolderKanban className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{c.name}</p>
                      {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(c)} className="gap-2"><Edit className="h-4 w-4" /> Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => update.mutate({ id: c.id, is_active: !c.is_active })} className="gap-2">
                        <Power className="h-4 w-4" /> {c.is_active ? 'Desativar' : 'Ativar'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setDeleteId(c.id)} className="gap-2 text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" /> Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="h-1 flex-1 rounded-full mr-3" style={{ backgroundColor: c.color }} />
                  <Badge variant={c.is_active ? 'default' : 'secondary'} className="text-xs shrink-0">
                    {c.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Ex: Marketing Digital" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea placeholder="Descreva o propósito deste centro de custo..." rows={2} {...register('description')} />
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setValue('color', c)}
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
        title="Excluir centro de custo?" description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir" destructive
        onConfirm={() => { if (deleteId) del.mutate(deleteId); setDeleteId(null) }}
      />
    </div>
  )
}
