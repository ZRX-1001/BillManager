// ===== Key naming =====
const ACCOUNTS_KEY = 'expense-tracker-accounts'
const ACTIVE_ACCOUNT_KEY = 'expense-tracker-active-account'

function expenseKey(accountId) { return `account_${accountId}_expenses` }
function categoryKey(accountId) { return `account_${accountId}_categories` }
function settingKey(accountId) { return `account_${accountId}_settings` }

// ===== Accounts metadata =====
export function loadAccounts() {
  try {
    const data = localStorage.getItem(ACCOUNTS_KEY)
    return data ? JSON.parse(data) : []
  } catch { return [] }
}

export function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

export function loadActiveAccountId() {
  return localStorage.getItem(ACTIVE_ACCOUNT_KEY) || null
}

export function saveActiveAccountId(id) {
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, id)
}

// ===== Per-account expenses =====
export function loadExpenses(accountId) {
  try {
    const data = localStorage.getItem(expenseKey(accountId))
    return data ? JSON.parse(data) : []
  } catch { return [] }
}

export function saveExpenses(accountId, expenses) {
  localStorage.setItem(expenseKey(accountId), JSON.stringify(expenses))
}

// ===== Per-account categories =====
export function loadCategories(accountId) {
  try {
    const data = localStorage.getItem(categoryKey(accountId))
    return data ? JSON.parse(data) : null
  } catch { return null }
}

export function saveCategories(accountId, categories) {
  localStorage.setItem(categoryKey(accountId), JSON.stringify(categories))
}

// ===== Per-account settings =====
export function loadSettings(accountId) {
  try {
    const data = localStorage.getItem(settingKey(accountId))
    return data ? JSON.parse(data) : null
  } catch { return null }
}

export function saveSettings(accountId, settings) {
  localStorage.setItem(settingKey(accountId), JSON.stringify(settings))
}

// ===== Clean up account data =====
export function removeAccountData(accountId) {
  localStorage.removeItem(expenseKey(accountId))
  localStorage.removeItem(categoryKey(accountId))
  localStorage.removeItem(settingKey(accountId))
}

// ===== Local folder sync (File System Access API) =====

let folderHandle = null

export function getFolderHandle() {
  return folderHandle
}

export function setFolderHandle(handle) {
  folderHandle = handle
}

export function isFileSystemAPISupported() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

export async function pickFolder() {
  if (!isFileSystemAPISupported()) {
    throw new Error('当前浏览器不支持本地文件夹功能，请使用 Chrome 或 Edge')
  }
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
  folderHandle = handle
  return handle
}

// Persist folder handle permission in IndexedDB (handles are not JSON-serializable)
// We use a simpler approach: request permission on each page load
export async function verifyFolderPermission(handle) {
  if (!handle) return false
  const opts = { mode: 'readwrite' }
  const permission = await handle.queryPermission(opts)
  if (permission === 'granted') {
    folderHandle = handle
    return true
  }
  const result = await handle.requestPermission(opts)
  if (result === 'granted') {
    folderHandle = handle
    return true
  }
  return false
}

async function writeFileInFolder(handle, fileName, data) {
  try {
    const fileHandle = await handle.getFileHandle(fileName, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(data, null, 2))
    await writable.close()
  } catch (err) {
    console.error(`Failed to write ${fileName}:`, err)
  }
}

async function readFileInFolder(handle, fileName) {
  try {
    const fileHandle = await handle.getFileHandle(fileName)
    const file = await fileHandle.getFile()
    const text = await file.text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

// Sync all data for an account to the bound local folder
export async function syncAccountToFolder(accountId) {
  if (!folderHandle) return
  const expenses = loadExpenses(accountId)
  const categories = loadCategories(accountId)
  const settings = loadSettings(accountId)

  // Write into a subfolder per account
  let accountDir
  try {
    accountDir = await folderHandle.getDirectoryHandle(accountId, { create: true })
  } catch {
    accountDir = folderHandle
  }

  await writeFileInFolder(accountDir, 'expenses.json', expenses)
  await writeFileInFolder(accountDir, 'categories.json', categories)
  await writeFileInFolder(accountDir, 'settings.json', settings)
}

// Load data for an account from the bound local folder
export async function loadAccountFromFolder(accountId) {
  if (!folderHandle) return null
  let accountDir
  try {
    accountDir = await folderHandle.getDirectoryHandle(accountId)
  } catch {
    return null
  }

  const expenses = await readFileInFolder(accountDir, 'expenses.json')
  const categories = await readFileInFolder(accountDir, 'categories.json')
  const settings = await readFileInFolder(accountDir, 'settings.json')

  if (!expenses) return null
  return { expenses, categories, settings }
}

// ===== JSON export/import (unchanged, but now per-account) =====
export function exportToJSON(expenses, categories, settings, accountName = '') {
  const name = accountName || '数据'
  downloadJSON({ expenses, categories, settings }, `记账_${name}_${new Date().toISOString().slice(0, 10)}.json`)
}

export function exportDataJSON(data, filename) {
  downloadJSON(data, filename)
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (!data.expenses || !Array.isArray(data.expenses)) {
          reject(new Error('无效的数据格式：缺少支出数据'))
          return
        }
        resolve({
          expenses: data.expenses || [],
          categories: data.categories || null,
          settings: data.settings || null,
        })
      } catch {
        reject(new Error('文件解析失败，请检查JSON格式'))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}
