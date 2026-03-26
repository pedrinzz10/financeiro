import { useState, useEffect, useMemo, useCallback } from 'react'
import './App.css'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, Plus, Trash2, X,
  ArrowUpCircle, ArrowDownCircle, LayoutDashboard, ListPlus, RefreshCw,
  ChevronLeft, ChevronRight, Calendar, Tag, CalendarDays
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

let nextLocalId = Date.now()
function genId(): number { return nextLocalId++ }

function loadLocal<T>(key: string, fallback: T): T {
  try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fallback } catch { return fallback }
}
function saveLocal<T>(key: string, data: T) { localStorage.setItem(key, JSON.stringify(data)) }

interface Transaction {
  id: number
  type: 'income' | 'expense'
  description: string
  amount: number
  category: string
  date: string
}

interface CustomCategoryItem {
  id: number
  name: string
  type: 'income' | 'expense'
}

interface DollarRate {
  bid: string
  ask: string
  high: string
  low: string
  pctChange: string
  timestamp: string
}

const DEFAULT_INCOME_CATEGORIES = ['Salario', 'Freelance', 'Investimentos', 'Vendas', 'Outros']
const DEFAULT_EXPENSE_CATEGORIES = ['Alimentacao', 'Transporte', 'Moradia', 'Saude', 'Educacao', 'Lazer', 'Roupas', 'Contas', 'Outros']

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#14b8a6', '#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#ec4899', '#f97316', '#06b6d4']

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

type Page = 'dashboard' | 'transactions' | 'calendar'

function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [dollarRate, setDollarRate] = useState<DollarRate | null>(null)
  const [dollarLoading, setDollarLoading] = useState(false)
  const [formType, setFormType] = useState<'income' | 'expense'>('expense')
  const [formDesc, setFormDesc] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0])
  const [customCategoryItems, setCustomCategoryItems] = useState<CustomCategoryItem[]>([])
  const [incomeCategories, setIncomeCategories] = useState<string[]>(DEFAULT_INCOME_CATEGORIES)
  const [expenseCategories, setExpenseCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showAddCategory, setShowAddCategory] = useState(false)

  // Dashboard month filter
  const now = new Date()
  const [dashMonth, setDashMonth] = useState(now.getMonth())
  const [dashYear, setDashYear] = useState(now.getFullYear())
  const [dashFilterAll, setDashFilterAll] = useState(true)

  // Calendar month/year
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [calYear, setCalYear] = useState(now.getFullYear())

  const useBackend = API_URL.length > 0

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    if (useBackend) {
      try {
        const res = await fetch(API_URL + '/api/transactions')
        const data = await res.json()
        setTransactions(data)
        return
      } catch { /* fall through to localStorage */ }
    }
    setTransactions(loadLocal<Transaction[]>('financeiro_transactions', []))
  }, [useBackend])

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    if (useBackend) {
      try {
        const res = await fetch(API_URL + '/api/categories')
        const data = await res.json()
        setIncomeCategories(data.income || DEFAULT_INCOME_CATEGORIES)
        setExpenseCategories(data.expense || DEFAULT_EXPENSE_CATEGORIES)
        const customs: CustomCategoryItem[] = []
        if (data.customIncome) { for (const c of data.customIncome) customs.push(c) }
        if (data.customExpense) { for (const c of data.customExpense) customs.push(c) }
        setCustomCategoryItems(customs)
        return
      } catch { /* fall through to localStorage */ }
    }
    const local = loadLocal<{income: string[], expense: string[]}>('financeiro_custom_categories', {income:[], expense:[]})
    setIncomeCategories([...DEFAULT_INCOME_CATEGORIES, ...local.income])
    setExpenseCategories([...DEFAULT_EXPENSE_CATEGORIES, ...local.expense])
    setCustomCategoryItems([
      ...local.income.map((n, i) => ({id: -(i+1), name: n, type: 'income' as const})),
      ...local.expense.map((n, i) => ({id: -(1000+i), name: n, type: 'expense' as const})),
    ])
  }, [useBackend])

  const parseDollar = (usd: {bid:string,ask:string,high:string,low:string,pctChange:string,create_date:string}) => ({
    bid: parseFloat(usd.bid).toFixed(2),
    ask: parseFloat(usd.ask).toFixed(2),
    high: parseFloat(usd.high).toFixed(2),
    low: parseFloat(usd.low).toFixed(2),
    pctChange: usd.pctChange,
    timestamp: usd.create_date,
  })

  const fetchDollar = async () => {
    setDollarLoading(true)
    try {
      if (useBackend) {
        const res = await fetch(API_URL + '/api/dollar')
        const data = await res.json()
        if (data.USDBRL) { setDollarRate(parseDollar(data.USDBRL)); setDollarLoading(false); return }
      }
      const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL')
      const data = await res.json()
      setDollarRate(parseDollar(data.USDBRL))
    } catch { /* silently fail */ }
    setDollarLoading(false)
  }

  useEffect(() => {
    fetchTransactions()
    fetchCategories()
    fetchDollar()
  }, [fetchTransactions, fetchCategories])

  const categories = formType === 'income' ? incomeCategories : expenseCategories

  // Filtered transactions for dashboard
  const filteredTransactions = useMemo(() => {
    if (dashFilterAll) return transactions
    const key = dashYear + '-' + String(dashMonth + 1).padStart(2, '0')
    return transactions.filter(t => t.date.startsWith(key))
  }, [transactions, dashMonth, dashYear, dashFilterAll])

  const totalIncome = useMemo(() => filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [filteredTransactions])
  const totalExpense = useMemo(() => filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [filteredTransactions])
  const balance = totalIncome - totalExpense

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    filteredTransactions.filter(t => t.type === 'expense').forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [filteredTransactions])

  const monthlyData = useMemo(() => {
    const months: { label: string; income: number; expense: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      let income = 0, expense = 0
      transactions.forEach(t => {
        if (t.date.startsWith(key)) {
          if (t.type === 'income') income += t.amount
          else expense += t.amount
        }
      })
      months.push({ label, income, expense })
    }
    return months
  }, [transactions])

  const handleAdd = async () => {
    if (!formDesc.trim() || !formAmount || !formCategory || !formDate) return
    const amount = parseFloat(formAmount)
    if (isNaN(amount) || amount <= 0) return
    if (useBackend) {
      try {
        const res = await fetch(API_URL + '/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: formType, description: formDesc.trim(), amount, category: formCategory, date: formDate })
        })
        if (res.ok) { await fetchTransactions(); setFormDesc(''); setFormAmount(''); setFormCategory(''); return }
      } catch { /* fall through */ }
    }
    const txn: Transaction = { id: genId(), type: formType, description: formDesc.trim(), amount, category: formCategory, date: formDate }
    setTransactions(prev => { const next = [txn, ...prev]; saveLocal('financeiro_transactions', next); return next })
    setFormDesc(''); setFormAmount(''); setFormCategory('')
  }

  const handleDelete = async (id: number) => {
    if (useBackend) {
      try {
        const res = await fetch(API_URL + '/api/transactions/' + id, { method: 'DELETE' })
        if (res.ok) { setTransactions(prev => { const next = prev.filter(t => t.id !== id); return next }); return }
      } catch { /* fall through */ }
    }
    setTransactions(prev => { const next = prev.filter(t => t.id !== id); saveLocal('financeiro_transactions', next); return next })
  }

  const handleAddCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) return
    if (useBackend) {
      try {
        const res = await fetch(API_URL + '/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, type: formType })
        })
        if (res.ok) { await fetchCategories(); setFormCategory(name); setNewCategoryName(''); setShowAddCategory(false); return }
      } catch { /* fall through */ }
    }
    const local = loadLocal<{income:string[],expense:string[]}>('financeiro_custom_categories', {income:[],expense:[]})
    if (formType === 'income') { if (!local.income.includes(name)) local.income.push(name) }
    else { if (!local.expense.includes(name)) local.expense.push(name) }
    saveLocal('financeiro_custom_categories', local)
    await fetchCategories()
    setFormCategory(name); setNewCategoryName(''); setShowAddCategory(false)
  }

  const handleRemoveCustomCategory = async (id: number) => {
    if (useBackend) {
      try {
        const res = await fetch(API_URL + '/api/categories/' + id, { method: 'DELETE' })
        if (res.ok) { await fetchCategories(); return }
      } catch { /* fall through */ }
    }
    const item = customCategoryItems.find(c => c.id === id)
    if (item) {
      const local = loadLocal<{income:string[],expense:string[]}>('financeiro_custom_categories', {income:[],expense:[]})
      if (item.type === 'income') local.income = local.income.filter(n => n !== item.name)
      else local.expense = local.expense.filter(n => n !== item.name)
      saveLocal('financeiro_custom_categories', local)
      await fetchCategories()
    }
  }

  const customCategoriesForType = customCategoryItems.filter(c => c.type === formType)

  const goToPrevMonth = () => {
    setDashFilterAll(false)
    if (dashMonth === 0) { setDashMonth(11); setDashYear(y => y - 1) }
    else setDashMonth(m => m - 1)
  }
  const goToNextMonth = () => {
    setDashFilterAll(false)
    if (dashMonth === 11) { setDashMonth(0); setDashYear(y => y + 1) }
    else setDashMonth(m => m + 1)
  }

  const calPrevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }
  const calNextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <aside className="fixed top-0 left-0 h-full w-56 bg-gray-900 border-r border-gray-800 flex flex-col py-6 px-4 z-10">
        <div className="flex items-center gap-2 mb-10 px-2">
          <Wallet className="text-indigo-400" size={28} />
          <span className="text-xl font-bold tracking-tight text-white">Financeiro</span>
        </div>
        <nav className="flex flex-col gap-1">
          <button onClick={() => setPage('dashboard')} className={'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ' + (page === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200')}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button onClick={() => setPage('transactions')} className={'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ' + (page === 'transactions' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200')}>
            <ListPlus size={18} /> Transacoes
          </button>
          <button onClick={() => setPage('calendar')} className={'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ' + (page === 'calendar' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200')}>
            <CalendarDays size={18} /> Calendario
          </button>
        </nav>
        <div className="mt-auto pt-6 border-t border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Dolar (USD)</span>
            <button onClick={fetchDollar} className="text-gray-500 hover:text-indigo-400 transition-colors" title="Atualizar">
              <RefreshCw size={14} className={dollarLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          {dollarRate ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-gray-400">Compra</span><span className="text-green-400 font-semibold">R$ {dollarRate.bid}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Venda</span><span className="text-red-400 font-semibold">R$ {dollarRate.ask}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Maxima</span><span className="text-gray-300">R$ {dollarRate.high}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Minima</span><span className="text-gray-300">R$ {dollarRate.low}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Variacao</span><span className={'font-semibold ' + (parseFloat(dollarRate.pctChange) >= 0 ? 'text-green-400' : 'text-red-400')}>{parseFloat(dollarRate.pctChange) >= 0 ? '+' : ''}{dollarRate.pctChange}%</span></div>
              <p className="text-xs text-gray-600 pt-1">{dollarRate.timestamp}</p>
            </div>
          ) : (<p className="text-xs text-gray-600">Carregando...</p>)}
        </div>
      </aside>
      <main className="ml-56 min-h-screen">
        {page === 'dashboard' ? (
          <DashboardView balance={balance} totalIncome={totalIncome} totalExpense={totalExpense} expenseByCategory={expenseByCategory} monthlyData={monthlyData} transactions={filteredTransactions} dashMonth={dashMonth} dashYear={dashYear} dashFilterAll={dashFilterAll} setDashFilterAll={setDashFilterAll} goToPrevMonth={goToPrevMonth} goToNextMonth={goToNextMonth} />
        ) : page === 'transactions' ? (
          <TransactionsView formType={formType} setFormType={setFormType} formDesc={formDesc} setFormDesc={setFormDesc} formAmount={formAmount} setFormAmount={setFormAmount} formCategory={formCategory} setFormCategory={setFormCategory} formDate={formDate} setFormDate={setFormDate} categories={categories} handleAdd={handleAdd} transactions={transactions} handleDelete={handleDelete} showAddCategory={showAddCategory} setShowAddCategory={setShowAddCategory} newCategoryName={newCategoryName} setNewCategoryName={setNewCategoryName} handleAddCategory={handleAddCategory} customCategoriesForType={customCategoriesForType} handleRemoveCustomCategory={handleRemoveCustomCategory} />
        ) : (
          <CalendarView transactions={transactions} calMonth={calMonth} calYear={calYear} calPrevMonth={calPrevMonth} calNextMonth={calNextMonth} />
        )}
      </main>
    </div>
  )
}

function DashboardView({ balance, totalIncome, totalExpense, expenseByCategory, monthlyData, transactions, dashMonth, dashYear, dashFilterAll, setDashFilterAll, goToPrevMonth, goToNextMonth }: { balance: number; totalIncome: number; totalExpense: number; expenseByCategory: { name: string; value: number }[]; monthlyData: { label: string; income: number; expense: number }[]; transactions: Transaction[]; dashMonth: number; dashYear: number; dashFilterAll: boolean; setDashFilterAll: (v: boolean) => void; goToPrevMonth: () => void; goToNextMonth: () => void }) {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button onClick={goToPrevMonth} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"><ChevronLeft size={18} /></button>
          <button onClick={() => setDashFilterAll(true)} className={'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ' + (dashFilterAll ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white')}>Todos</button>
          <div className={'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-default ' + (!dashFilterAll ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400')}>
            <Calendar size={14} />
            {MONTH_NAMES[dashMonth]} {dashYear}
          </div>
          <button onClick={goToNextMonth} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-indigo-600/20 rounded-lg"><Wallet className="text-indigo-400" size={20} /></div><span className="text-sm text-gray-400">Saldo</span></div>
          <p className={'text-2xl font-bold ' + (balance >= 0 ? 'text-green-400' : 'text-red-400')}>{formatCurrency(balance)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-green-600/20 rounded-lg"><TrendingUp className="text-green-400" size={20} /></div><span className="text-sm text-gray-400">Entradas</span></div>
          <p className="text-2xl font-bold text-green-400">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-red-600/20 rounded-lg"><TrendingDown className="text-red-400" size={20} /></div><span className="text-sm text-gray-400">Saidas</span></div>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(totalExpense)}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Entradas vs Saidas (6 meses)</h2>
          {monthlyData.some(m => m.income > 0 || m.expense > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} labelStyle={{ color: '#d1d5db' }} formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="income" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Saidas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (<div className="flex items-center justify-center h-64 text-gray-600">Adicione transacoes para ver o grafico</div>)}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Saidas por Categoria {!dashFilterAll ? '(' + MONTH_NAMES[dashMonth] + ')' : ''}</h2>
          {expenseByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={expenseByCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => name + ' ' + (percent * 100).toFixed(0) + '%'}>
                  {expenseByCategory.map((_, index) => (<Cell key={index} fill={COLORS[index % COLORS.length]} />))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (<div className="flex items-center justify-center h-64 text-gray-600">Sem saidas {!dashFilterAll ? 'neste mes' : ''}</div>)}
        </div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Transacoes {!dashFilterAll ? '- ' + MONTH_NAMES[dashMonth] + ' ' + dashYear : 'Recentes'}</h2>
        {transactions.length > 0 ? (
          <div className="space-y-2">
            {transactions.slice(0, 10).map(t => (
              <div key={t.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  {t.type === 'income' ? <ArrowUpCircle className="text-green-400 shrink-0" size={20} /> : <ArrowDownCircle className="text-red-400 shrink-0" size={20} />}
                  <div><p className="text-sm font-medium text-gray-200">{t.description}</p><p className="text-xs text-gray-500">{t.category} - {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p></div>
                </div>
                <span className={'text-sm font-semibold ' + (t.type === 'income' ? 'text-green-400' : 'text-red-400')}>{t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}</span>
              </div>
            ))}
          </div>
        ) : (<p className="text-gray-600 text-sm text-center py-8">Nenhuma transacao {!dashFilterAll ? 'neste mes' : 'registrada'}</p>)}
      </div>
    </div>
  )
}

function CalendarView({ transactions, calMonth, calYear, calPrevMonth, calNextMonth }: { transactions: Transaction[]; calMonth: number; calYear: number; calPrevMonth: () => void; calNextMonth: () => void }) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const monthKey = calYear + '-' + String(calMonth + 1).padStart(2, '0')
  const txnsByDay = useMemo(() => {
    const map: Record<number, Transaction[]> = {}
    transactions.forEach(t => {
      if (t.date.startsWith(monthKey)) {
        const day = parseInt(t.date.split('-')[2], 10)
        if (!map[day]) map[day] = []
        map[day].push(t)
      }
    })
    return map
  }, [transactions, monthKey])

  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === calYear && today.getMonth() === calMonth
  const todayDate = today.getDate()

  const weeks: (number | null)[][] = []
  let currentWeek: (number | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    currentWeek.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }

  const selectedTxns = selectedDay ? (txnsByDay[selectedDay] || []) : []
  const selectedIncome = selectedTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const selectedExpense = selectedTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const monthTxns = transactions.filter(t => t.date.startsWith(monthKey))
  const monthIncome = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const monthExpense = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Calendario</h1>
        <div className="flex items-center gap-2">
          <button onClick={calPrevMonth} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"><ChevronLeft size={18} /></button>
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium">
            <CalendarDays size={14} />
            {MONTH_NAMES[calMonth]} {calYear}
          </div>
          <button onClick={calNextMonth} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="text-green-400" size={16} /><span className="text-xs text-gray-400">Entradas do Mes</span></div>
          <p className="text-lg font-bold text-green-400">{formatCurrency(monthIncome)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingDown className="text-red-400" size={16} /><span className="text-xs text-gray-400">Saidas do Mes</span></div>
          <p className="text-lg font-bold text-red-400">{formatCurrency(monthExpense)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><Wallet className="text-indigo-400" size={16} /><span className="text-xs text-gray-400">Saldo do Mes</span></div>
          <p className={'text-lg font-bold ' + (monthIncome - monthExpense >= 0 ? 'text-green-400' : 'text-red-400')}>{formatCurrency(monthIncome - monthExpense)}</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAY_NAMES.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-500 uppercase py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((day, idx) => {
            if (day === null) {
              return <div key={'empty-' + idx} className="min-h-24 rounded-lg bg-gray-800/30" />
            }
            const dayTxns = txnsByDay[day] || []
            const dayIncome = dayTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
            const dayExpense = dayTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
            const isToday = isCurrentMonth && day === todayDate
            const isSelected = selectedDay === day

            return (
              <button
                key={'day-' + day}
                onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                className={'min-h-24 rounded-lg p-2 text-left transition-all border ' + (isSelected ? 'border-indigo-500 bg-indigo-600/20 ring-1 ring-indigo-500' : isToday ? 'border-indigo-400/50 bg-gray-800/70' : 'border-transparent bg-gray-800/50 hover:bg-gray-800/80 hover:border-gray-700')}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={'text-sm font-medium ' + (isToday ? 'text-indigo-400' : isSelected ? 'text-white' : 'text-gray-300')}>{day}</span>
                  {isToday && <span className="text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded">Hoje</span>}
                </div>
                {dayTxns.length > 0 && (
                  <div className="space-y-0.5">
                    {dayIncome > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                        <span className="text-xs text-green-400 truncate">+{formatCurrency(dayIncome)}</span>
                      </div>
                    )}
                    {dayExpense > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                        <span className="text-xs text-red-400 truncate">-{formatCurrency(dayExpense)}</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-500">{dayTxns.length} {dayTxns.length === 1 ? 'transacao' : 'transacoes'}</div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {selectedDay !== null && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              {selectedDay} de {MONTH_NAMES[calMonth]} de {calYear}
            </h2>
            <div className="flex items-center gap-4">
              {selectedIncome > 0 && <span className="text-sm text-green-400 font-medium">+{formatCurrency(selectedIncome)}</span>}
              {selectedExpense > 0 && <span className="text-sm text-red-400 font-medium">-{formatCurrency(selectedExpense)}</span>}
              <button onClick={() => setSelectedDay(null)} className="text-gray-500 hover:text-gray-300 transition-colors"><X size={16} /></button>
            </div>
          </div>
          {selectedTxns.length > 0 ? (
            <div className="space-y-2">
              {selectedTxns.map(t => (
                <div key={t.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-800/40 hover:bg-gray-800/70 transition-colors">
                  <div className="flex items-center gap-3">
                    {t.type === 'income' ? <ArrowUpCircle className="text-green-400 shrink-0" size={18} /> : <ArrowDownCircle className="text-red-400 shrink-0" size={18} />}
                    <div>
                      <p className="text-sm font-medium text-gray-200">{t.description}</p>
                      <p className="text-xs text-gray-500">{t.category}</p>
                    </div>
                  </div>
                  <span className={'text-sm font-semibold ' + (t.type === 'income' ? 'text-green-400' : 'text-red-400')}>{t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-sm text-center py-6">Nenhuma transacao neste dia</p>
          )}
        </div>
      )}
    </div>
  )
}

function TransactionsView({ formType, setFormType, formDesc, setFormDesc, formAmount, setFormAmount, formCategory, setFormCategory, formDate, setFormDate, categories, handleAdd, transactions, handleDelete, showAddCategory, setShowAddCategory, newCategoryName, setNewCategoryName, handleAddCategory, customCategoriesForType, handleRemoveCustomCategory }: { formType: 'income' | 'expense'; setFormType: (v: 'income' | 'expense') => void; formDesc: string; setFormDesc: (v: string) => void; formAmount: string; setFormAmount: (v: string) => void; formCategory: string; setFormCategory: (v: string) => void; formDate: string; setFormDate: (v: string) => void; categories: string[]; handleAdd: () => void; transactions: Transaction[]; handleDelete: (id: number) => void; showAddCategory: boolean; setShowAddCategory: (v: boolean) => void; newCategoryName: string; setNewCategoryName: (v: string) => void; handleAddCategory: () => void; customCategoriesForType: CustomCategoryItem[]; handleRemoveCustomCategory: (id: number) => void }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Transacoes</h1>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Nova Transacao</h2>
        <div className="flex gap-2 mb-5">
          <button onClick={() => { setFormType('income'); setFormCategory('') }} className={'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ' + (formType === 'income' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700')}>
            <ArrowUpCircle size={16} /> Entrada
          </button>
          <button onClick={() => { setFormType('expense'); setFormCategory('') }} className={'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ' + (formType === 'expense' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700')}>
            <ArrowDownCircle size={16} /> Saida
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">Descricao</label>
            <input type="text" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Ex: Supermercado" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">Valor (R$)</label>
            <input type="number" min="0.01" step="0.01" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0,00" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">Categoria</label>
            <div className="flex gap-1.5">
              <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option value="">Selecione...</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={() => setShowAddCategory(!showAddCategory)} className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-indigo-400 hover:border-indigo-500 transition-colors" title="Nova categoria">
                <Tag size={16} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">Data</label>
            <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
        </div>
        {showAddCategory && (
          <div className="mb-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <Tag size={14} className="text-indigo-400" />
              <span className="text-sm font-medium text-gray-300">Nova categoria ({formType === 'income' ? 'Entrada' : 'Saida'})</span>
            </div>
            <div className="flex gap-2">
              <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nome da categoria" onKeyDown={e => { if (e.key === 'Enter') handleAddCategory() }} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              <button onClick={handleAddCategory} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">Criar</button>
              <button onClick={() => { setShowAddCategory(false); setNewCategoryName('') }} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors">Cancelar</button>
            </div>
            {customCategoriesForType.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-xs text-gray-500 mb-2">Suas categorias personalizadas:</p>
                <div className="flex flex-wrap gap-2">
                  {customCategoriesForType.map(c => (
                    <span key={c.id} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 rounded-md text-xs text-gray-300">
                      {c.name}
                      <button onClick={() => handleRemoveCustomCategory(c.id)} className="text-gray-500 hover:text-red-400 transition-colors"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {customCategoriesForType.length === 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <span className="text-xs text-gray-600">Nenhuma categoria personalizada para {formType === 'income' ? 'entradas' : 'saidas'}</span>
              </div>
            )}
          </div>
        )}
        <button onClick={handleAdd} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Adicionar
        </button>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Todas as Transacoes ({transactions.length})</h2>
        {transactions.length > 0 ? (
          <div className="space-y-2">
            {transactions.map(t => (
              <div key={t.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-gray-800/40 hover:bg-gray-800/70 transition-colors">
                <div className="flex items-center gap-3">
                  {t.type === 'income' ? <ArrowUpCircle className="text-green-400 shrink-0" size={20} /> : <ArrowDownCircle className="text-red-400 shrink-0" size={20} />}
                  <div><p className="text-sm font-medium text-gray-200">{t.description}</p><p className="text-xs text-gray-500">{t.category} - {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={'text-sm font-semibold ' + (t.type === 'income' ? 'text-green-400' : 'text-red-400')}>{t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}</span>
                  <button onClick={() => handleDelete(t.id)} className="text-gray-600 hover:text-red-400 transition-colors" title="Excluir"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (<p className="text-gray-600 text-sm text-center py-8">Nenhuma transacao registrada. Adicione uma acima!</p>)}
      </div>
    </div>
  )
}

export default App
