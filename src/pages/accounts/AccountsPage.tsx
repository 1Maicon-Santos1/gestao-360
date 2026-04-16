import { useState } from 'react'
import { Plus, Edit, Trash2, MoreHorizontal, Wallet, CreditCard as CreditCardIcon, Power } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  useAccounts, useCreditCards,
  useCreateAccount, useUpdateAccount, useDeleteAccount,
  useCreateCreditCard, useUpdateCreditCard, useDeleteCreditCard,
  type Account, type CreditCard,
} from '@/hooks/useAccounts'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'

const ACCOUNT_TYPES: Record<string, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  cash: 'Dinheiro',
  digital: 'Conta Digital',
  investment: 'Investimento',
  other: 'Outro',
}

const accountSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  account_type: z.enum(['checking', 'savings', 'cash', 'digital', 'investment', 'other']),
  context_type: z.enum(['personal', 'business']),
  institution: z.string().optional().nullable(),
  initial_balance: z.number().default(0),
  color: z.string().default('#6366f1'),
  is_active: z.boolean().default(true),
  notes: z.string().optional().nullable(),
})

const cardSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  context_type: z.enum(['personal', 'business']),
  institution: z.string().optional().nullable(),
  credit_limit: z.number().default(0),
  closing_day: z.number().min(1).max(31).optional().nullable(),
  due_day: z.number().min(1).max(31).optional().nullable(),
  color: z.string().default('#8b5cf6'),
  is_active: z.boolean().default(true),
})

type AccountForm = z.infer<typeof accountSchema>
type CardForm = z.infer<typeof cardSchema>

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6b7280',
]

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            'h-7 w-7 rounded-full border-2 transition-transform',
            value === c ? 'border-foreground scale-110' : 'border-transparent',
          )}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  )
}

function AccountCard({ account, onEdit, onDelete, onToggle }: {
  account: Account
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  return (
    <Card className={cn('transition-all', !account.is_active && 'opacity-50')}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: account.color + '22', color: account.color }}
            >
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{account.name}</p>
              <p className="text-xs text-muted-foreground">
                {ACCOUNT_TYPES[account.account_type]} · {account.context_type === 'personal' ? 'Pessoal' : 'Empresa'}
              </p>
              {account.institution && (
                <p className="text-xs text-muted-foreground">{account.institution}</p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit} className="gap-2">
                <Edit className="h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggle} className="gap-2">
                <Power className="h-4 w-4" /> {account.is_active ? 'Desativar' : 'Ativar'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-4 pt-3 border-t">
          <p className="text-xs text-muted-foreground">Saldo atual</p>
          <p className={cn('text-xl font-bold tabular-nums', account.current_balance < 0 ? 'text-red-500' : 'text-foreground')}>
            {formatCurrency(account.current_balance)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function CardItem({ card, onEdit, onDelete, onToggle }: {
  card: CreditCard
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const usedPercent = card.credit_limit > 0
    ? Math.round(((card.credit_limit - card.available_limit) / card.credit_limit) * 100)
    : 0

  return (
    <Card className={cn('transition-all', !card.is_active && 'opacity-50')}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: card.color + '22', color: card.color }}
            >
              <CreditCardIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{card.name}</p>
              <p className="text-xs text-muted-foreground">
                {card.institution ?? 'Cartão de crédito'} · {card.context_type === 'personal' ? 'Pessoal' : 'Empresa'}
              </p>
              {card.due_day && (
                <p className="text-xs text-muted-foreground">Vence dia {card.due_day}</p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit} className="gap-2">
                <Edit className="h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggle} className="gap-2">
                <Power className="h-4 w-4" /> {card.is_active ? 'Desativar' : 'Ativar'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-4 pt-3 border-t space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Limite disponível</span>
            <span>{usedPercent}% usado</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${usedPercent}%`, backgroundColor: card.color }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-green-600 font-medium">{formatCurrency(card.available_limit)} disponível</span>
            <span className="text-muted-foreground">{formatCurrency(card.credit_limit)} limite</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AccountsPage() {
  const { data: accounts = [], isLoading: loadingAccounts } = useAccounts()
  const { data: cards = [], isLoading: loadingCards } = useCreditCards()

  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const deleteAccount = useDeleteAccount()
  const createCard = useCreateCreditCard()
  const updateCard = useUpdateCreditCard()
  const deleteCard = useDeleteCreditCard()

  const [accountDialog, setAccountDialog] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [cardDialog, setCardDialog] = useState(false)
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'account' | 'card'; id: string } | null>(null)

  const accountForm = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: { account_type: 'checking', context_type: 'personal', color: '#6366f1', is_active: true, initial_balance: 0 },
  })
  const cardForm = useForm<CardForm>({
    resolver: zodResolver(cardSchema),
    defaultValues: { context_type: 'personal', color: '#8b5cf6', is_active: true, credit_limit: 0 },
  })

  const openAccountCreate = () => {
    accountForm.reset({ account_type: 'checking', context_type: 'personal', color: '#6366f1', is_active: true, initial_balance: 0 })
    setEditingAccount(null)
    setAccountDialog(true)
  }

  const openAccountEdit = (a: Account) => {
    setEditingAccount(a)
    accountForm.reset({
      name: a.name, account_type: a.account_type, context_type: a.context_type,
      institution: a.institution, initial_balance: a.initial_balance, color: a.color,
      is_active: a.is_active, notes: a.notes,
    })
    setAccountDialog(true)
  }

  const openCardCreate = () => {
    cardForm.reset({ context_type: 'personal', color: '#8b5cf6', is_active: true, credit_limit: 0 })
    setEditingCard(null)
    setCardDialog(true)
  }

  const openCardEdit = (c: CreditCard) => {
    setEditingCard(c)
    cardForm.reset({
      name: c.name, context_type: c.context_type, institution: c.institution,
      credit_limit: c.credit_limit, closing_day: c.closing_day, due_day: c.due_day,
      color: c.color, is_active: c.is_active,
    })
    setCardDialog(true)
  }

  const onAccountSubmit = async (data: AccountForm) => {
    if (editingAccount) {
      await updateAccount.mutateAsync({ id: editingAccount.id, ...data })
    } else {
      await createAccount.mutateAsync(data as any)
    }
    setAccountDialog(false)
  }

  const onCardSubmit = async (data: CardForm) => {
    const payload = {
      ...data,
      available_limit: data.credit_limit,
      payment_account_id: null,
      best_purchase_day: null,
    }
    if (editingCard) {
      await updateCard.mutateAsync({ id: editingCard.id, ...payload })
    } else {
      await createCard.mutateAsync(payload as any)
    }
    setCardDialog(false)
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    if (deleteTarget.type === 'account') deleteAccount.mutate(deleteTarget.id)
    else deleteCard.mutate(deleteTarget.id)
    setDeleteTarget(null)
  }

  const totalBalance = accounts.filter((a) => a.is_active).reduce((s, a) => s + a.current_balance, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas e Cartões"
        description="Gerencie suas contas bancárias e cartões de crédito"
      />

      {/* Balance summary */}
      <div className="rounded-xl bg-gradient-to-r from-primary to-primary/80 p-5 text-white">
        <p className="text-sm opacity-80">Saldo total consolidado</p>
        <p className="text-4xl font-bold mt-1 tabular-nums">{formatCurrency(totalBalance)}</p>
        <p className="text-xs opacity-60 mt-1">{accounts.filter((a) => a.is_active).length} conta(s) ativa(s)</p>
      </div>

      <Tabs defaultValue="accounts">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="accounts" className="gap-2">
              <Wallet className="h-4 w-4" /> Contas ({accounts.length})
            </TabsTrigger>
            <TabsTrigger value="cards" className="gap-2">
              <CreditCardIcon className="h-4 w-4" /> Cartões ({cards.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="accounts" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={openAccountCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Nova Conta
            </Button>
          </div>
          {loadingAccounts ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          ) : accounts.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Nenhuma conta cadastrada"
              description="Adicione suas contas bancárias para controlar seu saldo e movimentações."
              action={{ label: 'Nova Conta', onClick: openAccountCreate }}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((a) => (
                <AccountCard
                  key={a.id}
                  account={a}
                  onEdit={() => openAccountEdit(a)}
                  onDelete={() => setDeleteTarget({ type: 'account', id: a.id })}
                  onToggle={() => updateAccount.mutate({ id: a.id, is_active: !a.is_active })}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cards" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={openCardCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Cartão
            </Button>
          </div>
          {loadingCards ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
            </div>
          ) : cards.length === 0 ? (
            <EmptyState
              icon={CreditCardIcon}
              title="Nenhum cartão cadastrado"
              description="Adicione seus cartões de crédito para controlar seus gastos e faturas."
              action={{ label: 'Novo Cartão', onClick: openCardCreate }}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((c) => (
                <CardItem
                  key={c.id}
                  card={c}
                  onEdit={() => openCardEdit(c)}
                  onDelete={() => setDeleteTarget({ type: 'card', id: c.id })}
                  onToggle={() => updateCard.mutate({ id: c.id, is_active: !c.is_active })}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Account Dialog */}
      <Dialog open={accountDialog} onOpenChange={setAccountDialog}>
        <DialogContent aria-describedby={undefined} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome da conta *</Label>
              <Input placeholder="Ex: Nubank PJ" {...accountForm.register('name')} />
              {accountForm.formState.errors.name && (
                <p className="text-xs text-destructive">{accountForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select
                  value={accountForm.watch('account_type')}
                  onValueChange={(v) => accountForm.setValue('account_type', v as any)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Contexto *</Label>
                <Select
                  value={accountForm.watch('context_type')}
                  onValueChange={(v) => accountForm.setValue('context_type', v as any)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Pessoal</SelectItem>
                    <SelectItem value="business">Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Banco / Instituição</Label>
                <Input placeholder="Ex: Nubank" {...accountForm.register('institution')} />
              </div>
              <div className="space-y-1.5">
                <Label>Saldo inicial (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  {...accountForm.register('initial_balance', { valueAsNumber: true })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Cor de identificação</Label>
              <ColorPicker
                value={accountForm.watch('color')}
                onChange={(c) => accountForm.setValue('color', c)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAccountDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={accountForm.formState.isSubmitting}>
                {accountForm.formState.isSubmitting ? 'Salvando...' : editingAccount ? 'Salvar' : 'Criar conta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Card Dialog */}
      <Dialog open={cardDialog} onOpenChange={setCardDialog}>
        <DialogContent aria-describedby={undefined} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Editar Cartão' : 'Novo Cartão'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={cardForm.handleSubmit(onCardSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome do cartão *</Label>
              <Input placeholder="Ex: Nubank Black" {...cardForm.register('name')} />
              {cardForm.formState.errors.name && (
                <p className="text-xs text-destructive">{cardForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Contexto *</Label>
                <Select
                  value={cardForm.watch('context_type')}
                  onValueChange={(v) => cardForm.setValue('context_type', v as any)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Pessoal</SelectItem>
                    <SelectItem value="business">Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Instituição</Label>
                <Input placeholder="Ex: Nubank" {...cardForm.register('institution')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Limite (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                {...cardForm.register('credit_limit', { valueAsNumber: true })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Dia de fechamento</Label>
                <Input type="number" min={1} max={31} placeholder="Ex: 20" {...cardForm.register('closing_day', { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>Dia de vencimento</Label>
                <Input type="number" min={1} max={31} placeholder="Ex: 27" {...cardForm.register('due_day', { valueAsNumber: true })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <ColorPicker value={cardForm.watch('color')} onChange={(c) => cardForm.setValue('color', c)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCardDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={cardForm.formState.isSubmitting}>
                {cardForm.formState.isSubmitting ? 'Salvando...' : editingCard ? 'Salvar' : 'Criar cartão'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Excluir ${deleteTarget?.type === 'account' ? 'conta' : 'cartão'}?`}
        description="Esta ação não poderá ser desfeita."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  )
}
