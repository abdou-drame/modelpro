import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

export function EmptyState({ icon: Icon, title, description }: {
  icon: LucideIcon; title: string; description?: string
}) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-20 text-center"
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center mb-4">
        <Icon size={24} className="text-brand-600" />
      </div>
      <p className="font-display font-semibold text-ink text-base">{title}</p>
      {description && <p className="text-ink-sub text-sm mt-1 max-w-xs">{description}</p>}
    </motion.div>
  )
}
