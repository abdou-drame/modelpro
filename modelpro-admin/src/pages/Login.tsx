import { useState, useId } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

// ── Floating label input ───────────────────────────────────────────────────────

interface FloatingInputProps {
  id: string
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  rightElement?: React.ReactNode
}

function FloatingInput({
  id, label, type = 'text', value, onChange, autoComplete, rightElement,
}: FloatingInputProps) {
  const [focused, setFocused] = useState(false)
  const lifted = focused || value.length > 0

  return (
    <div className="relative">
      <label
        htmlFor={id}
        className={cn(
          'absolute left-0 transition-all duration-200 pointer-events-none select-none',
          lifted
            ? 'top-0 text-[11px] font-semibold tracking-widest uppercase text-brand-600'
            : 'top-5 text-sm text-ink-sub',
        )}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full pt-6 pb-2 pr-10 bg-transparent border-0 border-b-2 outline-none text-ink text-sm transition-colors duration-200',
          focused ? 'border-brand-600' : 'border-surface-border',
        )}
      />
      {rightElement && (
        <div className="absolute right-0 top-5">{rightElement}</div>
      )}
    </div>
  )
}

// ── Decorative warm shapes (CSS only) ─────────────────────────────────────────

function BrandPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between h-full overflow-hidden bg-brand-600 px-14 py-16">
      {/* Abstract warm shapes */}
      <div
        aria-hidden
        className="absolute top-[-80px] left-[-60px] w-[340px] h-[340px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(201,118,43,0.35) 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="absolute bottom-[-120px] right-[-80px] w-[420px] h-[420px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(88,37,10,0.55) 0%, transparent 65%)' }}
      />
      <div
        aria-hidden
        className="absolute top-[35%] right-[-40px] w-[180px] h-[180px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(201,118,43,0.18) 0%, transparent 70%)' }}
      />
      {/* Dot grid texture */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle, #fff 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Top: wordmark */}
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
            <span className="text-white font-display font-black text-lg leading-none">M</span>
          </div>
          <span className="text-white/70 font-display font-semibold text-sm tracking-[0.2em] uppercase">
            ModèlePro
          </span>
        </div>
      </div>

      {/* Center: monogram */}
      <div className="relative z-10 flex flex-col items-start">
        <div
          className="text-[min(18vw,200px)] font-display font-black leading-none select-none"
          style={{
            color: 'transparent',
            WebkitTextStroke: '2px rgba(255,255,255,0.18)',
            letterSpacing: '-0.04em',
          }}
        >
          M
        </div>
        <h1 className="text-white font-display font-black text-4xl tracking-tight leading-tight mt-[-1.5rem]">
          MODÈLEPRO
          <br />
          <span className="text-brand-300 text-2xl font-semibold tracking-[0.12em]">ADMIN</span>
        </h1>
        <p className="text-white/55 text-sm mt-5 max-w-xs leading-relaxed font-sans">
          Plateforme de gestion des artisans, commandes et clients — accès réservé aux administrateurs.
        </p>
      </div>

      {/* Bottom: badge */}
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/70 text-xs font-sans tracking-wide">Système opérationnel</span>
        </div>
      </div>
    </div>
  )
}

// ── Login page ────────────────────────────────────────────────────────────────

export default function Login() {
  const { token, login } = useAuthStore()
  const navigate = useNavigate()

  const [telephone, setTelephone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const telId = useId()
  const pwdId = useId()

  if (token) return <Navigate to="/" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!telephone.trim() || !password.trim()) return
    setError(null)
    setLoading(true)
    try {
      const { data } = await authApi.login(telephone.trim(), password)
      login(data.token, data.user)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401 || status === 400) {
        setError('Identifiants incorrects. Vérifiez votre numéro et mot de passe.')
      } else {
        setError('Impossible de joindre le serveur. Réessayez dans un instant.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_520px] bg-surface">
      {/* Left — brand panel */}
      <BrandPanel />

      {/* Right — form panel */}
      <div className="flex flex-col items-center justify-center px-8 py-16 bg-surface">
        {/* Mobile wordmark */}
        <div className="flex items-center gap-2 mb-12 lg:hidden">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <span className="text-white font-display font-black text-base leading-none">M</span>
          </div>
          <span className="font-display font-bold text-ink text-sm tracking-[0.15em] uppercase">
            ModèlePro Admin
          </span>
        </div>

        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Heading */}
          <div className="mb-10">
            <h2 className="font-display font-bold text-ink text-3xl tracking-tight">
              Connexion
            </h2>
            <p className="text-ink-sub text-sm mt-2">
              Accédez au panneau d'administration
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-8">
            <FloatingInput
              id={telId}
              label="Numéro de téléphone"
              type="tel"
              value={telephone}
              onChange={setTelephone}
              autoComplete="tel"
            />

            <FloatingInput
              id={pwdId}
              label="Mot de passe"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              rightElement={
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-ink-muted hover:text-ink-sub transition-colors p-1"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            {/* Error message */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-danger text-xs leading-relaxed bg-red-50 border border-red-100 rounded-lg px-3 py-2.5"
                role="alert"
              >
                {error}
              </motion.p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !telephone.trim() || !password.trim()}
              className={cn(
                'w-full py-3.5 rounded-xl font-display font-bold text-sm tracking-[0.12em] uppercase transition-all duration-200',
                'bg-brand-600 text-white',
                'hover:bg-brand-700 active:scale-[0.98]',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                'shadow-card hover:shadow-lifted',
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Connexion…
                </span>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          {/* Footer hint */}
          <p className="text-ink-muted text-xs text-center mt-10">
            Accès restreint — administrateurs uniquement
          </p>
        </motion.div>
      </div>
    </div>
  )
}
