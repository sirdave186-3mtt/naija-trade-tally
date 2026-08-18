import { motion } from 'framer-motion'
import { Wifi, WifiOff, Smartphone, CircleCheck, LoaderCircle, RefreshCw } from 'lucide-react'
import type { SaleRecord, DailySummary, VendorSettings } from '../types'
import type { NavTab } from './Navigation'

interface DashboardViewProps {
  settings: VendorSettings
  summary: DailySummary | null
  sales: SaleRecord[]
  online: boolean
  manualOffline: boolean
  syncing: boolean
  pendingSyncCount: number
  onToggleOffline: () => void
  onSyncNow: () => void
  onTabChange: (tab: NavTab) => void
}

export default function DashboardView({
  settings, summary, sales, online, manualOffline, syncing, pendingSyncCount,
  onToggleOffline, onSyncNow, onTabChange,
}: DashboardViewProps) {
  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold">{settings.businessName}</h1>
          <p className="text-sm text-muted-foreground">
            {summary?.date
              ? new Date(summary.date).toLocaleDateString('en-NG', {
                  weekday: 'long', month: 'long', day: 'numeric',
                })
              : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Manual offline toggle */}
          <button
            onClick={onToggleOffline}
            className={`rounded-full p-2 transition-colors ${
              manualOffline
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                : 'text-muted-foreground hover:bg-muted'
            }`}
            title={manualOffline ? 'Manual offline mode active' : 'Toggle offline mode'}
          >
            {manualOffline ? <WifiOff className="h-5 w-5" /> : <Wifi className="h-5 w-5" />}
          </button>
          {/* Sync Now button */}
          <button
            onClick={onSyncNow}
            disabled={syncing}
            className="rounded-full p-2 text-muted-foreground transition-all hover:bg-muted active:scale-90 disabled:opacity-50"
            title="Sync now"
          >
            <RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
          </button>
          {/* Sync status */}
          {syncing && (
            <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Syncing
            </div>
          )}
          {!syncing && pendingSyncCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <WifiOff className="h-4 w-4" />
              {pendingSyncCount} pending
            </div>
          )}
          {!syncing && pendingSyncCount === 0 && online && (
            <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <CircleCheck className="h-4 w-4" />
              Synced
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <button
          onClick={() => onTabChange('new-sale')}
          className="flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-lg transition-all hover:from-emerald-500 hover:to-emerald-700 active:scale-[0.97]"
        >
          <span className="text-3xl font-bold">+</span>
          <span className="text-sm font-semibold">Record Sale</span>
        </button>
        <button
          onClick={() => onTabChange('summary')}
          className="flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card shadow-sm transition-all hover:bg-muted/50 active:scale-[0.97]"
        >
          <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {summary ? `₦${summary.totalRevenue.toLocaleString()}` : '₦0'}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {summary?.salesCount ?? 0} sales today
          </span>
        </button>
      </div>

      {/* Recent Sales Preview */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Recent Sales</h2>
          <button
            onClick={() => onTabChange('history')}
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          >
            View all
          </button>
        </div>
        {sales.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
            <Smartphone className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No sales yet</p>
            <button
              onClick={() => onTabChange('new-sale')}
              className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
            >
              Record your first sale
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {sales.slice(0, 5).map((sale) => (
              <div key={sale.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div>
                  <p className="font-bold">{`₦${sale.amount.toLocaleString()}`}</p>
                  {sale.itemLabel && (
                    <p className="text-xs text-muted-foreground">{sale.itemLabel}</p>
                  )}
                </div>
                <span className={`h-2 w-2 rounded-full ${
                  sale.syncStatus === 'synced' ? 'bg-emerald-500' :
                  sale.syncStatus === 'failed' ? 'bg-rose-500' :
                  sale.syncStatus === 'syncing' ? 'bg-blue-500 animate-pulse' :
                  'bg-amber-500 animate-pulse'
                }`} />
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}