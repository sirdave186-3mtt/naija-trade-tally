import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import type { VendorSettings } from '../types'

interface SettingsViewProps {
  settings: VendorSettings
  online: boolean
  syncing: boolean
  pendingSyncCount: number
  salesCount: number
  onSaveSettings: (s: VendorSettings) => void
  onSyncNow: () => void
}

export default function SettingsView({
  settings, online, syncing, pendingSyncCount, salesCount,
  onSaveSettings, onSyncNow,
}: SettingsViewProps) {
  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mb-4 pt-2">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>
      <div className="space-y-4">
        {/* Business Name */}
        <div className="rounded-xl border border-border bg-card p-4">
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Business Name</label>
          <input
            type="text"
            value={settings.businessName}
            onChange={(e) => onSaveSettings({ ...settings, businessName: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            maxLength={30}
          />
        </div>

        {/* Theme Toggle */}
        <div className="rounded-xl border border-border bg-card p-4">
          <label className="mb-2 block text-sm font-medium text-muted-foreground">Theme</label>
          <div className="grid grid-cols-3 gap-2">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => onSaveSettings({ ...settings, theme: t })}
                className={`rounded-lg px-3 py-2 text-sm font-medium capitalize transition-all ${
                  settings.theme === t
                    ? 'bg-emerald-600 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Currency */}
        <div className="rounded-xl border border-border bg-card p-4">
          <label className="mb-2 block text-sm font-medium text-muted-foreground">Currency Display</label>
          <div className="grid grid-cols-2 gap-2">
            {(['₦', 'NGN'] as const).map((c) => (
              <button
                key={c}
                onClick={() => onSaveSettings({ ...settings, currencySymbol: c })}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  settings.currencySymbol === c
                    ? 'bg-emerald-600 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Sync Status */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Cloud Sync</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className={`font-medium ${online ? 'text-emerald-600' : 'text-amber-600'}`}>
                {online ? 'Connected' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pending sync</span>
              <span className="font-medium">{pendingSyncCount} sales</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total sales</span>
              <span className="font-medium">{salesCount} records</span>
            </div>
            <button
              onClick={onSyncNow}
              disabled={syncing}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>

        {/* App Info */}
        <div className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">NAIRIVO v1.0</p>
          <p className="mt-1">Mobile-first POS for Nigerian vendors</p>
          <p className="mt-1">Offline-first PWA with Supabase sync</p>
        </div>
      </div>
    </motion.div>
  )
}