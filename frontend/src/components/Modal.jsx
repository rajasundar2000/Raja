import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  const desktopSizes = {
    sm: 'md:max-w-md',
    md: 'md:max-w-2xl',
    lg: 'md:max-w-4xl',
    xl: 'md:max-w-6xl',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(15,23,42,0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Dialog */}
      <div
        className={`relative w-full ${desktopSizes[size]} max-h-[90vh] flex flex-col
          rounded-[20px] overflow-hidden`}
        style={{
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 8px 32px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0 border-b"
          style={{ borderColor: 'rgba(203,213,225,0.4)' }}
        >
          <h2
            className="text-lg font-semibold text-slate-900 pl-3"
            style={{ borderLeft: '4px solid #6366F1' }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100/60 hover:text-slate-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div
          className="overflow-y-auto flex-1 px-6 py-4 scrollbar-thin"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          {children}
        </div>
      </div>

    </div>
  )
}
