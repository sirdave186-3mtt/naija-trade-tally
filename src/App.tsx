import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, Smartphone, CircleCheck, LoaderCircle } from 'lucide-react'
import Navigation, { type NavTab } from './components/Navigation'
import NewSaleModal from './components/NewSaleModal'
import HistoryAndSummary from './components/HistoryAndSummary'
import {
  getSales,
  isOnline,
  onNetworkChange,
  processSyncQueue,
  computeDailySummary,
  getSettings,
  saveSettings,
  ensureSampleData,
  setManualOffline,
} from './utils/storage'
import type { SaleRecord, DailySummary, VendorSettings } from './types'

function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard')
  const [showNewSale, setShowNewSale] = useState(false)
  const [online, setOnline] = useState(isOnline())
  const [manualOffline, setManualOfflineState] = useState(false)
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [settings, setSettings] = useState<VendorSettings>(getSettings())
  const [refreshKey, setRefreshKey] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [appReady, setAppReady] = useState(false)

  // Seed sample data on first load
  useEffect(() => {
    ensureSampleData()
    loadData()
    setAppReady(true)
  }, [])

  // Online/offline listener
  useEffect(() => {
    const unsub = onNetworkChange((online) => {
      setOnline(online)
      if (online) {
        handleSyncNow()
      }
    })
    const handleOnline = () => {
      setOnline(true)
      setManualOffline(false)
      setManualOfflineState(false)
      handleSyncNow()
    }
    const handleOffline = () => {
      setOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      unsub()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadData = useCallback(() => {
    setSales(getSales())
    setSummary(computeDailySummary())
    setSettings(getSettings())
  }, [])

  const handleSyncNow = async () => {
    setSyncing(true)
    try {
      await processSyncQueue((id, status) => {
        setSales((prev) =>
          prev.map((s) => (s.id === id ? { ...s, syncStatus: status, syncedAt: status === 'synced' ? new Date().toISOString() : s.syncedAt } : s))
        )
      })
    } catch {
      // silently handle — storage.ts handles retries
    } finally {
      loadData()
      setSyncing(false)
    }
  }

  const handleSaleRecorded = (sale: SaleRecord) => {
    setSales((prev) => [sale, ...prev])
    setRefreshKey((k) => k + 1)
    if (online) {
      handleSyncNow()
    }
  }

  const handleToggleOffline = () => {
    const next = !manualOffline
    setManualOffline(next)
    setManualOfflineState(next)
    setOnline(!next && navigator.onLine)
  }

  const handleSaveSettings = (updated: VendorSettings) => {
    saveSettings(updated)
    setSettings(updated)
    // Apply theme
    if (updated.theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (updated.theme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      // system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', prefersDark)
    }
  }

  const pendingSyncCount = sales.filter((s) => s.syncStatus === 'pending' || s.syncStatus === 'failed').length

  if (!appReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Smartphone className="h-10 w-10 animate-pulse text-emerald-600" />
          <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground">
      {/* Top Status Bar - handled by Navigation component */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOnline={online}
        isManualOffline={manualOffline}
      />

      {/* Main Content */}
      <main className="mx-auto max-w-lg px-4 pt-14">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
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
                    {summary?.date ? new Date(summary.date).toLocaleDateString('en-NG', { weekday: 'long', month: 'long', day: 'numeric' }) : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Manual offline toggle */}
                  <button
                    onClick={handleToggleOffline}
                    className={`rounded-full p-2 transition-colors ${
                      manualOffline ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' : 'text-muted-foreground hover:bg-muted'
                    }`}
                    title={manualOffline ? 'Manual offline mode active' : 'Toggle offline mode'}
                  >
                    {manualOffline ? <WifiOff className="h-5 w-5" /> : <Wifi className="h-5 w-5" />}
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
                  onClick={() => setActiveTab('new-sale')}
                  className="flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-lg transition-all hover:from-emerald-500 hover:to-emerald-700 active:scale-[0.97]"
                >
                  <span className="text-3xl font-bold">+</span>
                  <span className="text-sm font-semibold">Record Sale</span>
                </button>
                <button
                  onClick={() => setActiveTab('summary')}
                  className="flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card shadow-sm transition-all hover:bg-muted/50 active:scale-[0.97]"
                >
                  <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {summary ? `₦${summary.totalRevenue.toLocaleString()}` : '₦0'}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">Today's Revenue</span>
                </button>
              </div>

              {/* Recent Sales Preview */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold">Recent Sales</h2>
                  <button
                    onClick={() => setActiveTab('history')}
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
                      onClick={() => setActiveTab('new-sale')}
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
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-4 pt-2">
                <h1 className="text-2xl font-bold">Sales</h1>
              </div>
              <HistoryAndSummary currencySymbol={settings.currencySymbol} refreshKey={refreshKey} />
            </motion.div>
          )}

          {activeTab === 'summary' && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-4 pt-2">
                <h1 className="text-2xl font-bold">Daily Summary</h1>
              </div>
              <HistoryAndSummary currencySymbol={settings.currencySymbol} refreshKey={refreshKey} />
            </motion.div>
          )}

          {activeTab === 'new-sale' && (
            <motion.div
              key="new-sale"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-4 pt-2">
                <h1 className="text-2xl font-bold">New Sale</h1>
                <p className="text-sm text-muted-foreground">Record a sale quickly</p>
              </div>
              <button
                onClick={() => setShowNewSale(true)}
                className="flex min-h-[120px] w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 text-emerald-700 transition-all hover:bg-emerald-100 active:scale-[0.98] dark:border-emerald-700/50 dark:bg-emerald-950/20 dark:text-emerald-300"
              >
                <span className="text-4xl">+</span>
                <span className="text-lg font-semibold">Open Sale Recorder</span>
              </button>
            </motion.div>
          )}

          {activeTab === 'settings' && (
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
                    onChange={(e) => handleSaveSettings({ ...settings, businessName: e.target.value })}
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
                        onClick={() => handleSaveSettings({ ...settings, theme: t })}
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
                        onClick={() => handleSaveSettings({ ...settings, currencySymbol: c })}
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

                {/* App Info */}
                <div className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">NAIRIVO v1.0</p>
                  <p className="mt-1">Mobile-first POS for Nigerian vendors</p>
                  <p className="mt-1">Offline-first • Auto-sync</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* New Sale Modal */}
      <NewSaleModal
        open={showNewSale}
        onClose={() => setShowNewSale(false)}
        currencySymbol={settings.currencySymbol}
        onSaleRecorded={handleSaleRecorded}
      />
    </div>
  )
}

export default App