import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import {
  loadExpenses, saveExpenses,
  loadCategories, saveCategories,
  loadSettings, saveSettings,
  loadAccounts, saveAccounts,
  loadActiveAccountId, saveActiveAccountId,
  removeAccountData,
  syncAccountToFolder, exportToJSON, importFromJSON,
  restoreFolderHandle,
} from '../utils/storage'
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, DEFAULT_ACCOUNT } from '../data/defaults'

const AppContext = createContext(null)

const initialState = {
  accounts: [],
  activeAccountId: null,
  expenses: [],
  categories: [],
  settings: DEFAULT_SETTINGS,
  activeTab: 'dashboard',
  editingExpense: null,
  showForm: false,
  folderBound: false,
  layoutMode: 'mobile',
  theme: 'light',
}

// ---- helpers ----
function ensureAccount(accounts, id) {
  return accounts.find(a => a.id === id) || null
}

function buildSyncPayload(state) {
  return {
    expenses: state.expenses,
    categories: state.categories,
    settings: state.settings,
  }
}

function reducer(state, action) {
  switch (action.type) {

    // ---- Init ----
    case 'INIT_DATA':
      return {
        ...state,
        accounts: action.payload.accounts,
        activeAccountId: action.payload.activeAccountId,
        expenses: action.payload.expenses,
        categories: action.payload.categories,
        settings: action.payload.settings,
        folderBound: action.payload.folderBound || false,
        layoutMode: action.payload.layoutMode || 'mobile',
        theme: action.payload.theme || 'light',
      }

    // ---- Account management ----
    case 'CREATE_ACCOUNT': {
      const newAccounts = [...state.accounts, action.payload]
      saveAccounts(newAccounts)
      saveCategories(action.payload.id, DEFAULT_CATEGORIES)
      saveSettings(action.payload.id, DEFAULT_SETTINGS)
      saveExpenses(action.payload.id, [])
      return { ...state, accounts: newAccounts }
    }

    case 'DELETE_ACCOUNT': {
      const newAccounts = state.accounts.filter(a => a.id !== action.payload)
      saveAccounts(newAccounts)
      removeAccountData(action.payload)
      return { ...state, accounts: newAccounts }
    }

    case 'SWITCH_ACCOUNT': {
      const { id, expenses, categories, settings } = action.payload
      saveActiveAccountId(id)
      return {
        ...state,
        activeAccountId: id,
        expenses,
        categories,
        settings,
        showForm: false,
        editingExpense: null,
      }
    }

    case 'UPDATE_ACCOUNT': {
      const newAccounts = state.accounts.map(a =>
        a.id === action.payload.id ? { ...a, ...action.payload } : a
      )
      saveAccounts(newAccounts)
      return { ...state, accounts: newAccounts }
    }

    // ---- Expenses (per-account) ----
    case 'ADD_EXPENSE': {
      const newExpenses = [action.payload, ...state.expenses]
      saveExpenses(state.activeAccountId, newExpenses)
      syncAccountToFolder(state.activeAccountId)
      return { ...state, expenses: newExpenses, showForm: false, editingExpense: null }
    }

    case 'UPDATE_EXPENSE': {
      const newExpenses = state.expenses.map(e =>
        e.id === action.payload.id ? action.payload : e
      )
      saveExpenses(state.activeAccountId, newExpenses)
      syncAccountToFolder(state.activeAccountId)
      return { ...state, expenses: newExpenses, showForm: false, editingExpense: null }
    }

    case 'DELETE_EXPENSE': {
      const newExpenses = state.expenses.filter(e => e.id !== action.payload)
      saveExpenses(state.activeAccountId, newExpenses)
      syncAccountToFolder(state.activeAccountId)
      return { ...state, expenses: newExpenses }
    }

    // ---- Categories (per-account) ----
    case 'ADD_CATEGORY': {
      const newCategories = [...state.categories, action.payload]
      saveCategories(state.activeAccountId, newCategories)
      syncAccountToFolder(state.activeAccountId)
      return { ...state, categories: newCategories }
    }

    case 'UPDATE_CATEGORY': {
      const newCategories = state.categories.map(c =>
        c.id === action.payload.id ? action.payload : c
      )
      saveCategories(state.activeAccountId, newCategories)
      syncAccountToFolder(state.activeAccountId)
      return { ...state, categories: newCategories }
    }

    case 'DELETE_CATEGORY': {
      const newCategories = state.categories.filter(c => c.id !== action.payload)
      saveCategories(state.activeAccountId, newCategories)
      syncAccountToFolder(state.activeAccountId)
      return { ...state, categories: newCategories }
    }

    // ---- Settings (per-account) ----
    case 'UPDATE_SETTINGS': {
      const newSettings = { ...state.settings, ...action.payload }
      saveSettings(state.activeAccountId, newSettings)
      syncAccountToFolder(state.activeAccountId)
      return { ...state, settings: newSettings }
    }

    // ---- UI ----
    case 'SET_TAB':
      return { ...state, activeTab: action.payload }

    case 'OPEN_FORM':
      return { ...state, showForm: true, editingExpense: action.payload || null }

    case 'CLOSE_FORM':
      return { ...state, showForm: false, editingExpense: null }

    // ---- Import ----
    case 'IMPORT_DATA': {
      const { expenses, categories, settings } = action.payload
      saveExpenses(state.activeAccountId, expenses)
      if (categories) saveCategories(state.activeAccountId, categories)
      if (settings) saveSettings(state.activeAccountId, settings)
      syncAccountToFolder(state.activeAccountId)
      return {
        ...state,
        expenses,
        categories: categories || state.categories,
        settings: settings || state.settings,
      }
    }

    case 'SET_THEME':
      localStorage.setItem('expense-tracker-theme', action.payload)
      return { ...state, theme: action.payload }

    case 'SET_LAYOUT':
      localStorage.setItem('expense-tracker-layout', action.payload)
      return { ...state, layoutMode: action.payload }

    case 'SET_FOLDER_BOUND':
      return { ...state, folderBound: action.payload }

    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // ---- Init ----
  useEffect(() => {
    let accounts = loadAccounts()
    let activeId = loadActiveAccountId()

    // First time: create default account
    if (accounts.length === 0) {
      accounts = [{ ...DEFAULT_ACCOUNT, id: 'default', createdAt: new Date().toISOString() }]
      saveAccounts(accounts)
      saveCategories('default', DEFAULT_CATEGORIES)
      saveSettings('default', DEFAULT_SETTINGS)
      saveExpenses('default', [])
      activeId = 'default'
      saveActiveAccountId(activeId)
    }

    // Ensure active account exists
    if (!accounts.find(a => a.id === activeId)) {
      activeId = accounts[0].id
      saveActiveAccountId(activeId)
    }

    // Load active account data
    const expenses = loadExpenses(activeId)
    let categories = loadCategories(activeId)
    let settings = loadSettings(activeId)
    if (!categories) { categories = DEFAULT_CATEGORIES; saveCategories(activeId, categories) }
    if (!settings) { settings = DEFAULT_SETTINGS; saveSettings(activeId, settings) }

    dispatch({
      type: 'INIT_DATA',
      payload: {
        accounts, activeAccountId: activeId, expenses, categories, settings,
        layoutMode: localStorage.getItem('expense-tracker-layout') || 'mobile',
        theme: localStorage.getItem('expense-tracker-theme') || 'light',
      },
    })

    // Restore folder sync handle from IndexedDB (survives page reload)
    restoreFolderHandle().then(ok => {
      if (ok) dispatch({ type: 'SET_FOLDER_BOUND', payload: true })
    })
  }, [])

  // ---- Account actions ----
  const switchAccount = useCallback((accountId) => {
    if (accountId === state.activeAccountId) return
    const expenses = loadExpenses(accountId)
    let categories = loadCategories(accountId)
    let settings = loadSettings(accountId)
    if (!categories) { categories = DEFAULT_CATEGORIES; saveCategories(accountId, categories) }
    if (!settings) { settings = DEFAULT_SETTINGS; saveSettings(accountId, settings) }
    dispatch({
      type: 'SWITCH_ACCOUNT',
      payload: { id: accountId, expenses, categories, settings },
    })
  }, [state.activeAccountId])

  const createAccount = useCallback((name, icon) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const account = {
      id,
      name,
      icon,
      createdAt: new Date().toISOString(),
      syncEnabled: false,
      syncDirName: '',
    }
    dispatch({ type: 'CREATE_ACCOUNT', payload: account })
    return account
  }, [])

  const deleteAccount = useCallback((accountId) => {
    if (state.accounts.length <= 1) return false
    dispatch({ type: 'DELETE_ACCOUNT', payload: accountId })
    // If deleting the active account, switch to the first remaining one
    if (accountId === state.activeAccountId) {
      const remaining = state.accounts.filter(a => a.id !== accountId)
      if (remaining.length > 0) {
        switchAccount(remaining[0].id)
      }
    }
    return true
  }, [state.accounts, state.activeAccountId, switchAccount])

  // ---- Sync ----
  const triggerSync = useCallback(() => {
    if (state.activeAccountId) {
      syncAccountToFolder(state.activeAccountId)
    }
  }, [state.activeAccountId])

  // ---- Export ----
  const handleExport = useCallback(() => {
    const account = ensureAccount(state.accounts, state.activeAccountId)
    exportToJSON(state.expenses, state.categories, state.settings, account?.name)
  }, [state.expenses, state.categories, state.settings, state.accounts, state.activeAccountId])

  const handleImport = useCallback(async (file) => {
    const data = await importFromJSON(file)
    dispatch({ type: 'IMPORT_DATA', payload: data })
    return data
  }, [])

  const value = {
    state, dispatch,
    switchAccount, createAccount, deleteAccount,
    triggerSync, handleExport, handleImport,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
