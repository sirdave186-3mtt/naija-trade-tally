import type { SaleRecord, SyncStatus } from '../types'
import { supabase } from '../integrations/supabase/client'
import { STORAGE_KEYS, generateId, SAMPLE_SALES } from '../constants'
import { toast } from 'sonner'

// ── Local Storage Engine ─────────────────────────────────────────────

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveJSON(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data))
}

// ── Sales CRUD ───────────────────────────────────────────────────────

export function getSales(): SaleRecord[] {
  return loadJSON<SaleRecord[]>(STORAGE_KEYS.SALES, [])
}

export function saveSale(sale: SaleRecord) {
  const sales = getSales()
  sales.unshift(sale)
  saveJSON(STORAGE_KEYS.SALES, sales)
}

export function updateSaleStatus(id: string, status: SyncStatus, syncedAt?: string) {
  const sales = getSales()
  const idx = sales.findIndex((s) => s.id === id)
  if (idx === -1) return
  sales[idx] = { ...sales[idx], syncStatus: status, ...(syncedAt ? { syncedAt } : {}) }
  saveJSON(STORAGE_KEYS.SALES, sales)
}

export function confirmTransfer(id: string) {
  const sales = getSales()
  const idx = sales.findIndex((s) => s.id === id)
  if (idx === -1) return
  sales[idx] = { ...sales[idx], transferConfirmed: true }
  saveJSON(STORAGE_KEYS.SALES, sales)
}

export function deleteSale(id: string) {
  const sales = getSales().filter((s) => s.id !== id)
  saveJSON(STORAGE_KEYS.SALES, sales)
}

// ── Sync Queue Engine ────────────────────────────────────────────────

type SyncQueueItem = { saleId: string; retries: number }

function getSyncQueue(): SyncQueueItem[] {
  return loadJSON<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE, [])
}

function saveSyncQueue(queue: SyncQueueItem[]) {
  saveJSON(STORAGE_KEYS.SYNC_QUEUE, queue)
}

export function enqueueSync(saleId: string) {
  const queue = getSyncQueue()
  if (!queue.find((q) => q.saleId === saleId)) {
    queue.push({ saleId, retries: 0 })
    saveSyncQueue(queue)
  }
}

export function dequeueSync(saleId: string) {
  const queue = getSyncQueue().filter((q) => q.saleId !== saleId)
  saveSyncQueue(queue)
}

// ── Supabase Sync Engine ─────────────────────────────────────────────

async function pushSaleToSupabase(sale: SaleRecord): Promise<boolean> {
  const { error } = await supabase.from('sales').upsert(
    {
      id: sale.id,
      amount: sale.amount,
      item_label: sale.itemLabel,
      payment_method: sale.paymentMethod,
      transfer_confirmed: sale.transferConfirmed,
      sync_status: 'synced',
      created_at: sale.createdAt,
      synced_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )
  if (error) throw error
  return true
}

export async function processSyncQueue(onProgress?: (id: string, status: SyncStatus) => void) {
  const queue = getSyncQueue()
  if (queue.length === 0) return

  for (const item of queue) {
    const sales = getSales()
    const sale = sales.find((s) => s.id === item.saleId)
    if (!sale) {
      dequeueSync(item.saleId)
      continue
    }

    updateSaleStatus(item.saleId, 'syncing')
    onProgress?.(item.saleId, 'syncing')

    try {
      await pushSaleToSupabase(sale)
      const now = new Date().toISOString()
      updateSaleStatus(item.saleId, 'synced', now)
      dequeueSync(item.saleId)
      onProgress?.(item.saleId, 'synced')
    } catch (err) {
      item.retries++
      if (item.retries >= 5) {
        updateSaleStatus(item.saleId, 'failed')
        onProgress?.(item.saleId, 'failed')
        toast.error(`Sync failed for ${sale.itemLabel || 'sale'} — will retry later`)
      } else {
        saveSyncQueue(queue)
        onProgress?.(item.saleId, 'pending')
      }
    }
  }
}

// ── Fetch sales from Supabase and merge with local ───────────────────

export async function fetchRemoteSales(): Promise<SaleRecord[]> {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    toast.error(error.message || 'Failed to fetch sales from cloud')
    return []
  }

  return (data || []).map((row) => ({
    id: row.id,
    amount: row.amount,
    paymentMethod: row.payment_method as SaleRecord['paymentMethod'],
    itemLabel: row.item_label || '',
    syncStatus: 'synced' as SyncStatus,
    transferConfirmed: row.transfer_confirmed,
    createdAt: row.created_at,
    syncedAt: row.synced_at,
  }))
}

export async function mergeRemoteSales() {
  const remoteSales = await fetchRemoteSales()
  if (remoteSales.length === 0) return

  const localSales = getSales()
  const localIds = new Set(localSales.map((s) => s.id))

  // Add remote sales that aren't in local storage
  const newSales = remoteSales.filter((s) => !localIds.has(s.id))
  if (newSales.length > 0) {
    saveJSON(STORAGE_KEYS.SALES, [...newSales, ...localSales])
  }
}

// ── Network Status ───────────────────────────────────────────────────

type NetworkListener = (online: boolean) => void
const listeners = new Set<NetworkListener>()

export function onNetworkChange(fn: NetworkListener) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function notifyNetworkListeners(online: boolean) {
  listeners.forEach((fn) => fn(online))
}

// ── Online / Offline Detection ───────────────────────────────────────

let _manualOffline = false

export function setManualOffline(offline: boolean) {
  _manualOffline = offline
}

export function isOnline(): boolean {
  if (_manualOffline) return false
  return navigator.onLine
}

// ── Daily Summary ────────────────────────────────────────────────────

export function computeDailySummary(): import('../types').DailySummary {
  const sales = getSales()
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const todaySales = sales.filter((s) => s.createdAt.slice(0, 10) === todayStr)

  const cashTotal = todaySales.filter((s) => s.paymentMethod === 'cash').reduce((a, s) => a + s.amount, 0)
  const transferTotal = todaySales.filter((s) => s.paymentMethod === 'transfer').reduce((a, s) => a + s.amount, 0)
  const mobileMoneyTotal = todaySales.filter((s) => s.paymentMethod === 'mobile_money').reduce((a, s) => a + s.amount, 0)

  return {
    date: todayStr,
    totalRevenue: cashTotal + transferTotal + mobileMoneyTotal,
    cashTotal,
    transferTotal,
    mobileMoneyTotal,
    salesCount: todaySales.length,
    pendingSyncCount: todaySales.filter((s) => s.syncStatus === 'pending').length,
    failedSyncCount: todaySales.filter((s) => s.syncStatus === 'failed').length,
  }
}

// ── Settings ─────────────────────────────────────────────────────────

export function getSettings(): import('../types').VendorSettings {
  return loadJSON<import('../types').VendorSettings>(STORAGE_KEYS.SETTINGS, {
    businessName: 'NAIRIVO',
    theme: 'light',
    currencySymbol: '₦',
  })
}

export function saveSettings(settings: import('../types').VendorSettings) {
  saveJSON(STORAGE_KEYS.SETTINGS, settings)
}

// ── Seed sample data (first run) ─────────────────────────────────────

export function ensureSampleData() {
  const existing = getSales()
  if (existing.length > 0) return
  saveJSON(STORAGE_KEYS.SALES, SAMPLE_SALES)
}