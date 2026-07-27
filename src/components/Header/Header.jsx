import { useApp } from '../../context/AppContext'
import { getCurrentMonth } from '../../utils/helpers'
import { getMonthStats } from '../../utils/stats'
import { formatCurrency } from '../../utils/helpers'
import AccountSwitcher from '../AccountSwitcher/AccountSwitcher'
import styles from './Header.module.css'

export default function Header({ tabs, onTabClick }) {
  const { state, dispatch } = useApp()
  const isDesktop = state.layoutMode === 'desktop'
  const monthStr = getCurrentMonth()
  const { total } = getMonthStats(state.expenses, monthStr)

  const toggleLayout = () => {
    dispatch({ type: 'SET_LAYOUT', payload: isDesktop ? 'mobile' : 'desktop' })
  }
  const toggleTheme = () => {
    dispatch({ type: 'SET_THEME', payload: state.theme === 'dark' ? 'light' : 'dark' })
  }

  return (
    <header className={`${styles.header} ${isDesktop ? styles.headerDesktop : ''}`}>
      <div className={styles.topRow}>
        <div className={styles.left}>
          <span className={styles.brand}>💰 记账本</span>
          <AccountSwitcher />
        </div>

        {/* Desktop nav tabs */}
        {isDesktop && tabs && (
          <nav className={styles.desktopNav}>
            {tabs.map(tab => {
              const active = state.activeTab === tab.key || (tab.key === 'add' && state.showForm)
              return (
                <button
                  key={tab.key}
                  className={`${styles.navTab} ${active ? styles.navTabActive : ''}`}
                  onClick={() => onTabClick(tab.key)}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        )}

        <div className={styles.actions}>
          <button className={styles.layoutBtn} onClick={toggleTheme} title="切换主题">
            {state.theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className={styles.layoutBtn} onClick={toggleLayout} title="切换布局">
            {isDesktop ? '📱' : '🖥️'}
          </button>
        </div>
      </div>

      <div className={styles.summary}>
        <span className={styles.label}>{monthStr.replace('-', '年')}月支出</span>
        <span className={styles.total}>{formatCurrency(total, state.settings.currencySymbol)}</span>
      </div>
    </header>
  )
}
