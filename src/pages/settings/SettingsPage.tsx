import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { User, Building2, Palette, Bell, Download, Moon, Sun, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PageHeader } from '@/components/shared/PageHeader'
import { supabase } from '@/lib/supabase'
import { FIXED_USER_ID } from '@/lib/constants'
import { usePWAInstall } from '@/hooks/usePWAInstall'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  system_name: z.string().min(1, 'Nome do sistema é obrigatório'),
  default_currency: z.string(),
  timezone: z.string(),
  date_format: z.string(),
})

type ProfileData = z.infer<typeof profileSchema>

export default function SettingsPage() {
  const { canInstall, isInstalled, install } = usePWAInstall()
  const [darkMode, setDarkMode] = useState(false)
  const [loading, setLoading] = useState(true)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      system_name: 'FinanceHub',
      default_currency: 'BRL',
      timezone: 'America/Sao_Paulo',
      date_format: 'DD/MM/YYYY',
    },
  })

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .eq('id', FIXED_USER_ID)
      .single()
      .then(({ data }: { data: any }) => {
        if (data) {
          reset({
            full_name: data.full_name ?? '',
            system_name: data.system_name ?? 'FinanceHub',
            default_currency: data.default_currency ?? 'BRL',
            timezone: data.timezone ?? 'America/Sao_Paulo',
            date_format: data.date_format ?? 'DD/MM/YYYY',
          })
          setDarkMode(data.theme === 'dark')
        }
        setLoading(false)
      })
  }, [reset])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const onSaveProfile = async (data: ProfileData) => {
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: FIXED_USER_ID, ...data, theme: darkMode ? 'dark' : 'light' })
    if (error) {
      toast.error('Erro ao salvar perfil.')
    } else {
      toast.success('Perfil atualizado com sucesso!')
    }
  }

  const initials = (watch('full_name') || 'FinanceHub')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Gerencie sua conta e preferências do sistema" />

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" /> Perfil</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2"><Palette className="h-4 w-4" /> Aparência</TabsTrigger>
          <TabsTrigger value="pwa" className="gap-2"><Smartphone className="h-4 w-4" /> App Mobile</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações do perfil</CardTitle>
              <CardDescription>Dados da sua conta no FinanceHub</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSaveProfile)} className="space-y-5">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">Foto de perfil</p>
                    <p className="text-xs text-muted-foreground">FinanceHub</p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Nome completo *</Label>
                    <Input placeholder="Seu nome" {...register('full_name')} />
                    {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nome do sistema</Label>
                    <Input placeholder="FinanceHub" {...register('system_name')} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Moeda padrão</Label>
                    <Select value={watch('default_currency')} onValueChange={(v) => setValue('default_currency', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">BRL — Real Brasileiro</SelectItem>
                        <SelectItem value="USD">USD — Dólar Americano</SelectItem>
                        <SelectItem value="EUR">EUR — Euro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fuso horário</Label>
                    <Select value={watch('timezone')} onValueChange={(v) => setValue('timezone', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Sao_Paulo">São Paulo (UTC-3)</SelectItem>
                        <SelectItem value="America/Manaus">Manaus (UTC-4)</SelectItem>
                        <SelectItem value="America/Belem">Belém (UTC-3)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Formato de data</Label>
                    <Select value={watch('date_format')} onValueChange={(v) => setValue('date_format', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/AAAA</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/AAAA</SelectItem>
                        <SelectItem value="YYYY-MM-DD">AAAA-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={isSubmitting || loading}>
                    {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aparência</CardTitle>
              <CardDescription>Personalize a interface do FinanceHub</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border p-4">
                <div className="flex items-center gap-3">
                  {darkMode ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-amber-500" />}
                  <div>
                    <p className="text-sm font-medium">Modo escuro</p>
                    <p className="text-xs text-muted-foreground">
                      {darkMode ? 'Interface em tema escuro' : 'Interface em tema claro'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={darkMode}
                  onCheckedChange={async (v) => {
                    setDarkMode(v)
                    {
                      await supabase
                        .from('profiles')
                        .upsert({ id: FIXED_USER_ID, theme: v ? 'dark' : 'light' })
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PWA */}
        <TabsContent value="pwa" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Instalar como App</CardTitle>
              <CardDescription>Use o FinanceHub como um aplicativo nativo no seu dispositivo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {isInstalled ? (
                <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                    <Smartphone className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-800">App instalado!</p>
                    <p className="text-xs text-green-700">O FinanceHub está instalado no seu dispositivo.</p>
                  </div>
                </div>
              ) : canInstall ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <Download className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">FinanceHub disponível para instalação</p>
                      <p className="text-xs text-muted-foreground">Instale e use como app nativo no Android</p>
                    </div>
                  </div>
                  <Button onClick={install} className="gap-2 w-full sm:w-auto">
                    <Download className="h-4 w-4" />
                    Instalar App
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border p-4 space-y-3">
                    <p className="text-sm font-medium">Como instalar no iPhone (iOS)</p>
                    <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      <li>Abra o FinanceHub no Safari</li>
                      <li>Toque no botão de compartilhamento (caixa com seta para cima)</li>
                      <li>Role para baixo e toque em <strong>Adicionar à Tela de Início</strong></li>
                      <li>Toque em <strong>Adicionar</strong> para confirmar</li>
                    </ol>
                  </div>
                  <div className="rounded-xl border p-4 space-y-3">
                    <p className="text-sm font-medium">Como instalar no Android</p>
                    <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      <li>Abra o FinanceHub no Chrome</li>
                      <li>Toque no menu (⋮) no canto superior direito</li>
                      <li>Toque em <strong>Adicionar à tela inicial</strong></li>
                      <li>Confirme a instalação</li>
                    </ol>
                  </div>
                </div>
              )}

              <Separator />

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Funciona offline', desc: 'Dados em cache local' },
                  { label: 'Notificações', desc: 'Alertas de vencimento' },
                  { label: 'Atalho na tela', desc: 'Acesso rápido como app' },
                ].map((f) => (
                  <div key={f.label} className="rounded-lg border p-3 text-center">
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
