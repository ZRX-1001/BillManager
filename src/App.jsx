import { useEffect } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import Header from './components/Header/Header'
import Dashboard from './components/Dashboard/Dashboard'
import ExpenseList from './components/ExpenseList/ExpenseList'
import ExpenseForm from './components/ExpenseForm/ExpenseForm'
import Settings from './components/Settings/Settings'
import styles from './App.module.css'

const TABS = [
  { key: 'dashboard', label: '概览', icon: '📊' },
  { key: 'list', label: '明细', icon: '💸' },
  { key: 'add', label: '记账', icon: '➕' },
  { key: 'settings', label: '设置', icon: '⚙️' },
]

function AppContent() {
  const { state, dispatch } = useApp()
  const isDesktop = state.layoutMode === 'desktop'

  // Apply layout + theme classes to :root
  useEffect(() => {
    const root = document.documentElement
    if (state.layoutMode === 'desktop') {
      document.getElementById('root')?.classList.add('desktop')
    } else {
      document.getElementById('root')?.classList.remove('desktop')
    }
    if (state.theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [state.layoutMode, state.theme])

  const handleTabClick = (key) => {
    if (key === 'add') {
      dispatch({ type: 'OPEN_FORM', payload: null })
      return
    }
    dispatch({ type: 'SET_TAB', payload: key })
  }

  const renderPage = () => {
    switch (state.activeTab) {
      case 'dashboard': return <Dashboard />
      case 'list':      return <ExpenseList />
      case 'settings':  return <Settings />
      default:          return <Dashboard />
    }
  }

  return (
    <div className={styles.app}>
      <Header tabs={TABS} onTabClick={handleTabClick} />
      <main className={styles.main}>
        {renderPage()}
      </main>

      {/* Bottom tab bar: mobile only */}
      {!isDesktop && (
        <nav className={styles.tabBar}>
          {TABS.map(tab => {
            const active = state.activeTab === tab.key || (tab.key === 'add' && state.showForm)
            return (
              <button
                key={tab.key}
                className={`${styles.tab} ${active ? styles.tabActive : ''} ${tab.key === 'add' ? styles.tabAdd : ''}`}
                onClick={() => handleTabClick(tab.key)}
              >
                <span className={styles.tabIcon}>{tab.icon}</span>
                <span className={styles.tabLabel}>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      )}

      <ExpenseForm />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
