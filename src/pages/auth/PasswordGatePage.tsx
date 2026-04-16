import { useState, useEffect, useRef } from 'react'
import { Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

export default function PasswordGatePage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setError(false)

    const ok = login(password)
    if (ok) {
      navigate('/dashboard', { replace: true })
    } else {
      setError(true)
      setPassword('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-xs space-y-8">
        {/* Icon + title */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Gestão 360</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Digite a senha para acessar
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            ref={inputRef}
            type="password"
            placeholder="••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(false)
            }}
            className={cn(
              'h-14 text-center text-2xl tracking-[0.5em]',
              error && 'border-destructive focus-visible:ring-destructive'
            )}
            autoComplete="off"
            inputMode="numeric"
          />

          {error && (
            <p className="text-center text-sm text-destructive font-medium">
              Senha incorreta
            </p>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base"
            disabled={!password}
          >
            Entrar
          </Button>
        </form>
      </div>
    </div>
  )
}
