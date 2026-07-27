import { getMonthRange } from './helpers'

// Generic date-range stats (replaces getMonthStats)
export function getDateRangeStats(expenses, startDate, endDate) {
  const filtered = expenses.filter(e => e.date >= startDate && e.date <= endDate)
  const total = filtered.reduce((sum, e) => sum + e.amount, 0)
  const count = filtered.length

  // Calculate days in range
  const start = new Date(startDate)
  const end = new Date(endDate)
  const daysDiff = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1)

  // For current month, use today as elapsed; otherwise use full range
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  let elapsedDays
  if (startDate <= todayStr && endDate >= todayStr) {
    const d = Math.ceil((today - start) / (1000 * 60 * 60 * 24)) + 1
    elapsedDays = Math.min(d, daysDiff)
  } else if (endDate < todayStr) {
    elapsedDays = daysDiff
  } else {
    elapsedDays = 0
  }
  const dailyAvg = elapsedDays > 0 ? total / elapsedDays : 0

  return { total, dailyAvg, count, daysInRange: daysDiff, elapsedDays, filtered }
}

// Legacy wrapper
export function getMonthStats(expenses, monthStr) {
  const { start, end } = getMonthRange(monthStr)
  return getDateRangeStats(expenses, start, end)
}

// Category breakdown (optionally filter by selected categories)
export function getCategoryBreakdown(expenses, categories, selectedCats = null) {
  const breakdown = {}
  expenses.forEach(e => {
    if (selectedCats && !selectedCats.has(e.category)) return
    breakdown[e.category] = (breakdown[e.category] || 0) + e.amount
  })

  return categories
    .filter(c => !selectedCats || selectedCats.has(c.id))
    .map(cat => ({
      ...cat,
      amount: breakdown[cat.id] || 0,
    }))
    .filter(cat => cat.amount > 0)
    .sort((a, b) => b.amount - a.amount)
}

// Daily trend for a date range
export function getDailyTrend(expenses, monthStr, startDate, endDate) {
  let start, end
  if (startDate && endDate) {
    start = startDate
    end = endDate
  } else {
    const range = getMonthRange(monthStr)
    start = range.start
    end = range.end
  }

  const filtered = expenses.filter(e => e.date >= start && e.date <= end)

  const dailyMap = {}
  filtered.forEach(e => {
    dailyMap[e.date] = (dailyMap[e.date] || 0) + e.amount
  })

  // Fill all days in range
  const trend = []
  let cur = new Date(start)
  const endD = new Date(end)
  while (cur <= endD) {
    const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
    trend.push({
      date: `${cur.getMonth() + 1}/${cur.getDate()}`,
      fullDate: dateStr,
      amount: dailyMap[dateStr] || 0,
    })
    cur.setDate(cur.getDate() + 1)
  }
  return trend
}

// Monthly comparison (for bar chart showing multiple months)
export function getMonthlyComparison(expenses, categories, numMonths = 6) {
  const months = []
  const now = new Date()
  for (let i = numMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${d.getMonth() + 1}月`,
    })
  }

  return months.map(m => {
    const { start, end } = getMonthRange(m.key)
    const monthExps = expenses.filter(e => e.date >= start && e.date <= end)
    const total = monthExps.reduce((s, e) => s + e.amount, 0)
    return { name: m.label, month: m.key, total }
  })
}

// Budget progress
export function getBudgetProgress(categories, expenses, monthStr) {
  const breakdown = getCategoryBreakdown(expenses, categories)
  const breakdownMap = {}
  breakdown.forEach(b => { breakdownMap[b.id] = b.amount })

  return categories
    .filter(c => c.budget && c.budget > 0)
    .map(c => ({
      ...c,
      spent: breakdownMap[c.id] || 0,
      budget: c.budget,
      percentage: Math.min(100, Math.round(((breakdownMap[c.id] || 0) / c.budget) * 100)),
      overBudget: (breakdownMap[c.id] || 0) > c.budget,
    }))
    .sort((a, b) => b.percentage - a.percentage)
}
