import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { generateId, getToday } from '../../utils/helpers'
import styles from './ExpenseForm.module.css'

export default function ExpenseForm() {
  const { state, dispatch } = useApp()
  const isDesktop = state.layoutMode === 'desktop'
  const editing = state.editingExpense

  const [form, setForm] = useState({
    amount: '',
    category: state.categories[0]?.id || '',
    date: getToday(),
    description: '',
  })

  useEffect(() => {
    if (editing) {
      setForm({
        amount: String(editing.amount),
        category: editing.category,
        date: editing.date,
        description: editing.description || '',
      })
    } else {
      setForm({
        amount: '',
        category: state.categories[0]?.id || '',
        date: getToday(),
        description: '',
      })
    }
  }, [editing, state.categories])

  if (!state.showForm) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) return
    if (!form.category) return

    const expense = {
      id: editing ? editing.id : generateId(),
      amount,
      category: form.category,
      date: form.date,
      description: form.description.trim(),
      createdAt: editing ? editing.createdAt : new Date().toISOString(),
    }

    if (editing) {
      dispatch({ type: 'UPDATE_EXPENSE', payload: expense })
    } else {
      dispatch({ type: 'ADD_EXPENSE', payload: expense })
    }
  }

  const handleClose = () => {
    dispatch({ type: 'CLOSE_FORM' })
  }

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={`${styles.modal} ${isDesktop ? styles.modalDesktop : ''}`} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{editing ? '编辑支出' : '记一笔'}</h2>
          <button className={styles.closeBtn} onClick={handleClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>金额</label>
            <div className={styles.amountInput}>
              <span className={styles.currency}>{state.settings.currencySymbol}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                autoFocus
                required
              />
            </div>
          </div>
          <div className={styles.field}>
            <label>分类</label>
            <div className={styles.categoryGrid}>
              {state.categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={`${styles.catBtn} ${form.category === cat.id ? styles.catActive : ''}`}
                  style={{ '--cat-color': cat.color }}
                  onClick={() => setForm({ ...form, category: cat.id })}
                >
                  <span className={styles.catIcon}>{cat.icon}</span>
                  <span className={styles.catName}>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <label>日期</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>
          <div className={styles.field}>
            <label>备注</label>
            <input
              type="text"
              placeholder="添加备注（可选）"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={handleClose}>取消</button>
            <button type="submit" className={styles.submitBtn}>
              {editing ? '保存修改' : '确认记账'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
