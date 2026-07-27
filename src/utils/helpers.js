export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function formatCurrency(amount, symbol = '¥') {
  return `${symbol}${Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(dateStr) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function formatDateFull(dateStr) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getCurrentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function getMonthRange(monthStr) {
  const [year, month] = monthStr.split('-').map(Number)
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
  return { start, end }
}

export function isInMonth(dateStr, monthStr) {
  return dateStr.startsWith(monthStr)
}
