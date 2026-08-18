import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Smartphone, LoaderCircle, Download } from 'lucide-react'
import Navigation, { type NavTab } from './components/Navigation'
import NewSaleModal from './components/NewSaleModal'
import HistoryAndSummary from './components/HistoryAndSummary'
import DashboardView from './components/DashboardView'
import SettingsView from './components/SettingsView'
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
  mergeRemoteSales,
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
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null)
  const [pwaInstallable, setPwaInstallable] = useState(false)
  const syncLockRef = useRef(false)

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
      if (online && !syncLockRef.current) handleSyncNow()
    })
    const handleOnline = () => {
      setOnline(true)
      setManualOffline(false)
      setManualOfflineState(false)
      if (!syncLockRef.current) handleSyncNow()
    }
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      unsub()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setPwaInstallable(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setPwaInstallable(false)
      setDeferredPrompt(null)
    })
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallPwa = () => {
    if (!deferredPrompt) return
    const prompt = deferredPrompt as any
    prompt.prompt()
    prompt.userChoice.then(() => {
      setDeferredPrompt(null)
      setPwaInstallable(false)
    })
  }

  const loadData = useCallback(() => {
    setSales(getSales())
    setSummary(computeDailySummary())
    setSettings(getSettings())
  }, [])

  const handleSyncNow = useCallback(async () => {
    if (syncLockRef.current) return
    syncLockRef.current = true
    setSyncing(true)
    try {
      await processSyncQueue((id, status) => {
        setSales((prev) =>
          prev.map((s) =>
            s.id === id
              ? { ...s, syncStatus: status, syncedAt: status === 'synced' ? new Date().toISOString() : s.syncedAt }
              : s
          )
        )
      })
      await mergeRemoteSales()
    } catch {
      // silently handled
    } finally {
      loadData()
      setSyncing(false)
      syncLockRef.current = false
    }
  }, [loadData])

  const handleSaleRecorded = (sale: SaleRecord) => {
    setSales((prev) => [sale, ...prev])
    setRefreshKey((k) => k + 1)
    if (online) handleSyncNow()
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
    if (updated.theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (updated.theme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
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
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOnline={online}
        isManualOffline={manualOffline}
        pendingSyncCount={pendingSyncCount}
        onSyncNow={handleSyncNow}
        syncing={syncing}
      />

      {/* PWA Install Banner */}
      <AnimatePresence>
        {pwaInstallable && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-12 left-0 right-0 z-40 overflow-hidden"
          >
            <div className="flex items-center justify-between bg-emerald-600 px-4 py-2 text-white">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span className="text-sm font-medium">Install NAIRIVO for offline use</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleInstallPwa}
                  className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-50 active:scale-95"
                >
                  Install
                </button>
                <button
                  onClick={() => setPwaInstallable(false)}
                  className="rounded-full p-1 text-white/70 hover:text-white"
                >
                  <span className="text-lg leading-none">&times;</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="mx-auto max-w-lg px-4 pt-14">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <DashboardView
              settings={settings}
              summary={summary}
              sales={sales}
              online={online}
              manualOffline={manualOffline}
              syncing={syncing}
              pendingSyncCount={pendingSyncCount}
              onToggleOffline={handleToggleOffline}
              onSyncNow={handleSyncNow}
              onTabChange={setActiveTab}
            />
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
            <SettingsView
              settings={settings}
              online={online}
              syncing={syncing}
              pendingSyncCount={pendingSyncCount}
              salesCount={sales.length}
              onSaveSettings={handleSaveSettings}
              onSyncNow={handleSyncNow}
            />
          )}
        </AnimatePresence>
      </main>

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