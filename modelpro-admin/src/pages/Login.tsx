import { useState, useId } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'
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
          'absolute left-4 transition-all duration-200 pointer-events-none select-none z-10',
          lifted
            ? 'top-2.5 text-[10px] font-bold tracking-[0.18em] uppercase text-brand-600'
            : 'top-[50%] -translate-y-1/2 text-sm text-ink-sub',
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
          'w-full pt-8 pb-3 pl-4 pr-12 rounded-xl text-ink text-sm outline-none',
          'border-2 transition-all duration-200',
          focused
            ? 'border-brand-500 bg-white shadow-glow'
            : 'border-surface-border bg-surface hover:border-brand-200',
        )}
      />
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
      )}
    </div>
  )
}

// ── Brand panel ────────────────────────────────────────────────────────────────

const stagger = {
  container: {
    hidden: {},
    show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
  },
  item: {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
  },
}

function BrandPanel() {
  return (
    <div
      className="relative hidden lg:flex flex-col justify-between h-full overflow-hidden"
      style={{ background: '#3d1907' }}
    >
      {/* Weave texture — diagonal crosshatch evoking woven fabric */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg,  rgba(255,255,255,0.032) 0px, rgba(255,255,255,0.032) 1px, transparent 1px, transparent 22px),
            repeating-linear-gradient(-45deg, rgba(255,255,255,0.032) 0px, rgba(255,255,255,0.032) 1px, transparent 1px, transparent 22px)
          `,
        }}
      />

      {/* Warm depth — single soft glow bottom-right, no orbs */}
      <div
        aria-hidden
        className="absolute bottom-0 right-0 w-3/4 h-2/3 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 100% 110%, rgba(139,58,15,0.55) 0%, transparent 60%)' }}
      />

      {/* Top: wordmark */}
      <motion.div
        className="relative z-10 px-12 pt-14"
        variants={stagger.item}
        initial="hidden"
        animate="show"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center shrink-0">
            <span className="text-white font-display font-black text-sm leading-none">M</span>
          </div>
          <div>
            <div className="text-white/90 font-display font-bold text-xs tracking-[0.22em] uppercase leading-none">
              ModèlePro
            </div>
            <div className="text-white/30 text-[9px] tracking-[0.14em] font-sans mt-1">
              Plateforme artisanale
            </div>
          </div>
        </div>
      </motion.div>

      {/* Center: editorial typographic block */}
      <motion.div
        className="relative z-10 px-12"
        variants={stagger.container}
        initial="hidden"
        animate="show"
      >
        {/* Overline rule */}
        <motion.div variants={stagger.item} className="flex items-center gap-3 mb-7">
          <div className="w-7 h-px bg-brand-400/50" />
          <span className="text-brand-300/75 text-[10px] font-bold tracking-[0.28em] uppercase font-sans">
            Espace réservé
          </span>
        </motion.div>

        {/* Ghost + solid title contrast */}
        <motion.div variants={stagger.item} className="leading-none select-none">
          <div
            className="font-display font-black"
            style={{
              fontSize: 'clamp(52px, 6.5vw, 84px)',
              color: 'transparent',
              WebkitTextStroke: '1.5px rgba(255,255,255,0.13)',
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            MODÈLE
          </div>
          <div
            className="font-display font-black text-white -mt-1"
            style={{
              fontSize: 'clamp(52px, 6.5vw, 84px)',
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            PRO
          </div>
        </motion.div>

        {/* Admin stamp */}
        <motion.div variants={stagger.item} className="mt-6">
          <span className="inline-flex items-center border border-brand-400/35 rounded px-3 py-1.5">
            <span className="text-brand-300 text-[11px] font-bold tracking-[0.3em] uppercase font-sans">
              Admin
            </span>
          </span>
        </motion.div>

        <motion.p variants={stagger.item} className="text-white/35 text-[13px] mt-5 max-w-[28ch] leading-relaxed font-sans">
          Gestion des artisans, commandes et clients de la plateforme.
        </motion.p>
      </motion.div>

      {/* Bottom: status */}
      <motion.div
        className="relative z-10 px-12 pb-14"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white/35 text-[11px] font-sans tracking-wide">
            Système opérationnel
          </span>
        </div>
      </motion.div>
    </div>
  )
}

// ── Login page ─────────────────────────────────────────────────────────────────

export default function Login() {
  const { token, login } = useAuthStore()
  const navigate = useNavigate()

  const [telephone, setTelephone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [arrowHover, setArrowHover] = useState(false)

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
    <div className="min-h-screen grid lg:grid-cols-[55%_1fr] bg-surface">
      {/* Left — brand panel */}
      <BrandPanel />

      {/* Right — form panel */}
      <div className="relative flex flex-col items-center justify-center px-8 py-16 bg-white">
        {/* Left accent stripe — only visible on desktop */}
        <div
          aria-hidden
          className="absolute left-0 top-[20%] bottom-[20%] w-[2px] hidden lg:block"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(139,58,15,0.25) 40%, rgba(139,58,15,0.25) 60%, transparent)' }}
        />

        {/* Mobile wordmark */}
        <motion.div
          className="flex items-center gap-2.5 mb-12 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-8 h-8 rounded-lg bg-brand-900 flex items-center justify-center">
            <span className="text-white font-display font-black text-sm leading-none">M</span>
          </div>
          <span className="font-display font-bold text-ink text-sm tracking-[0.15em] uppercase">
            ModèlePro Admin
          </span>
        </motion.div>

        <motion.div
          className="w-full max-w-[360px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Heading */}
          <div className="mb-10">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-5 h-px bg-brand-300" />
              <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-brand-600 font-sans">
                Authentification
              </span>
            </div>
            <h2 className="font-display font-black text-ink tracking-[-0.025em] leading-none"
              style={{ fontSize: 'clamp(28px, 4vw, 36px)' }}
            >
              Connexion
            </h2>
            <p className="text-ink-sub text-sm mt-2.5">
              Accédez au panneau d'administration.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />

            {/* Error — left border strip, not a box */}
            <AnimatePresence>
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="border-l-2 border-danger pl-3 py-0.5 mt-1">
                    <p className="text-danger text-xs leading-relaxed" role="alert">
                      {error}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={loading || !telephone.trim() || !password.trim()}
                onMouseEnter={() => setArrowHover(true)}
                onMouseLeave={() => setArrowHover(false)}
                className={cn(
                  'w-full h-[52px] rounded-xl font-display font-bold text-sm tracking-[0.1em] uppercase',
                  'bg-brand-900 text-white flex items-center justify-center gap-3',
                  'transition-colors duration-200 hover:bg-brand-800 active:scale-[0.98]',
                  'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                )}
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <span>Se connecter</span>
                    <motion.span
                      animate={{ x: arrowHover ? 5 : 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      <ArrowRight size={16} />
                    </motion.span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center gap-3 justify-center mt-10">
            <div className="flex-1 h-px bg-surface-border" />
            <p className="text-ink-muted text-[11px] font-sans tracking-wide whitespace-nowrap">
              Administrateurs uniquement
            </p>
            <div className="flex-1 h-px bg-surface-border" />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
