import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  onConfirm,
  onCancel,
  variant = 'default',
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/50"
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.2 }}
            className="relative bg-white rounded-lg shadow-xl border border-gray-100 w-full max-w-md mx-4 p-6"
          >
            <h2 className="text-base font-semibold text-gray-900 mb-2">{title}</h2>
            {description && (
              <p className="text-sm text-gray-600 mb-6">{description}</p>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={onCancel} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
