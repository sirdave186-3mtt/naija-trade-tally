export type PaymentMethod = 'cash' | 'transfer' | 'mobile_money'

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed'

export interface SaleRecord {
  id: string
  local_id?: string
  amount: number
  paymentMethod: PaymentMethod
  itemLabel: string
  syncStatus: SyncStatus
  transferConfirmed: boolean
  createdAt: string
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

export interface Database {
  public: {
    Tables: {
      sales: {
        Row: {
          id: string
          amount: number
          item_label: string
          payment_method: string
          status: string
          transfer_confirmed: boolean
          sync_status: string
          created_at: string
          synced_at: string | null
        }
        Insert: {
          id?: string
          amount: number
          item_label?: string
          payment_method: string
          status?: string
          transfer_confirmed?: boolean
          sync_status?: string
          created_at?: string
          synced_at?: string | null
        }
        Update: {
          id?: string
          amount?: number
          item_label?: string
          payment_method?: string
          status?: string
          transfer_confirmed?: boolean
          sync_status?: string
          created_at?: string
          synced_at?: string | null
        }
      }
    }
  }
}