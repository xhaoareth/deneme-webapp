import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { Account, AccountType, Transaction, TransactionDirection } from './types';

const storageKeys = {
  accounts: 'deneme-webapp.accounts',
  transactions: 'deneme-webapp.transactions',
  theme: 'deneme-webapp.theme',
} as const;

const legacyKeys = {
  todos: 'deneme-webapp.todos',
  notes: 'deneme-webapp.notes',
};

type StorageKey = (typeof storageKeys)[keyof typeof storageKeys];

type FormSubmitEvent = FormEvent<HTMLFormElement>;

type InputChangeEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

function loadFromStorage<T>(key: StorageKey, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;

  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch (error) {
    console.warn(`Failed to read ${key} from storage`, error);
    return fallback;
  }
}

function saveToStorage<T>(key: StorageKey, value: T): void {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to save ${key} to storage`, error);
  }
}

function collectLegacyNotes(): string[] {
  if (typeof localStorage === 'undefined') return [];

  const savedItems: string[] = [];

  const legacyLists = [legacyKeys.todos, legacyKeys.notes];

  legacyLists.forEach((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (typeof item?.text === 'string' && item.text.trim()) {
            savedItems.push(item.text.trim());
          }
        });
      }
    } catch (error) {
      console.warn(`Failed to read legacy data from ${key}`, error);
    }
  });

  return savedItems;
}

function createDefaultAccounts(legacyNotes: string[]): Account[] {
  const now = new Date().toISOString();
  const compiledNotes = legacyNotes.length
    ? `Imported notes from previous version:\n- ${legacyNotes.join('\n- ')}`
    : 'Track your debt and repayments here.';

  return [
    {
      id: crypto.randomUUID(),
      name: 'Everyday Card',
      type: 'CREDIT_CARD',
      bankName: 'Deneme Bank',
      currency: 'TRY',
      startingDebt: 12000,
      createdAt: now,
      notes: compiledNotes,
    },
    {
      id: crypto.randomUUID(),
      name: 'Education Loan',
      type: 'LOAN',
      bankName: 'Campus Finance',
      currency: 'TRY',
      startingDebt: 54000,
      createdAt: now,
      notes: 'Make steady payments to reduce interest.',
    },
  ];
}

function createDefaultTransactions(accounts: Account[]): Transaction[] {
  const [primary, secondary] = accounts;
  return [
    {
      id: crypto.randomUUID(),
      accountId: primary?.id ?? '',
      date: new Date().toISOString(),
      amount: 2500,
      direction: 'NEGATIVE',
      category: 'Groceries',
      description: 'Weekly essentials',
    },
    {
      id: crypto.randomUUID(),
      accountId: primary?.id ?? '',
      date: new Date().toISOString(),
      amount: 1500,
      direction: 'POSITIVE',
      category: 'Payment',
      description: 'Monthly payment',
    },
    {
      id: crypto.randomUUID(),
      accountId: secondary?.id ?? '',
      date: new Date().toISOString(),
      amount: 5000,
      direction: 'POSITIVE',
      category: 'Scholarship',
      description: 'Extra payment',
    },
  ];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getBalance(account: Account, transactions: Transaction[]): number {
  return transactions
    .filter((transaction) => transaction.accountId === account.id)
    .reduce((total, transaction) => {
      return transaction.direction === 'NEGATIVE' ? total + transaction.amount : total - transaction.amount;
    }, account.startingDebt);
}

function Header({ theme, onToggleTheme }: { theme: string; onToggleTheme: () => void }) {
  return (
    <header className="navbar">
      <div className="brand">
        <div className="logo">DW</div>
        <div>
          <p className="eyebrow">Deneme Webapp</p>
          <h1>Finance Dashboard</h1>
        </div>
      </div>
      <button className="theme-toggle" type="button" onClick={onToggleTheme}>
        {theme === 'dark' ? '🌙 Dark' : '☀️ Light'} Mode
      </button>
    </header>
  );
}

function AccountCard({ account, balance }: { account: Account; balance: number }) {
  return (
    <li className="list-item account">
      <div className="stack">
        <div className="meta">
          <span className="pill subtle">{account.bankName}</span>
          <span className="pill subtle">{account.type.replace('_', ' ')}</span>
        </div>
        <h3>{account.name}</h3>
        <p>{account.notes}</p>
        <p className="muted">Opened {formatDate(account.createdAt)}</p>
      </div>
      <div className="balance">
        <p className="muted">Current balance</p>
        <strong className={balance > 0 ? 'negative' : 'positive'}>{formatCurrency(balance)}</strong>
      </div>
    </li>
  );
}

function AccountsSection({
  accounts,
  transactions,
  onAddAccount,
}: {
  accounts: Account[];
  transactions: Transaction[];
  onAddAccount: (account: Account) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    type: 'CREDIT_CARD' as AccountType,
    bankName: '',
    startingDebt: '0',
    notes: '',
  });

  const handleChange = (event: InputChangeEvent) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = (event: FormSubmitEvent) => {
    event.preventDefault();
    const trimmedName = form.name.trim();
    if (!trimmedName) return;

    const newAccount: Account = {
      id: crypto.randomUUID(),
      name: trimmedName,
      type: form.type,
      bankName: form.bankName.trim() || 'Unnamed Bank',
      currency: 'TRY',
      startingDebt: Number(form.startingDebt) || 0,
      createdAt: new Date().toISOString(),
      notes: form.notes.trim() || 'No notes yet.',
    };

    onAddAccount(newAccount);
    setForm({ name: '', type: 'CREDIT_CARD', bankName: '', startingDebt: '0', notes: '' });
  };

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Debt overview</p>
          <h2>Accounts</h2>
        </div>
        <span className="pill">{accounts.length} active</span>
      </div>

      <form className="grid account-form" onSubmit={handleSubmit}>
        <input
          name="name"
          placeholder="Account name (e.g. Travel Card)"
          value={form.name}
          onChange={handleChange}
          required
        />
        <div className="grid two-col inline-fields">
          <input name="bankName" placeholder="Bank name" value={form.bankName} onChange={handleChange} />
          <select name="type" value={form.type} onChange={handleChange}>
            <option value="CREDIT_CARD">Credit Card</option>
            <option value="LOAN">Loan</option>
            <option value="OVERDRAFT">Overdraft</option>
          </select>
        </div>
        <div className="grid two-col inline-fields">
          <label className="field">
            <span>Starting debt (TRY)</span>
            <input
              name="startingDebt"
              type="number"
              min="0"
              step="100"
              value={form.startingDebt}
              onChange={handleChange}
            />
          </label>
          <label className="field">
            <span>Notes</span>
            <textarea
              name="notes"
              placeholder="Context about this account"
              value={form.notes}
              onChange={handleChange}
              rows={2}
            />
          </label>
        </div>
        <button type="submit">Add account</button>
      </form>

      <ul className="list">
        {accounts.map((account) => (
          <AccountCard key={account.id} account={account} balance={getBalance(account, transactions)} />
        ))}
        {accounts.length === 0 && <p className="empty">Add your first account to start tracking debt.</p>}
      </ul>
    </section>
  );
}

const categoryPresets = ['Payment', 'Shopping', 'Interest', 'Cash', 'Other'] as const;

function TransactionRow({ transaction, accountName }: { transaction: Transaction; accountName: string }) {
  const directionLabel = transaction.direction === 'NEGATIVE' ? 'Charge' : 'Payment';
  return (
    <li
      className={`list-item transaction ${
        transaction.direction === 'NEGATIVE' ? 'transaction-negative' : 'transaction-positive'
      }`}
    >
      <div className="stack">
        <div className="meta">
          <span className={`pill ${transaction.direction === 'NEGATIVE' ? 'danger' : 'success'}`}>{directionLabel}</span>
          <span className="pill subtle">{transaction.category}</span>
          <span className="pill subtle">{accountName}</span>
        </div>
        <h4>{transaction.description || 'No description'}</h4>
        <p className="muted">{accountName}</p>
        <p className="muted">{formatDate(transaction.date)}</p>
      </div>
      <div className="balance">
        <p className="muted">Amount</p>
        <strong className={transaction.direction === 'NEGATIVE' ? 'negative' : 'positive'}>
          {formatCurrency(transaction.amount)}
        </strong>
      </div>
    </li>
  );
}

function TransactionsSection({
  accounts,
  transactions,
  onAddTransaction,
}: {
  accounts: Account[];
  transactions: Transaction[];
  onAddTransaction: (transaction: Transaction) => void;
}) {
  const [form, setForm] = useState({
    accountId: accounts[0]?.id ?? '',
    date: new Date().toISOString().slice(0, 10),
    amount: '0',
    direction: 'NEGATIVE' as TransactionDirection,
    category: 'General',
    description: '',
  });

  const [filters, setFilters] = useState({
    accountId: 'ALL',
    direction: 'ALL' as TransactionDirection | 'ALL',
  });

  useEffect(() => {
    if (!form.accountId && accounts[0]?.id) {
      setForm((prev) => ({ ...prev, accountId: accounts[0].id }));
    }
  }, [accounts, form.accountId]);

  useEffect(() => {
    if (filters.accountId !== 'ALL' && !accounts.some((account) => account.id === filters.accountId)) {
      setFilters((prev) => ({ ...prev, accountId: 'ALL' }));
    }
  }, [accounts, filters.accountId]);

  const handleChange = (event: InputChangeEvent) => {
    const { name, value } = event.target;
    const sanitizedValue =
      name === 'amount' ? (value === '' ? '' : Math.abs(Number(value)).toString()) : value;
    setForm((prev) => ({ ...prev, [name]: sanitizedValue }));
  };

  const handleSubmit = (event: FormSubmitEvent) => {
    event.preventDefault();
    if (!form.accountId) return;

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      accountId: form.accountId,
      date: new Date(form.date).toISOString(),
      amount: Math.abs(Number(form.amount)) || 0,
      direction: form.direction,
      category: form.category.trim() || 'General',
      description: form.description.trim() || 'No description',
    };

    onAddTransaction(newTransaction);
    setForm((prev) => ({ ...prev, amount: '0', description: '' }));
  };

  const handleFilterChange = (event: InputChangeEvent) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesAccount =
        filters.accountId === 'ALL' || transaction.accountId === filters.accountId;
      const matchesDirection =
        filters.direction === 'ALL' || transaction.direction === filters.direction;
      return matchesAccount && matchesDirection;
    });
  }, [filters.accountId, filters.direction, transactions]);

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Cashflow</p>
          <h2>Transactions</h2>
        </div>
        <span className="pill">
          {filteredTransactions.length} of {transactions.length} records
        </span>
      </div>

      <div className="grid two-col inline-fields">
        <label className="field">
          <span>Filter by account</span>
          <select name="accountId" value={filters.accountId} onChange={handleFilterChange}>
            <option value="ALL">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Filter by direction</span>
          <select name="direction" value={filters.direction} onChange={handleFilterChange}>
            <option value="ALL">All directions</option>
            <option value="NEGATIVE">Charges (increase debt)</option>
            <option value="POSITIVE">Payments (reduce debt)</option>
          </select>
        </label>
      </div>

      <form className="grid account-form" onSubmit={handleSubmit}>
        <div className="grid two-col inline-fields">
          <label className="field">
            <span>Account</span>
            <select name="accountId" value={form.accountId} onChange={handleChange} disabled={accounts.length === 0}>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Date</span>
            <input name="date" type="date" value={form.date} onChange={handleChange} />
          </label>
        </div>

        <div className="grid two-col inline-fields">
          <label className="field">
            <span>Amount (TRY)</span>
            <input
              name="amount"
              type="number"
              min="0"
              step="100"
              value={form.amount}
              onChange={handleChange}
              inputMode="decimal"
            />
            <p className="muted small">Always enter positive amounts; direction decides if debt goes up or down.</p>
          </label>
          <label className="field">
            <span>Direction</span>
            <select name="direction" value={form.direction} onChange={handleChange}>
              <option value="NEGATIVE">Charge (increase debt)</option>
              <option value="POSITIVE">Payment (reduce debt)</option>
            </select>
          </label>
        </div>

        <div className="grid two-col inline-fields">
          <label className="field">
            <span>Category</span>
            <div className="preset-row">
              {categoryPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`pill preset ${form.category === preset ? 'active' : ''}`}
                  onClick={() => setForm((prev) => ({ ...prev, category: preset }))}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input name="category" value={form.category} onChange={handleChange} />
          </label>
          <label className="field">
            <span>Description</span>
            <input name="description" value={form.description} onChange={handleChange} />
          </label>
        </div>

        <button type="submit" disabled={accounts.length === 0}>
          Add transaction
        </button>
      </form>

      <ul className="list">
        {filteredTransactions.map((transaction) => {
          const accountName = accounts.find((account) => account.id === transaction.accountId)?.name || 'Unknown account';
          return <TransactionRow key={transaction.id} transaction={transaction} accountName={accountName} />;
        })}
        {filteredTransactions.length === 0 && (
          <p className="empty">No transactions match your filters. Try adjusting them to see results.</p>
        )}
      </ul>
    </section>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => loadFromStorage(storageKeys.theme, 'light'));

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const legacyNotes = collectLegacyNotes();
    const stored = loadFromStorage<Account[]>(storageKeys.accounts, []);
    return stored.length ? stored : createDefaultAccounts(legacyNotes);
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const stored = loadFromStorage<Transaction[]>(storageKeys.transactions, []);
    return stored.length ? stored : createDefaultTransactions(accounts);
  });

  const themeClass = useMemo(() => (theme === 'dark' ? 'dark' : 'light'), [theme]);

  const totalBalance = useMemo(
    () => accounts.reduce((sum, account) => sum + getBalance(account, transactions), 0),
    [accounts, transactions],
  );

  useEffect(() => {
    saveToStorage(storageKeys.accounts, accounts);
  }, [accounts]);

  useEffect(() => {
    saveToStorage(storageKeys.transactions, transactions);
  }, [transactions]);

  useEffect(() => {
    saveToStorage(storageKeys.theme, theme);
    document.documentElement.setAttribute('data-theme', themeClass);
  }, [theme, themeClass]);

  const addAccount = (account: Account) => setAccounts((prev) => [account, ...prev]);

  const addTransaction = (transaction: Transaction) => setTransactions((prev) => [transaction, ...prev]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <div className={`page ${themeClass}`}>
      <div className="container">
        <Header theme={theme} onToggleTheme={toggleTheme} />

        <section className="card stats">
          <div>
            <p className="eyebrow">Current debt</p>
            <h2>{formatCurrency(totalBalance)}</h2>
            <p className="muted">NEGATIVE increases debt, POSITIVE reduces it.</p>
          </div>
          <div className="stat-grid">
            {accounts.map((account) => {
              const balance = getBalance(account, transactions);
              return (
                <div key={account.id} className="stat">
                  <p className="muted">{account.name}</p>
                  <strong className={balance > 0 ? 'negative' : 'positive'}>{formatCurrency(balance)}</strong>
                </div>
              );
            })}
            {accounts.length === 0 && <p className="empty">Add an account to see balances.</p>}
          </div>
        </section>

        <main className="grid two-col">
          <AccountsSection accounts={accounts} transactions={transactions} onAddAccount={addAccount} />
          <TransactionsSection accounts={accounts} transactions={transactions} onAddTransaction={addTransaction} />
        </main>
      </div>
    </div>
  );
}
