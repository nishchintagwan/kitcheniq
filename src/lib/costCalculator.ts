import type { Unit, MarginResult, MarginStatus } from '../types'

const BASE_UNIT_MULTIPLIERS: Record<Unit, number> = {
  kg:    1,
  gram:  0.001,
  litre: 1,
  ml:    0.001,
  piece: 1,
  dozen: 12,
}

export function toBaseUnit(quantity: number, unit: Unit): number {
  return quantity * BASE_UNIT_MULTIPLIERS[unit]
}

export function ingredientCost(quantity: number, unit: Unit, pricePerKg: number): number {
  return toBaseUnit(quantity, unit) * pricePerKg
}

export function calculateMargin(params: {
  ingredients: { quantity: number; unit: Unit; pricePerKg: number }[]
  sellingPrice: number
  serves: number
  wastagePercent: number
  overheadPercent: number
}): MarginResult {
  const { ingredients, sellingPrice, serves, wastagePercent, overheadPercent } = params

  if (serves <= 0) {
    return {
      rawCost: 0,
      wastageCost: 0,
      overheadCost: 0,
      totalCost: 0,
      marginPercent: 0,
      profitPerDish: 0,
      status: 'critical',
    }
  }

  const rawCost =
    ingredients.reduce((sum, i) => sum + ingredientCost(i.quantity, i.unit, i.pricePerKg), 0) /
    serves

  const wastageCost  = rawCost * (wastagePercent / 100)
  const overheadCost = rawCost * (overheadPercent / 100)
  const totalCost    = rawCost + wastageCost + overheadCost

  const marginPercent =
    sellingPrice <= 0 ? 0 : ((sellingPrice - totalCost) / sellingPrice) * 100

  const profitPerDish = sellingPrice - totalCost

  return {
    rawCost,
    wastageCost,
    overheadCost,
    totalCost,
    marginPercent,
    profitPerDish,
    status: getMarginStatus(marginPercent),
  }
}

export function getMarginStatus(marginPercent: number): MarginStatus {
  if (marginPercent >= 50) return 'healthy'
  if (marginPercent >= 30) return 'watch'
  return 'critical'
}

export function formatCurrency(amount: number): string {
  return '₹' + Math.round(amount).toLocaleString('en-IN')
}

export function formatMargin(percent: number): string {
  return percent.toFixed(1) + '%'
}

export function getSpikePercent(oldPrice: number, newPrice: number): number {
  return ((newPrice - oldPrice) / oldPrice) * 100
}

export function isSpikeAlert(changePercent: number): boolean {
  return Math.abs(changePercent) >= 15
}

/*
TEST — Dal Makhani example
ingredients: tomato 200g @₹60/kg, cream 100ml @₹400/litre, butter 50g @₹500/kg
sellingPrice: 280, serves: 1, wastage: 10%, overhead: 20%

rawCost      = (12 + 40 + 25) / 1 = 77
wastageCost  = 77 × 0.10 = 7.7
overheadCost = 77 × 0.20 = 15.4
totalCost    = 100.1
marginPercent = (280 - 100.1) / 280 × 100 = 64.25%
profitPerDish = 179.9
status        = 'healthy'
*/
