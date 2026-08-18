import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  History,
  TrendingUp,
  CircleCheck,
  CircleAlert,
  Circle,
  RefreshCw,
  Check,
  X,
  SendHorizontal,
  Wallet,
  Smartphone,
  LoaderCircle,
  ArrowUpRight,
} from 'lucide-react'
import { toast } from 'sonner'
import type { SaleRecord, SyncStatus, PaymentMethod } from '../types'
import { formatCurrency, formatDate, SYNC_STATUS_CONFIG } from '../constants'
import {
  getSales,
  updateSaleStatus,
  confirmTransfer,
  deleteSale,
  enqueueSync,
  processSyncQueue,
  computeDailySummary,
  isOnline,
} from '../utils/storage'
import type { DailySummary } from '../types'

interface HistoryAndSummaryProps {
  currencySymbol: string
  refreshKey: number
}

const paymentIcons: Record<PaymentMethod, typeof Wallet> = {
  cash: Wallet,
  transfer: SendHorizontal,
  mobile_money: Smartphone,
}

const paymentLabels: Record<PaymentMethod, string> = {
  cash: 'Cash',
  transfer: 'Transfer',
  mobile_money: 'Mobile Money',
}

export default function HistoryAndSummary({ currencySymbol, refreshKey }: HistoryAndSummaryProps) {
  const [tab, setTab] = useState<'history' | 'summary'>('history')
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<SyncStatus | 'all'>('all')

  const loadData = useCallback(() => {
    setSales(getSales())
    setSummary(computeDailySummary())
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData, refreshKey])

  const handleSyncNow = async () => {
    setSyncing(true)
    try {
      await processSyncQueue((id, status) => {
        setSales((prev) =>
          prev.map((s) => (s.id === id ? { ...s, syncStatus: status, syncedAt: status === 'synced' ? new Date().toISOString() : s.syncedAt } : s))
        )
      })
      toast.success('Sync complete')
    } catch {
      toast.error('Sync failed. Will retry.')
    } finally {
      loadData()
      setSyncing(false)
    }
  }

  const handleRetrySync = (id: string) => {
    updateSaleStatus(id, 'pending')
    enqueueSync(id)
    toast.info('Queued for sync')
    loadData()
  }

  const handleConfirmTransfer = (id: string) => {
    confirmTransfer(id)
    toast.success('Transfer marked as confirmed')
    loadData()
  }

  const handleDelete = (id: string) => {
    deleteSale(id)
    toast.success('Sale deleted')
    loadData()
  }

  const filteredSales = sales.filter((s) => (statusFilter === 'all' ? true : s.syncStatus === statusFilter))

  const SyncBadge = ({ status }: { status: SyncStatus }) => {
    const cfg = SYNC_STATUS_CONFIG[status]
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
        {status === 'synced' && <CircleCheck className="h-3 w-3" />}
        {status === 'syncing' && <LoaderCircle className="h-3 w-3 animate-spin" />}
        {status === 'pending' && <Circle className="h-3 w-3 animate-pulse" />}
        {status === 'failed' && <CircleAlert className="h-3 w-3" />}
        {cfg.label}
      </span>
    )
  }

  const statusFilters: { value: SyncStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'synced', label: 'Synced' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' },
  ]

  return (
    <div className="pb-4">
      {/* Tab Toggle */}
      <div className="mb-4 flex rounded-xl bg-muted p-1">
        <button
          onClick={() => setTab('history')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            tab === 'history' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
          }`}
        >
          <History className="h-4 w-4" />
          Sales History
        </button>
        <button
          onClick={() => setTab('summary')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            tab === 'summary' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Daily Summary
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'history' ? (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Sync Controls */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex gap-1 overflow-x-auto">
                {statusFilters.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setStatusFilter(f.value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      statusFilter === f.value
                        ? 'bg-emerald-600 text-white'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                Sync Now
              </button>
            </div>

            {/* Sales List */}
            {filteredSales.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <History className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No sales recorded yet</p>
                <p className="text-xs text-muted-foreground/60">Go to Sell to record your first sale</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSales.map((sale) => {
                  const PaymentIcon = paymentIcons[sale.paymentMethod]
                  return (
                    <motion.div
                      key={sale.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-border bg-card p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">{formatCurrency(sale.amount, currencySymbol)}</span>
                            <SyncBadge status={sale.syncStatus} />
                          </div>
                          {sale.itemLabel && (
                            <p className="mt-0.5 text-sm text-muted-foreground">{sale.itemLabel}</p>
                          )}
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <PaymentIcon className="h-3 w-3" />
                              {paymentLabels[sale.paymentMethod]}
                            </span>
                            <span>{formatDate(sale.createdAt)}</span>
                            {sale.paymentMethod === 'transfer' && (
                              <span
                                className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                  sale.transferConfirmed
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                                    : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                                }`}
                              >
                                {sale.transferConfirmed ? (
                                  <>
                                    <Check className="h-3 w-3" /> Confirmed
                                  </>
                                ) : (
                                  <>
                                    <CircleAlert className="h-3 w-3" /> Unconfirmed
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {sale.syncStatus === 'failed' && (
                            <button
                              onClick={() => handleRetrySync(sale.id)}
                              className="rounded-lg p-2 text-muted-foreground hover:bg-muted active:scale-90"
                              title="Retry sync"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          )}
                          {sale.paymentMethod === 'transfer' && !sale.transferConfirmed && (
                            <button
                              onClick={() => handleConfirmTransfer(sale.id)}
                              className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 active:scale-90"
                              title="Confirm transfer"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(sale.id)}
                            className="rounded-lg p-2 text-muted-foreground hover:bg-muted active:scale-90"
                            title="Delete"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="summary"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {summary && (
              <div className="space-y-3">
                {/* Total Revenue Hero */}
                <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-5 text-white">
                  <p className="text-sm font-medium text-emerald-100">Today's Total Revenue</p>
                  <p className="mt-1 text-4xl font-bold">{formatCurrency(summary.totalRevenue, currencySymbol)}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-emerald-100">
                    <span className="flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      {summary.salesCount} sale{summary.salesCount !== 1 ? 's' : ''}
                    </span>
                    {summary.pendingSyncCount > 0 && (
                      <span className="flex items-center gap-1 text-amber-200">
                        <Circle className="h-3 w-3 animate-pulse" />
                        {summary.pendingSyncCount} pending
                      </span>
                    )}
                    {summary.failedSyncCount > 0 && (
                      <span className="flex items-center gap-1 text-rose-200">
                        <CircleAlert className="h-3 w-3" />
                        {summary.failedSyncCount} failed
                      </span>
                    )}
                  </div>
                </div>

                {/* Payment Method Breakdown */}
                <div className="grid grid-cols-3 gap-2">
                  <SummaryCard
                    label="Cash"
                    amount={summary.cashTotal}
                    currencySymbol={currencySymbol}
                    icon={Wallet}
                    color="text-emerald-600"
                  />
                  <SummaryCard
                    label="Transfer"
                    amount={summary.transferTotal}
                    currencySymbol={currencySymbol}
                    icon={SendHorizontal}
                    color="text-blue-600"
                  />
                  <SummaryCard
                    label="Mobile Money"
                    amount={summary.mobileMoneyTotal}
                    currencySymbol={currencySymbol}
                    icon={Smartphone}
                    color="text-purple-600"
                  />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Total Sales</p>
                    <p className="text-2xl font-bold">{summary.salesCount}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Avg. Value</p>
                    <p className="text-2xl font-bold">
                      {summary.salesCount > 0
                        ? formatCurrency(Math.round(summary.totalRevenue / summary.salesCount), currencySymbol)
                        : `${currencySymbol}0`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SummaryCard({
  label,
  amount,
  currencySymbol,
  icon: Icon,
  color,
}: {
  label: string
  amount: number
  currencySymbol: string
  icon: typeof Wallet
  color: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <Icon className={`mb-1 h-5 w-5 ${color}`} />
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{amount > 0 ? formatCurrency(amount, currencySymbol) : `${currencySymbol}0`}</p>
    </div>
  )
}