import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Wallet, SendHorizontal, Smartphone, Check, CircleAlert } from 'lucide-react'
import type { PaymentMethod, SaleRecord } from '../types'
import { QUICK_AMOUNTS, formatCurrency, generateId } from '../constants'
import { saveSale, enqueueSync, isOnline } from '../utils/storage'

interface NewSaleModalProps {
  open: boolean
  onClose: () => void
  currencySymbol: string
  onSaleRecorded: (sale: SaleRecord) => void
}

const paymentOptions: { value: PaymentMethod; label: string; icon: typeof Wallet }[] = [
  { value: 'cash', label: 'Cash', icon: Wallet },
  { value: 'transfer', label: 'Transfer', icon: SendHorizontal },
  { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
]

export default function NewSaleModal({ open, onClose, currencySymbol, onSaleRecorded }: NewSaleModalProps) {
  const [amount, setAmount] = useState(0)
  const [itemLabel, setItemLabel] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [showConfirm, setShowConfirm] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleQuickAmount = (val: number) => {
    setAmount((prev) => prev + val)
  }

  const handleClear = () => {
    setAmount(0)
    setItemLabel('')
    setPaymentMethod('cash')
    setShowConfirm(false)
    setSuccess(false)
  }

  const handleRecord = () => {
    if (amount <= 0) return

    const sale: SaleRecord = {
      id: generateId(),
      amount,
      paymentMethod,
      itemLabel: itemLabel.trim(),
      syncStatus: isOnline() ? 'synced' : 'pending',
      transferConfirmed: paymentMethod !== 'transfer',
      createdAt: new Date().toISOString(),
      syncedAt: isOnline() ? new Date().toISOString() : null,
    }

    saveSale(sale)
    if (sale.syncStatus === 'pending') {
      enqueueSync(sale.id)
    }

    onSaleRecorded(sale)
    setSuccess(true)

    setTimeout(() => {
      handleClear()
      onClose()
    }, 1200)
  }

  const handleClose = () => {
    handleClear()
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="w-full max-w-lg rounded-t-2xl bg-background px-5 pb-8 pt-6 shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">New Sale</h2>
              <button
                onClick={handleClose}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {success ? (
              <motion.div
                className="flex flex-col items-center gap-3 py-10"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                  <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-lg font-semibold">Sale Recorded!</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(amount, currencySymbol)}
                </p>
              </motion.div>
            ) : (
              <>
                {/* Amount Display */}
                <div className="mb-4 text-center">
                  <div className="text-5xl font-bold tracking-tighter">
                    {currencySymbol}{amount.toLocaleString('en-US')}
                  </div>
                  {amount === 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">Tap a quick amount or type below</p>
                  )}
                </div>

                {/* Quick Amount Presets */}
                <div className="mb-4 grid grid-cols-3 gap-2">
                  {QUICK_AMOUNTS.map((val) => (
                    <button
                      key={val}
                      onClick={() => handleQuickAmount(val)}
                      className="min-h-[52px] rounded-xl border border-border bg-card font-semibold text-card-foreground transition-all active:scale-95 active:bg-emerald-50 dark:active:bg-emerald-950/30"
                    >
                      {currencySymbol}{val.toLocaleString('en-US')}
                    </button>
                  ))}
                </div>

                {/* Custom Amount Input */}
                <div className="mb-4">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Or type custom amount..."
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-lg text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Item Label */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Item description (optional) e.g. 2 Ankara fabrics"
                    value={itemLabel}
                    onChange={(e) => setItemLabel(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    maxLength={60}
                  />
                </div>

                {/* Payment Method Picker */}
                <div className="mb-4">
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Payment Method</p>
                  <div className="grid grid-cols-3 gap-2">
                    {paymentOptions.map((opt) => {
                      const isSelected = paymentMethod === opt.value
                      const Icon = opt.icon
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setPaymentMethod(opt.value)}
                          className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl border-2 font-medium transition-all active:scale-95 ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-950/30 dark:text-emerald-300'
                              : 'border-border bg-card text-muted-foreground'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-xs">{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Transfer Warning */}
                {paymentMethod === 'transfer' && (
                  <motion.div
                    className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-300"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Transfer claim recorded. Manually confirm after receiving alert.
                    </span>
                  </motion.div>
                )}

                {/* Record Sale Button */}
                <button
                  onClick={handleRecord}
                  disabled={amount <= 0}
                  className="flex min-h-[56px] w-full items-center justify-center rounded-xl bg-emerald-600 text-lg font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
                >
                  Save Sale ({currencySymbol}{amount.toLocaleString('en-US')})
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}