export const DEFAULT_ACCOUNT = {
  id: 'default',
  name: '我的账本',
  icon: '💰',
  createdAt: new Date().toISOString(),
  syncEnabled: false,
  syncDirName: '',
}

export const DEFAULT_CATEGORIES = [
  { id: 'food', name: '餐饮', icon: '🍚', color: '#FF6B6B', budget: 3000 },
  { id: 'transport', name: '交通', icon: '🚌', color: '#4ECDC4', budget: 800 },
  { id: 'shopping', name: '购物', icon: '🛒', color: '#45B7D1', budget: 2000 },
  { id: 'housing', name: '住房', icon: '🏠', color: '#96CEB4', budget: 5000 },
  { id: 'entertainment', name: '娱乐', icon: '🎮', color: '#FFEAA7', budget: 1000 },
  { id: 'medical', name: '医疗', icon: '💊', color: '#DDA0DD', budget: 500 },
  { id: 'education', name: '教育', icon: '📚', color: '#98D8C8', budget: 1500 },
  { id: 'other', name: '其他', icon: '💡', color: '#B8B8B8', budget: 1000 },
]

export const DEFAULT_SETTINGS = {
  currency: 'CNY',
  currencySymbol: '¥',
}

export const ACCOUNT_ICONS = ['💰', '🏠', '💼', '❤️', '🎓', '✈️', '🎯', '🌟', '🎵', '🏃', '🐱', '🌱']
