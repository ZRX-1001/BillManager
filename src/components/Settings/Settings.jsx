import { useState, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { generateId } from '../../utils/helpers'
import { ACCOUNT_ICONS } from '../../data/defaults'
import { isFileSystemAPISupported, pickFolder, loadAccountFromFolder, syncAccountToFolder } from '../../utils/storage'
import styles from './Settings.module.css'

const NAV_ITEMS = [
  { key: 'accounts', label: '账户', icon: '👤' },
  { key: 'categories', label: '分类', icon: '📂' },
  { key: 'sync', label: '同步', icon: '📁' },
  { key: 'data', label: '数据', icon: '💾' },
  { key: 'currency', label: '货币', icon: '⚙️' },
]

export default function Settings() {
  const {
    state, dispatch,
    createAccount, deleteAccount, switchAccount,
    handleExport, handleImport,
  } = useApp()
  const isDesktop = state.layoutMode === 'desktop'
  const [activeSection, setActiveSection] = useState('accounts')
  const fileInputRef = useRef(null)
  const [msg, setMsg] = useState(null)

  const activeAccount = state.accounts.find(a => a.id === state.activeAccountId)

  const showMsg = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3000)
  }

  // ===== Category =====
  const [newCat, setNewCat] = useState({ name: '', icon: '📌', color: '#6c5ce7' })
  const iconOpts = ['🍚','🚌','🛒','🏠','🎮','💊','📚','💡','☕','🎬','👗','🏥','✈️','🎁','📱','🐱','💻','🚗','🎵','🏋️','📌']
  const colorOpts = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8','#B8B8B8','#6c5ce7','#e17055','#00b894','#fdcb6e','#74b9ff','#fd79a8','#a29bfe']

  const addCategory = () => {
    if (!newCat.name.trim()) return
    dispatch({ type: 'ADD_CATEGORY', payload: { id: generateId(), name: newCat.name.trim(), icon: newCat.icon, color: newCat.color, budget: 0 } })
    setNewCat({ name: '', icon: '📌', color: '#6c5ce7' })
  }
  const updateBudget = (catId, budget) => {
    const cat = state.categories.find(c => c.id === catId)
    if (cat) dispatch({ type: 'UPDATE_CATEGORY', payload: { ...cat, budget: Number(budget) || 0 } })
  }
  const deleteCategory = (catId) => {
    if (state.categories.length <= 1) { showMsg('error', '至少保留一个分类'); return }
    dispatch({ type: 'DELETE_CATEGORY', payload: catId })
  }

  // ===== Account =====
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('💰')

  const handleCreate = () => {
    if (!newName.trim()) return
    const acc = createAccount(newName.trim(), newIcon)
    setNewName(''); setNewIcon('💰'); setShowCreate(false)
    switchAccount(acc.id)
  }

  // ===== Folder =====
  const handleBindFolder = async () => {
    if (!isFileSystemAPISupported()) { showMsg('error', '请使用 Chrome 或 Edge'); return }
    try {
      const handle = await pickFolder()
      await syncAccountToFolder(state.activeAccountId)
      dispatch({ type: 'UPDATE_ACCOUNT', payload: { id: state.activeAccountId, syncEnabled: true, syncDirName: handle.name } })
      dispatch({ type: 'SET_FOLDER_BOUND', payload: true })
      showMsg('success', `已绑定「${handle.name}」`)
    } catch (e) { if (e.name !== 'AbortError') showMsg('error', e.message) }
  }

  const handleLoadFolder = async () => {
    if (!isFileSystemAPISupported()) { showMsg('error', '请使用 Chrome 或 Edge'); return }
    try {
      const handle = await pickFolder()
      const data = await loadAccountFromFolder(state.activeAccountId)
      if (!data) { showMsg('error', '未找到数据文件'); return }
      dispatch({ type: 'IMPORT_DATA', payload: data })
      dispatch({ type: 'UPDATE_ACCOUNT', payload: { id: state.activeAccountId, syncEnabled: true, syncDirName: handle.name } })
      dispatch({ type: 'SET_FOLDER_BOUND', payload: true })
      showMsg('success', `加载 ${data.expenses.length} 条记录`)
    } catch (e) { if (e.name !== 'AbortError') showMsg('error', e.message) }
  }

  const handleFileImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try { const data = await handleImport(file); showMsg('success', `导入 ${data.expenses.length} 条`); } catch (err) { showMsg('error', err.message) }
    e.target.value = ''
  }

  // ===== Section renderers =====
  const renderAccounts = () => (
    <div>
      <div className={styles.list}>
        {state.accounts.map(acc => (
          <div key={acc.id} className={`${styles.listItem} ${acc.id === state.activeAccountId ? styles.listItemActive : ''}`}>
            <span className={styles.itemIcon}>{acc.icon}</span>
            <div className={styles.itemInfo}>
              <span className={styles.itemName}>{acc.name}</span>
              <span className={styles.itemMeta}>{acc.syncEnabled ? `📁 ${acc.syncDirName}` : '仅浏览器'}</span>
            </div>
            {acc.id !== state.activeAccountId && <button className={styles.switchBtn} onClick={() => switchAccount(acc.id)}>切换</button>}
            {acc.id === state.activeAccountId && <span className={styles.badge}>当前</span>}
            {state.accounts.length > 1 && acc.id !== 'default' && (
              <button className={styles.iconBtn} onClick={() => deleteAccount(acc.id)}>🗑️</button>
            )}
          </div>
        ))}
      </div>
      {!showCreate ? (
        <button className={styles.addBtn} onClick={() => setShowCreate(true)}>+ 新建账户</button>
      ) : (
        <div className={styles.formBox}>
          <input type="text" placeholder="账户名称" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus />
          <div className={styles.iconRow}>
            {ACCOUNT_ICONS.map(icon => (
              <button key={icon} className={`${styles.iconOpt} ${newIcon === icon ? styles.iconSel : ''}`} onClick={() => setNewIcon(icon)}>{icon}</button>
            ))}
          </div>
          <div className={styles.actions}>
            <button className={styles.cancelBtn} onClick={() => setShowCreate(false)}>取消</button>
            <button className={styles.confirmBtn} onClick={handleCreate}>创建并切换</button>
          </div>
        </div>
      )}
    </div>
  )

  const renderCategories = () => (
    <div>
      <div className={styles.addRow}>
        <input type="text" placeholder="新分类名称" value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} onKeyDown={e => e.key === 'Enter' && addCategory()} />
        <button className={styles.confirmBtn} onClick={addCategory}>添加</button>
      </div>
      <div className={styles.iconPicker}>{iconOpts.map(icon => (
        <button key={icon} className={`${styles.iconOpt} ${newCat.icon === icon ? styles.iconSel : ''}`} onClick={() => setNewCat({ ...newCat, icon })}>{icon}</button>
      ))}</div>
      <div className={styles.colorPicker}>{colorOpts.map(c => (
        <button key={c} className={`${styles.colorDot} ${newCat.color === c ? styles.colorSel : ''}`} style={{ background: c }} onClick={() => setNewCat({ ...newCat, color: c })} />
      ))}</div>
      <div className={styles.list}>
        {state.categories.map(cat => (
          <div key={cat.id} className={styles.listItem}>
            <span className={styles.catIcon} style={{ background: cat.color + '20' }}>{cat.icon}</span>
            <span className={styles.itemName} style={{ flex: 1 }}>{cat.name}</span>
            <div className={styles.budgetInput}>
              <span className={styles.budgetLabel}>预算</span>
              <input type="number" min="0" step="100" placeholder="0" value={cat.budget || ''} onChange={e => updateBudget(cat.id, e.target.value)} className={styles.budgetField} />
            </div>
            <button className={styles.iconBtn} onClick={() => deleteCategory(cat.id)}>🗑️</button>
          </div>
        ))}
      </div>
    </div>
  )

  const renderSync = () => (
    <div>
      <p className={styles.para}>当前账户：<strong>{activeAccount?.name}</strong></p>
      <p className={styles.para}>
        {activeAccount?.syncEnabled ? `已绑定文件夹「${activeAccount.syncDirName}」` : '未绑定本地文件夹。绑定后数据自动同步到文件夹中，双重备份。'}
      </p>
      <div className={styles.actions} style={{ marginTop: 12 }}>
        {activeAccount?.syncEnabled ? (
          <button className={styles.dangerOutline} onClick={() => {
            dispatch({ type: 'UPDATE_ACCOUNT', payload: { id: state.activeAccountId, syncEnabled: false, syncDirName: '' } })
            dispatch({ type: 'SET_FOLDER_BOUND', payload: false })
            showMsg('success', '已取消绑定')
          }}>取消绑定</button>
        ) : (
          <>
            <button className={styles.bindBtn} onClick={handleBindFolder}>📂 绑定文件夹</button>
            <button className={styles.loadBtn} onClick={handleLoadFolder}>📥 从文件夹加载</button>
          </>
        )}
      </div>
    </div>
  )

  const renderData = () => (
    <div>
      <div className={styles.actions}>
        <button className={styles.exportBtn} onClick={handleExport}>📤 导出 JSON</button>
        <button className={styles.importBtn} onClick={() => fileInputRef.current?.click()}>📥 导入 JSON</button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileImport} hidden />
      </div>
      <p className={styles.hint}>数据自动保存在浏览器中。导出备份，导入恢复。</p>
    </div>
  )

  const renderCurrency = () => (
    <div>
      <select value={state.settings.currency} onChange={e => dispatch({ type: 'UPDATE_SETTINGS', payload: { currency: e.target.value, currencySymbol: e.target.value === 'CNY' ? '¥' : e.target.value === 'USD' ? '$' : e.target.value === 'EUR' ? '€' : '¥' } })}>
        <option value="CNY">人民币 (¥)</option>
        <option value="USD">美元 ($)</option>
        <option value="EUR">欧元 (€)</option>
        <option value="JPY">日元 (¥)</option>
        <option value="TWD">新台币 (NT$)</option>
      </select>
    </div>
  )

  const renderContent = (key) => {
    switch (key) {
      case 'accounts': return renderAccounts()
      case 'categories': return renderCategories()
      case 'sync': return renderSync()
      case 'data': return renderData()
      case 'currency': return renderCurrency()
      default: return null
    }
  }

  // ===== Render =====
  return (
    <div className={`${styles.container} ${isDesktop ? styles.containerDesktop : ''}`}>
      {msg && <div className={`${styles.toast} ${msg.type === 'error' ? styles.toastError : styles.toastSuccess}`}>{msg.text}</div>}

      {isDesktop ? (
        <div className={styles.desktopLayout}>
          <nav className={styles.sideNav}>
            {NAV_ITEMS.map(item => (
              <button
                key={item.key}
                className={`${styles.navItem} ${activeSection === item.key ? styles.navItemActive : ''}`}
                onClick={() => setActiveSection(item.key)}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className={styles.contentPanel}>
            <h2 className={styles.panelTitle}>{NAV_ITEMS.find(i => i.key === activeSection)?.icon} {NAV_ITEMS.find(i => i.key === activeSection)?.label}</h2>
            {renderContent(activeSection)}
          </div>
        </div>
      ) : (
        /* Mobile: stacked sections */
        <>
          <div className={styles.section}><h3 className={styles.sectionTitle}>👤 账户管理</h3>{renderAccounts()}</div>
          <div className={styles.section}><h3 className={styles.sectionTitle}>📁 本地文件夹同步</h3>{renderSync()}</div>
          <div className={styles.section}><h3 className={styles.sectionTitle}>📂 分类管理</h3>{renderCategories()}</div>
          <div className={styles.section}><h3 className={styles.sectionTitle}>💾 数据管理</h3>{renderData()}</div>
          <div className={styles.section}><h3 className={styles.sectionTitle}>⚙️ 货币设置</h3>{renderCurrency()}</div>
        </>
      )}
    </div>
  )
}
