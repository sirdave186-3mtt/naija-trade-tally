export type PaymentMethod = 'cash' | 'transfer' | 'mobile_money'

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed'

export interface SaleRecord {
  id: string
  amount: number
  paymentMethod: PaymentMethod
  itemLabel: string
  syncStatus: SyncStatus
  transferConfirmed: boolean
  createdAt: string // ISO timestamp
  syncedAt: string | null
}

export interface DailySummary {
  date: string
  totalRevenue: number
  cashTotal: number
  transferTotal: number
  mobileMoneyTotal: number
  salesCount: number
  pendingSyncCount: number
  failedSyncCount: number
}

export interface VendorSettings {
  businessName: string
  theme: 'light' | 'dark' | 'system'
  currencySymbol: '₦' | 'NGN'
}