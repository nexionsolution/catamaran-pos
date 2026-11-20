import { createBill } from '../services/api'

export interface OfflineBillItem {
  name: string
  quantity: number
  unitPrice: number
  total: number
  code?: string
  duration?: string
  startTime?: string
  endTime?: string
  isCustomPrice?: boolean
  customPrice?: number
}

export interface OfflineBill {
  id: string
  offlineBillNumber: string
  billData: {
    orderType: string
    paymentMethod: string
    customerName?: string
    customerReference?: string
    items: OfflineBillItem[]
    subtotal: number
    discount?: number
    serviceCharge?: number
    total: number
    amountTendered?: number
    changeDue?: number
    splitCashAmount?: number
    splitCardAmount?: number
    cashier?: string
    date?: string
    time?: string
    status?: 'Open' | 'Settled'
    saleType?: string
  }
  createdAt: string
  synced: boolean
  syncAttempts: number
  lastSyncError?: string
}

const OFFLINE_QUEUE_KEY = 'catamaran_pos_offline_bills_queue'
const OFFLINE_COUNTER_KEY = 'catamaran_pos_offline_counter'

// --------------------------------------------------------------------------
// Storage Helpers
// --------------------------------------------------------------------------
export function getOfflineQueue(): OfflineBill[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as OfflineBill[]
  } catch (err) {
    console.warn('Failed reading offline bills queue from localStorage:', err)
    return []
  }
}

function saveOfflineQueue(queue: OfflineBill[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
    notifyNetworkSyncListeners()
  } catch (err) {
    console.error('Failed writing offline bills queue to localStorage:', err)
  }
}

export function getNextOfflineBillNumber(): string {
  try {
    const raw = localStorage.getItem(OFFLINE_COUNTER_KEY)
    const current = raw ? parseInt(raw, 10) : 1000
    const next = current + 1
    localStorage.setItem(OFFLINE_COUNTER_KEY, String(next))
    return `OFF-${next}`
  } catch {
    return `OFF-${Date.now().toString().slice(-4)}`
  }
}

// --------------------------------------------------------------------------
// Queue Operations
// --------------------------------------------------------------------------
export function queueBillOffline(payload: OfflineBill['billData']): OfflineBill {
  const offlineBillNumber = getNextOfflineBillNumber()
  const now = new Date()

  const dateStr =
    payload.date ||
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(now)

  const timeStr =
    payload.time ||
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Colombo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(now)

  const newBill: OfflineBill = {
    id: `off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    offlineBillNumber,
    billData: {
      ...payload,
      date: dateStr,
      time: timeStr,
      status: 'Settled'
    },
    createdAt: now.toISOString(),
    synced: false,
    syncAttempts: 0
  }

  const queue = getOfflineQueue()
  queue.push(newBill)
  saveOfflineQueue(queue)

  console.log(`[OfflineSync] Queued offline bill: #${offlineBillNumber}`, newBill)
  return newBill
}

export function removeBillFromQueue(id: string): void {
  const queue = getOfflineQueue().filter((b) => b.id !== id)
  saveOfflineQueue(queue)
}

// --------------------------------------------------------------------------
// Network State & Synchronization Engine
// --------------------------------------------------------------------------
let isOnlineState = typeof navigator !== 'undefined' ? navigator.onLine : true
let isSyncingState = false
let lastSyncedAtState: string | null = null

type SyncListener = () => void
const syncListeners = new Set<SyncListener>()

export function notifyNetworkSyncListeners(): void {
  syncListeners.forEach((listener) => {
    try {
      listener()
    } catch (err) {
      console.error('Sync listener error:', err)
    }
  })
}

export function isDeviceOnline(): boolean {
  return isOnlineState
}

export function getPendingOfflineCount(): number {
  return getOfflineQueue().filter((b) => !b.synced).length
}

export async function pingBackend(): Promise<boolean> {
  if (typeof window === 'undefined') return true
  try {
    const baseUrl = import.meta.env.VITE_API_URL || ''
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3500)

    const res = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    const ok = res.ok
    if (ok !== isOnlineState) {
      isOnlineState = ok
      notifyNetworkSyncListeners()
      if (ok) {
        // Trigger background sync when reconnected
        syncPendingBills().catch(() => {})
      }
    }
    return ok
  } catch {
    if (isOnlineState) {
      isOnlineState = false
      notifyNetworkSyncListeners()
    }
    return false
  }
}

export async function syncPendingBills(): Promise<{ total: number; synced: number; failed: number }> {
  const queue = getOfflineQueue()
  const pending = queue.filter((b) => !b.synced)

  if (pending.length === 0) {
    return { total: 0, synced: 0, failed: 0 }
  }

  if (isSyncingState) {
    return { total: pending.length, synced: 0, failed: 0 }
  }

  isSyncingState = true
  notifyNetworkSyncListeners()

  let syncedCount = 0
  let failedCount = 0
  const remainingQueue: OfflineBill[] = []

  console.log(`[OfflineSync] Starting auto-sync for ${pending.length} pending offline bills...`)

  for (const item of queue) {
    if (item.synced) {
      continue // remove old synced bills
    }

    try {
      // Send bill to MongoDB Atlas via standard createBill API
      const response = await createBill({
        ...item.billData,
        status: item.billData.status === 'Open' ? 'Open' : 'Settled',
        discount: item.billData.discount ?? 0,
        serviceCharge: item.billData.serviceCharge ?? 0,
        customerReference: item.billData.customerName || `Offline Sync (${item.offlineBillNumber})`,
        notes: `Auto-synced from offline queue (Original: #${item.offlineBillNumber} at ${item.billData.date} ${item.billData.time})`
      })

      console.log(`[OfflineSync] Successfully synced #${item.offlineBillNumber} -> Cloud #${response.billNumber}`)
      syncedCount++
    } catch (err: unknown) {
      failedCount++
      const errorMsg = err instanceof Error ? err.message : 'Network sync failed'
      console.warn(`[OfflineSync] Failed to sync bill #${item.offlineBillNumber}:`, errorMsg)

      item.syncAttempts = (item.syncAttempts || 0) + 1
      item.lastSyncError = errorMsg
      remainingQueue.push(item)
    }
  }

  saveOfflineQueue(remainingQueue)
  isSyncingState = false
  lastSyncedAtState = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  notifyNetworkSyncListeners()

  if (syncedCount > 0) {
    window.dispatchEvent(
      new CustomEvent('offline-sync-completed', {
        detail: {
          synced: syncedCount,
          failed: failedCount,
          message: `Synced ${syncedCount} offline bill${syncedCount > 1 ? 's' : ''} to MongoDB Atlas!`
        }
      })
    )
  }

  return { total: pending.length, synced: syncedCount, failed: failedCount }
}

// --------------------------------------------------------------------------
// Global Browser Event Listeners
// --------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[OfflineSync] Browser reported ONLINE')
    pingBackend().then((online) => {
      if (online) {
        syncPendingBills().catch(() => {})
      }
    })
  })

  window.addEventListener('offline', () => {
    console.log('[OfflineSync] Browser reported OFFLINE')
    isOnlineState = false
    notifyNetworkSyncListeners()
  })

  // Periodic heartbeat every 15 seconds to check true API reachability
  setInterval(() => {
    pingBackend().catch(() => {})
  }, 15000)

  // Initial check on load
  setTimeout(() => {
    pingBackend().then((online) => {
      if (online) {
        syncPendingBills().catch(() => {})
      }
    })
  }, 2000)
}

// --------------------------------------------------------------------------
// React Hook
// --------------------------------------------------------------------------
import { useEffect, useState } from 'react'

export function useNetworkSync(): {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  pendingBills: OfflineBill[]
  queueBill: (payload: OfflineBill['billData']) => OfflineBill
  syncNow: () => Promise<{ total: number; synced: number; failed: number }>
  lastSyncedAt: string | null
} {
  const [, setTick] = useState(0)

  useEffect(() => {
    const listener = () => setTick((prev) => prev + 1)
    syncListeners.add(listener)
    return () => {
      syncListeners.delete(listener)
    }
  }, [])

  return {
    isOnline: isOnlineState,
    isSyncing: isSyncingState,
    pendingCount: getPendingOfflineCount(),
    pendingBills: getOfflineQueue().filter((b) => !b.synced),
    queueBill: queueBillOffline,
    syncNow: syncPendingBills,
    lastSyncedAt: lastSyncedAtState
  }
}
