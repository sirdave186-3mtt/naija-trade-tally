export const STORAGE_KEYS = {
  SALES: 'nairivo_sales',
  SETTINGS: 'nairivo_settings',
  SYNC_QUEUE: 'nairivo_sync_queue',
} as const

export const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000] as const

export const PAYMENT_METHODS = [
  { value: 'cash' as const, label: 'Cash', icon: 'Wallet' },
  { value: 'transfer' as const, label: 'Bank Transfer', icon: 'SendHorizontal' },
  { value: 'mobile_money' as const, label: 'Mobile Money', icon: 'Smartphone' },
] as const

export const SYNC_STATUS_CONFIG = {
  pending: { label: 'Pending Sync', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400' },
  syncing: { label: 'Syncing...', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400' },
  synced: { label: 'Synced', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400' },
  failed: { label: 'Sync Failed', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400' },
} as const

export const DEFAULT_SETTINGS = {
  businessName: 'NAIRIVO',
  theme: 'light' as const,
  currencySymbol: '₦' as const,
}

export const formatCurrency = (amount: number, symbol: string = '₦'): string => {
  return `${symbol}${amount.toLocaleString('en-US')}`
}

export const formatDate = (iso: string): string => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-NG', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const SAMPLE_SALES: import('./types').SaleRecord[] = [
  {
    id: 'sample-1',
    amount: 3500,
    paymentMethod: 'cash',
    itemLabel: 'Ankara fabric x2',
    syncStatus: 'synced',
    transferConfirmed: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    syncedAt: new Date(Date.now() - 3000000).toISOString(),
  },
  {
    id: 'sample-2',
    amount: 7000,
    paymentMethod: 'transfer',
    itemLabel: 'Beaded necklace set',
    syncStatus: 'synced',
    transferConfirmed: true,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    syncedAt: new Date(Date.now() - 6000000).toISOString(),
  },
  {
    id: 'sample-3',
    amount: 1500,
    paymentMethod: 'mobile_money',
    itemLabel: 'Hand fan',
    syncStatus: 'synced',
    transferConfirmed: false,
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    syncedAt: new Date(Date.now() - 9000000).toISOString(),
  },
]