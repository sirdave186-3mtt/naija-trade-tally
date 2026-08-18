import { Wifi, WifiOff, List, Plus, History, TrendingUp, SlidersHorizontal } from 'lucide-react'
import { motion } from 'framer-motion'

export type NavTab = 'dashboard' | 'new-sale' | 'history' | 'summary' | 'settings'

interface NavigationProps {
  activeTab: NavTab
  onTabChange: (tab: NavTab) => void
  isOnline: boolean
  isManualOffline: boolean
}

const tabs: { id: NavTab; label: string; icon: typeof List }[] = [
  { id: 'dashboard', label: 'Home', icon: List },
  { id: 'new-sale', label: 'Sell', icon: Plus },
  { id: 'history', label: 'Sales', icon: History },
  { id: 'summary', label: 'Stats', icon: TrendingUp },
  { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
]

export default function Navigation({ activeTab, onTabChange, isOnline, isManualOffline }: NavigationProps) {
  const showOffline = !isOnline || isManualOffline

  return (
    <>
      {/* Online/Offline Banner */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-300 ${
          showOffline
            ? 'bg-amber-500 text-white'
            : 'bg-emerald-600 text-white'
        }`}
      >
        {showOffline ? (
          <>
            <WifiOff className="h-4 w-4" />
            <span>Offline - Sales saving locally</span>
          </>
        ) : (
          <>
            <Wifi className="h-4 w-4" />
            <span>Online - Auto-sync active</span>
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background pt-1 pb-safe pb-2">
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                  isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-emerald-600 dark:bg-emerald-400"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="h-6 w-6" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}