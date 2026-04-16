import { useState } from 'react'
import { Plus, Edit, Trash2, MoreHorizontal, Tag, ChevronRight, ChevronDown, Power } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
  useCreateSubcategory, useDeleteSubcategory,
  type Category, type Subcategory,
} from '@/hooks/useCategories'
import { cn } from '@/lib/utils'

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6b7280',
]

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  category_type: z.enum(['income', 'expense']),
  context_type: z.enum(['personal', 'business', 'both']),
  color: z.string().default('#6366f1'),
  is_active: z.boolean().default(true),
})

const subSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  category_id: z.string(),
})

type FormData = z.infer<typeof schema>
type SubFormData = z.infer<typeof subSchema>

function CategoryRow({ cat, onEdit, onDelete, onToggle, onAddSub }: {
  cat: Category & { subcategories: Subcategory[] }
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
  onAddSub: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const deleteSub = useDeleteSubcategory()

  return (
    <div className={cn('rounded-xl border overflow-hidden', !cat.is_active && 'opacity-60')}>
      <div className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: cat.color + '22', color: cat.color }}
        >
          <Tag className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{cat.name}</p>
            <Badge variant={cat.category_type === 'income' ? 'default' : 'secondary'} className="text-xs">
              {cat.category_type === 'income' ? 'Receita' : 'Despesa'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {cat.context_type === 'both' ? 'Pessoal e Empresa' : cat.context_type === 'personal' ? 'Pessoal' : 'Empresa'}
            {cat.subcategories.length > 0 && ` · ${cat.subcategories.length} subcategoria(s)`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {cat.subcategories.length > 0 && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onAddSub} className="text-xs hidden sm:flex">+ Subcat.</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit} className="gap-2"><Edit className="h-4 w-4" /> Editar</DropdownMenuItem>
              <DropdownMenuItem onClick={onAddSub} className="gap-2"><Plus className="h-4 w-4" /> Subcategoria</DropdownMenuItem>
              <DropdownMenuItem onClick={onToggle} className="gap-2"><Power className="h-4 w-4" /> {cat.is_active ? 'Desativar' : 'Ativar'}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" /> Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {expanded && cat.subcategories.length > 0 && (
        <div className="border-t bg-muted/10">
          {cat.subcategories.map((sub) => (
            <div key={sub.id} className="flex items-center justify-between px-4 py-2 text-sm border-b last:border-0">
              <div className="flex items-center gap-2 pl-4">
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sub.color ?? cat.color }} />
                <span>{sub.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => deleteSub.mutate(sub.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CategoriesPage() {
  const [tab, setTab] = useState<'expense' | 'income'>('expense')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [subDialogOpen, setSubDialogOpen] = useState(false)
  const [editing, setEditing] = useState<(Category & { subcategories: Subcategory[] }) | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(null)

  const { data: categories = [], isLoading } = useCategories()
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const del = useDeleteCategory()
  const createSub = useCreateSubcategory()

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category_type: 'expense', context_type: 'both', color: '#6366f1', is_active: true },
  })

  const subForm = useForm<SubFormData>({ resolver: zodResolver(subSchema) })

  const openCreate = () => {
    reset({ category_type: tab, context_type: 'both', color: '#6366f1', is_active: true })
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (c: Category & { subcategories: Subcategory[] }) => {
    setEditing(c)
    reset({ name: c.name, category_type: c.category_type, context_type: c.context_type, color: c.color, is_active: c.is_active })
    setDialogOpen(true)
  }

  const openAddSub = (categoryId: string) => {
    setParentCategoryId(categoryId)
    subForm.reset({ category_id: categoryId })
    setSubDialogOpen(true)
  }

  const onSubmit = async (data: FormData) => {
    if (editing) await update.mutateAsync({ id: editing.id, ...data })
    else await create.mutateAsync({ ...data, icon: null, is_fixed: false })
    setDialogOpen(false)
  }

  const onSubSubmit = async (data: SubFormData) => {
    await createSub.mutateAsync({ category_id: data.category_id, name: data.name })
    setSubDialogOpen(false)
  }

  const filtered = categories.filter((c) => c.category_type === tab)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorias"
        description="Organize suas finanças com categorias personalizadas"
        action={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Categoria
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="expense">Despesas</TabsTrigger>
          <TabsTrigger value="income">Receitas</TabsTrigger>
        </TabsList>

        {(['expense', 'income'] as const).map((type) => (
          <TabsContent key={type} value={type} className="mt-4">
            {isLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Tag}
                title={`Nenhuma categoria de ${type === 'expense' ? 'despesa' : 'receita'}`}
                description="Crie categorias para organizar melhor seus lançamentos."
                action={{ label: 'Nova Categoria', onClick: openCreate }}
              />
            ) : (
              <div className="space-y-2">
                {filtered.map((c) => (
                  <CategoryRow
                    key={c.id}
                    cat={c}
                    onEdit={() => openEdit(c)}
                    onDelete={() => setDeleteId(c.id)}
                    onToggle={() => update.mutate({ id: c.id, is_active: !c.is_active })}
                    onAddSub={() => openAddSub(c.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Category dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Ex: Marketing" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={watch('category_type')} onValueChange={(v) => setValue('category_type', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Despesa</SelectItem>
                    <SelectItem value="income">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Contexto</Label>
                <Select value={watch('context_type')} onValueChange={(v) => setValue('context_type', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Ambos</SelectItem>
                    <SelectItem value="personal">Pessoal</SelectItem>
                    <SelectItem value="business">Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

      {/* Subcategory dialog */}
      <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-sm">
          <DialogHeader><DialogTitle>Nova Subcategoria</DialogTitle></DialogHeader>
          <form onSubmit={subForm.handleSubmit(onSubSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Ex: Redes Sociais" {...subForm.register('name')} />
              {subForm.formState.errors.name && <p className="text-xs text-destructive">{subForm.formState.errors.name.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSubDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={subForm.formState.isSubmitting}>Criar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}
        title="Excluir categoria?" description="Subcategorias também serão excluídas. Esta ação não pode ser desfeita."
        confirmLabel="Excluir" destructive
        onConfirm={() => { if (deleteId) del.mutate(deleteId); setDeleteId(null) }}
      />
    </div>
  )
}
