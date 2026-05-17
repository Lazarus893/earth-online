import { supabase, getDeviceId } from './supabase'
import type { DimensionData } from '../App'

export interface CloudGameState {
  dimensions: DimensionData[]
  quests: any[]
  streak: number
  onboarding_done: boolean
  updated_at: string
}

// Debounce sync - wait 2s after last change before syncing
let syncTimeout: ReturnType<typeof setTimeout> | null = null

export async function syncToCloud(state: { dimensions: any[]; quests: any[]; streak: number; onboardingDone: boolean }) {
  if (syncTimeout) clearTimeout(syncTimeout)
  syncTimeout = setTimeout(async () => {
    try {
      const deviceId = getDeviceId()
      await supabase.from('game_state').upsert({
        device_id: deviceId,
        dimensions: state.dimensions,
        quests: state.quests,
        streak: state.streak,
        onboarding_done: state.onboardingDone,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'device_id' })
    } catch (err) {
      console.warn('[CloudSync] Failed to sync:', err)
    }
  }, 2000)
}

export async function loadFromCloud(): Promise<CloudGameState | null> {
  try {
    const deviceId = getDeviceId()
    const { data, error } = await supabase
      .from('game_state')
      .select('*')
      .eq('device_id', deviceId)
      .single()

    if (error || !data) return null
    return data as CloudGameState
  } catch {
    return null
  }
}

// Advisor history sync
export async function saveAdvisorToCloud(dimension: string, data: { analysis: string; goals: any[]; actions: any[]; opportunities: any[] }) {
  try {
    const deviceId = getDeviceId()
    await supabase.from('advisor_history').upsert({
      device_id: deviceId,
      dimension,
      date: new Date().toISOString().slice(0, 10),
      ...data,
    }, { onConflict: 'device_id,dimension,date' })
  } catch (err) {
    console.warn('[CloudSync] Advisor sync failed:', err)
  }
}

export async function loadAdvisorFromCloud(dimension: string) {
  try {
    const deviceId = getDeviceId()
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('advisor_history')
      .select('*')
      .eq('device_id', deviceId)
      .eq('dimension', dimension)
      .eq('date', today)
      .single()
    return data || null
  } catch {
    return null
  }
}
