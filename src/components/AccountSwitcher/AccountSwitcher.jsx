import { useState, useRef, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { generateId } from '../../utils/helpers'
import { ACCOUNT_ICONS } from '../../data/defaults'
import styles from './AccountSwitcher.module.css'

export default function AccountSwitcher() {
  const { state, switchAccount, createAccount, deleteAccount } = useApp()
  const [open, setOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('💰')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const menuRef = useRef(null)

  const activeAccount = state.accounts.find(a => a.id === state.activeAccountId)

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSwitch = (accountId) => {
    switchAccount(accountId)
    setOpen(false)
  }

  const handleCreate = () => {
    if (!newName.trim()) return
    createAccount(newName.trim(), newIcon)
    setNewName('')
    setNewIcon('💰')
    setShowCreate(false)
    setOpen(false)
  }

  const handleDelete = (accountId, e) => {
    e.stopPropagation()
    if (state.accounts.length <= 1) return
    deleteAccount(accountId)
    setDeleteConfirm(null)
  }

  return (
    <div className={styles.container} ref={menuRef}>
      <button className={styles.trigger} onClick={() => setOpen(!open)}>
        <span className={styles.triggerIcon}>{activeAccount?.icon || '💰'}</span>
        <span className={styles.triggerName}>{activeAccount?.name || '我的账本'}</span>
        <span className={`${styles.arrow} ${open ? styles.arrowUp : ''}`}>▾</span>
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.list}>
            {state.accounts.map(acc => (
              <div
                key={acc.id}
                className={`${styles.item} ${acc.id === state.activeAccountId ? styles.active : ''}`}
                onClick={() => handleSwitch(acc.id)}
              >
                <span className={styles.icon}>{acc.icon}</span>
                <span className={styles.name}>{acc.name}</span>
                {acc.syncEnabled && <span className={styles.syncBadge} title="已绑定本地文件夹">📁</span>}
                {state.accounts.length > 1 && acc.id !== 'default' && (
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(acc.id) }}
                    title="删除账户"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className={styles.divider} />

          {!showCreate ? (
            <button className={styles.addBtn} onClick={() => setShowCreate(true)}>
              + 新建账户
            </button>
          ) : (
            <div className={styles.createForm} onClick={e => e.stopPropagation()}>
              <input
                type="text"
                placeholder="账户名称"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
              <div className={styles.iconRow}>
                {ACCOUNT_ICONS.map(icon => (
                  <button
                    key={icon}
                    className={`${styles.iconOpt} ${newIcon === icon ? styles.iconSelected : ''}`}
                    onClick={() => setNewIcon(icon)}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div className={styles.createActions}>
                <button className={styles.cancelBtn} onClick={() => setShowCreate(false)}>取消</button>
                <button className={styles.confirmBtn} onClick={handleCreate}>创建</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => setDeleteConfirm(null)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <p>确定要删除该账户吗？该账户下的所有数据将被清除。</p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setDeleteConfirm(null)}>取消</button>
              <button className={styles.dangerBtn} onClick={() => { deleteAccount(deleteConfirm); setDeleteConfirm(null); setOpen(false) }}>删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
