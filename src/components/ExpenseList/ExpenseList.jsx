import { useState, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { formatCurrency, formatDate, getCurrentMonth, getMonthRange, getToday } from '../../utils/helpers'
import { exportDataJSON } from '../../utils/storage'
import styles from './ExpenseList.module.css'

// ===== Date helpers =====
function getWeekRange() {
  const now = new Date()
  const day = now.getDay() || 7 // make Sunday=7
  const mon = new Date(now); mon.setDate(now.getDate() - day + 1)
  const sun = new Date(now); sun.setDate(now.getDate() - day + 7)
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  return { start: fmt(mon), end: fmt(sun) }
}
function getMonthStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`
}
function getMonthsAgo(n) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`
}

export default function ExpenseList() {
  const { state, dispatch } = useApp()
  const isDesktop = state.layoutMode === 'desktop'

  // ===== Filter state =====
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterMonth, setFilterMonth] = useState(getCurrentMonth())
  const [datePreset, setDatePreset] = useState('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // ===== Sort state =====
  const [sortField, setSortField] = useState('date')
  const [sortDir, setSortDir] = useState('desc')

  // ===== Batch select state =====
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [deleteId, setDeleteId] = useState(null)
  const [batchDeleteCount, setBatchDeleteCount] = useState(0)


  // ===== Date range =====
  const dateRange = useMemo(() => {
    if (customStart && customEnd) return { start: customStart, end: customEnd }
    if (datePreset === 'week') return getWeekRange()
    if (datePreset === 'month') return { start: getMonthStart(), end: getToday() }
    if (datePreset === '3months') return { start: getMonthsAgo(3), end: getToday() }
    if (filterMonth) return getMonthRange(filterMonth)
    return { start: '2020-01-01', end: '2099-12-31' }
  }, [datePreset, filterMonth, customStart, customEnd])

  // ===== Filtered + sorted data =====
  const data = useMemo(() => {
    let list = state.expenses.filter(e => e.date >= dateRange.start && e.date <= dateRange.end)
    if (filterCategory !== 'all') list = list.filter(e => e.category === filterCategory)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(e => e.description?.toLowerCase().includes(q) || getCat(e.category).name.toLowerCase().includes(q) || String(e.amount).includes(q))
    }
    // Sort
    list = [...list].sort((a, b) => {
      let cmp = sortField === 'date' ? a.date.localeCompare(b.date) : a.amount - b.amount
      return sortDir === 'desc' ? -cmp : cmp
    })
    return list
  }, [state.expenses, dateRange, filterCategory, search, sortField, sortDir])

  function getCat(catId) { return state.categories.find(c => c.id === catId) || { name: '未知', icon: '💡', color: '#999' } }

  const totalFiltered = data.reduce((s, e) => s + e.amount, 0)

  // ===== Selection =====
  const toggleSelect = (id) => {
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelectedIds(next)
  }
  const selectAll = () => {
    if (selectedIds.size === data.length) { setSelectedIds(new Set()); return }
    setSelectedIds(new Set(data.map(e => e.id)))
  }
  const clearSelect = () => { setSelectedIds(new Set()); setSelectMode(false) }

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return
    setBatchDeleteCount(selectedIds.size)
  }
  const confirmBatchDelete = () => {
    selectedIds.forEach(id => dispatch({ type: 'DELETE_EXPENSE', payload: id }))
    setSelectedIds(new Set())
    setBatchDeleteCount(0)
    setSelectMode(false)
  }
  const handleSingleDelete = () => {
    if (deleteId) { dispatch({ type: 'DELETE_EXPENSE', payload: deleteId }); setDeleteId(null) }
  }

  // ===== Export =====
  const handleExportFiltered = () => {
    exportDataJSON({
      version: 1,
      exportedAt: new Date().toISOString(),
      expenses: data,
      categories: state.categories,
      settings: state.settings,
    }, `记账_筛选导出_${new Date().toISOString().slice(0, 10)}.json`)
  }

  // ===== Date presets =====
  const presets = [
    { key: 'week', label: '本周' },
    { key: 'month', label: '本月' },
    { key: '3months', label: '近3月' },
    { key: 'all', label: '全部' },
  ]

  const monthOptions = useMemo(() => {
    const months = new Set(state.expenses.map(e => e.date.slice(0, 7)))
    return Array.from(months).sort().reverse()
  }, [state.expenses])

  // ===== Toggle sort =====
  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir(field === 'date' ? 'desc' : 'desc') }
  }
  const sortArrow = (field) => {
    if (sortField !== field) return ' ⇅'
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  // ===== Filter panel (shared) =====
  const filterPanel = (
    <div className={`${styles.filterPanel} ${isDesktop ? styles.filterPanelDesktop : ''}`}>
      <div className={styles.searchBox}>
        <span className={styles.searchIcon}>🔍</span>
        <input type="text" placeholder="搜索支出..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Date presets */}
      <div className={styles.presets}>
        {presets.map(p => (
          <button key={p.key} className={`${styles.presetBtn} ${datePreset === p.key && !customStart ? styles.presetActive : ''}`}
            onClick={() => { setDatePreset(p.key); setCustomStart(''); setCustomEnd(''); setFilterMonth('') }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom range */}
      <div className={styles.customRange}>
        <input type="date" value={customStart} onChange={e => { setCustomStart(e.target.value); if (e.target.value) setDatePreset('') }} placeholder="起始" />
        <span>~</span>
        <input type="date" value={customEnd} onChange={e => { setCustomEnd(e.target.value); if (e.target.value) setDatePreset('') }} placeholder="结束" />
      </div>

      {/* Month dropdown (legacy) */}
      <select value={filterMonth} onChange={e => { setFilterMonth(e.target.value); if (e.target.value) setDatePreset('') }}>
        <option value="">选择月份</option>
        {monthOptions.map(m => (<option key={m} value={m}>{m.replace('-', '年')}月</option>))}
      </select>

      {/* Category filter */}
      <div className={styles.catFilterList}>
        <button className={`${styles.catFilterBtn} ${filterCategory === 'all' ? styles.catFilterActive : ''}`} onClick={() => setFilterCategory('all')}>全部分类</button>
        {state.categories.map(cat => (
          <button key={cat.id} className={`${styles.catFilterBtn} ${filterCategory === cat.id ? styles.catFilterActive : ''}`}
            style={filterCategory === cat.id ? { background: cat.color, color: '#fff', borderColor: cat.color } : {}}
            onClick={() => setFilterCategory(filterCategory === cat.id ? 'all' : cat.id)}>{cat.icon} {cat.name}</button>
        ))}
      </div>

      <div className={styles.filterSummary}>
        共 {data.length} 条，合计 <strong>{formatCurrency(totalFiltered, state.settings.currencySymbol)}</strong>
        <button className={styles.exportSmall} onClick={handleExportFiltered} title="导出筛选结果">📤</button>
      </div>
    </div>
  )

  // ===== Main content area =====
  const listContent = data.length === 0 ? (
    <div className={styles.empty}><span className={styles.emptyIcon}>📝</span><p>暂无支出记录</p></div>
  ) : isDesktop ? (
    /* Desktop: table with sticky header */
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.thCheck}>
              <input type="checkbox" checked={selectedIds.size === data.length && data.length > 0}
                onChange={selectAll} />
            </th>
            <th className={styles.thSort} onClick={() => toggleSort('date')}>日期{sortArrow('date')}</th>
            <th>分类</th>
            <th className={styles.thSort} onClick={() => toggleSort('amount')}>金额{sortArrow('amount')}</th>
            <th>备注</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {data.map(expense => {
            const cat = getCat(expense.category)
            return (
              <tr key={expense.id} className={selectedIds.has(expense.id) ? styles.rowSelected : ''}>
                <td className={styles.thCheck}>
                  <input type="checkbox" checked={selectedIds.has(expense.id)} onChange={() => toggleSelect(expense.id)} />
                </td>
                <td className={styles.tdDate}>{formatDate(expense.date)}</td>
                <td><span className={styles.catBadge} style={{ background: cat.color + '20', color: cat.color }}>{cat.icon} {cat.name}</span></td>
                <td className={styles.tdAmount}>{formatCurrency(expense.amount, state.settings.currencySymbol)}</td>
                <td className={styles.tdDesc}>{expense.description || '--'}</td>
                <td className={styles.tdActions}>
                  <button className={styles.editBtn} onClick={() => dispatch({ type: 'OPEN_FORM', payload: expense })}>✏️</button>
                  <button className={styles.delBtn} onClick={() => setDeleteId(expense.id)}>🗑️</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  ) : (
    /* Mobile: card list */
    <>
      {selectMode && (
        <div className={styles.mobileSelectBar}>
          <button onClick={selectAll}>{selectedIds.size === data.length ? '取消全选' : '全选'}</button>
          <span>已选 {selectedIds.size} 条</span>
        </div>
      )}
      {data.map(expense => {
        const cat = getCat(expense.category)
        return (
          <div key={expense.id} className={`${styles.item} ${selectedIds.has(expense.id) ? styles.itemSelected : ''}`} onClick={() => selectMode && toggleSelect(expense.id)}>
            {selectMode && (
              <input type="checkbox" className={styles.itemCheck} checked={selectedIds.has(expense.id)} onChange={() => toggleSelect(expense.id)} onClick={e => e.stopPropagation()} />
            )}
            <div className={styles.iconBox} style={{ backgroundColor: cat.color + '20' }}>{cat.icon}</div>
            <div className={styles.info}>
              <div className={styles.topRow}>
                <span className={styles.category}>{cat.name}</span>
                <span className={styles.amount}>{formatCurrency(expense.amount, state.settings.currencySymbol)}</span>
              </div>
              <div className={styles.bottomRow}>
                <span className={styles.date}>{formatDate(expense.date)}</span>
                {expense.description && <span className={styles.desc}>{expense.description}</span>}
              </div>
            </div>
            <div className={styles.itemActions}>
              <button className={styles.editBtn} onClick={(e) => { e.stopPropagation(); dispatch({ type: 'OPEN_FORM', payload: expense }) }}>✏️</button>
              <button className={styles.delBtn} onClick={(e) => { e.stopPropagation(); setDeleteId(expense.id) }}>🗑️</button>
            </div>
          </div>
        )
      })}
    </>
  )

  // ===== Bottom bar (batch actions) =====
  const bottomBar = (selectedIds.size > 0 || selectMode) ? (
    <div className={styles.bottomBar}>
      <button className={styles.selectModeBtn} onClick={() => { setSelectMode(!selectMode); if (selectMode) setSelectedIds(new Set()) }}>
        {selectMode ? '退出选择' : '选择'}
      </button>
      {selectedIds.size > 0 && (
        <>
          <span className={styles.selectedCount}>已选 {selectedIds.size} 条</span>
          <button className={styles.batchDelBtn} onClick={handleBatchDelete}>🗑️ 删除已选</button>
          <button className={styles.batchExportBtn} onClick={() => {
            const selected = data.filter(e => selectedIds.has(e.id))
            exportDataJSON({ version: 1, exportedAt: new Date().toISOString(), expenses: selected, categories: state.categories, settings: state.settings }, `记账_已选${selected.length}条_${new Date().toISOString().slice(0, 10)}.json`)
          }}>📤 导出已选</button>
        </>
      )}
    </div>
  ) : null

  return (
    <div className={`${styles.container} ${isDesktop ? styles.containerDesktop : ''}`}>
      {isDesktop ? (
        <div className={styles.desktopLayout}>
          {filterPanel}
          <div className={styles.mainCol}>
            {/* Sort bar (desktop) */}
            <div className={styles.sortBar}>
              {bottomBar}
            </div>
            {listContent}
          </div>
        </div>
      ) : (
        <>
          {filterPanel}
          {/* Sort bar (mobile) */}
          <div className={styles.sortBar}>
            <button className={styles.sortBtn} onClick={() => toggleSort('date')}>日期{sortArrow('date')}</button>
            <button className={styles.sortBtn} onClick={() => toggleSort('amount')}>金额{sortArrow('amount')}</button>
            {bottomBar}
          </div>
          {listContent}
        </>
      )}

      {/* ===== Batch delete confirm ===== */}
      {batchDeleteCount > 0 && (
        <div className={styles.confirmOverlay} onClick={() => setBatchDeleteCount(0)}>
          <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <p>确定要删除选中的 {batchDeleteCount} 条记录吗？此操作不可恢复。</p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setBatchDeleteCount(0)}>取消</button>
              <button className={styles.dangerBtn} onClick={confirmBatchDelete}>删除 {batchDeleteCount} 条</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Single delete confirm ===== */}
      {deleteId && (
        <div className={styles.confirmOverlay} onClick={() => setDeleteId(null)}>
          <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <p>确定要删除这条记录吗？</p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setDeleteId(null)}>取消</button>
              <button className={styles.dangerBtn} onClick={handleSingleDelete}>删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
