import type { City } from './types.ts'

export interface TripStop {
  citySlug: string
  days: number
}

export interface TripPlanInput {
  homeCurrency: string
  dailyMealBudgetLocal?: number
  stops: TripStop[]
}

export interface TripStopBreakdown {
  city: City
  days: number
  meals: number
  transit: number
  dishPortions: number
  dishCost: number
  estimatedLodging: number
  subtotal: number
}

export interface TripPlanResult {
  homeCurrency: string
  stops: TripStopBreakdown[]
  total: number
  totalDays: number
  fxNote: string
}

export interface WageEquivalentInput {
  fromSlug: string
  toSlug: string
  monthlyNetWage: number
}

export interface WageEquivalentResult {
  from: City
  to: City
  inputWage: number
  inputCurrency: string
  equivalentWage: number
  equivalentCurrency: string
  purchasingPowerIndex: number
  rentBurdenFrom: number
  rentBurdenTo: number
  dishPortionsFrom: number
  dishPortionsTo: number
  narrative: string
}

export interface SavedComparison {
  id: string
  fromSlug: string
  toSlug: string
  budget: number
  mode: 'flat' | 'hourly'
  label: string
  createdAt: string
}

export interface FxStoryPoint {
  monthsAgo: number
  label: string
  rate: number
  budgetInTarget: number
  dishPortions: number
}

export interface FxStoryResult {
  fromCurrency: string
  toCurrency: string
  budget: number
  cityName: string
  dishName: string
  points: FxStoryPoint[]
}

export interface SpendScenario {
  id: string
  name: string
  feePct: number
  blurb: string
}

export interface SpendCompareResult {
  amount: number
  currency: string
  scenarios: Array<{
    id: string
    name: string
    feePct: number
    fee: number
    net: number
    blurb: string
  }>
  bestId: string
  savingsVsWorst: number
}

export interface PriceAlert {
  id: string
  fromCurrency: string
  toCurrency: string
  /** Fire when USD→target (or pair) change30dPct is at or below this (more negative = cheaper target) */
  thresholdPct: number
  label: string
  createdAt: string
  lastCheckedAt?: string
  lastChange30dPct?: number | null
  triggered?: boolean
}

export interface UserSyncPayload {
  saved: SavedComparison[]
  alerts: PriceAlert[]
  trips: Array<{ id: string; name: string; plan: TripPlanInput; savedAt: string }>
  updatedAt: string
}

export interface ColSnapshot {
  source: 'seed' | 'numbeo'
  available: boolean
  note: string
  burgerMeal?: number
  cappuccino?: number
  transitTicket?: number
  oneBedRentCenter?: number
}
