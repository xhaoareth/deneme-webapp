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

function formatAccountType(type: AccountType): string {
  const labels: Record<AccountType, string> = {
    CREDIT_CARD: 'Credit card',
    LOAN: 'Loan',
    OVERDRAFT: 'Overdraft',
  };

  return labels[type];
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

function AccountCard({
  account,
  balance,
  onDelete,
}: {
  account: Account;
  balance: number;
  onDelete?: (account: Account) => void;
}) {
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
        {onDelete && (
          <button
            type="button"
            className="ghost danger-text"
            onClick={() => onDelete(account)}
          >
            Delete account
          </button>
        )}
      </div>
    </li>
  );
}

function AccountsSection({
  accounts,
  transactions,
  onAddAccount,
  onDeleteAccount,
}: {
  accounts: Account[];
  transactions: Transaction[];
  onAddAccount: (account: Account) => void;
  onDeleteAccount: (accountId: string) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    type: 'CREDIT_CARD' as AccountType,
    bankName: '',
    startingDebt: '0',
    notes: '',
  });
  const [error, setError] = useState('');

  const handleChange = (event: InputChangeEvent) => {
    const { name, value } = event.target;
    if (name === 'startingDebt') {
      const sanitizedValue = value === '' ? '' : Math.max(0, Number(value));
      setForm((prev) => ({ ...prev, startingDebt: sanitizedValue.toString() }));
      setError('');
      return;
    }

    setError('');
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: FormSubmitEvent) => {
    event.preventDefault();
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError('Lütfen hesap adı girin.');
      return;
    }

    const startingDebtValue = Number(form.startingDebt);

    if (Number.isNaN(startingDebtValue)) {
      setError('Başlangıç borcunu sayısal olarak girin.');
      return;
    }

    if (startingDebtValue < 0) {
      setError('Başlangıç borcu negatif olamaz.');
      return;
    }

    const newAccount: Account = {
      id: crypto.randomUUID(),
      name: trimmedName,
      type: form.type,
      bankName: form.bankName.trim() || 'Unnamed Bank',
      currency: 'TRY',
      startingDebt: Math.max(0, Number(form.startingDebt)) || 0,
      createdAt: new Date().toISOString(),
      notes: form.notes.trim() || 'No notes yet.',
    };

    onAddAccount(newAccount);
    setForm({ name: '', type: 'CREDIT_CARD', bankName: '', startingDebt: '0', notes: '' });
    setError('');
  };

  const handleDeleteAccount = (account: Account) => {
    const confirmed = window.confirm(
      `Delete ${account.name}? Related transactions for this account will also be removed.`,
    );

    if (confirmed) {
      onDeleteAccount(account.id);
    }
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
            <p className="muted small">Başlangıç borcu, ilk borçlu olduğunuz tutardır.</p>
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
        {error && <p className="form-error">{error}</p>}
        <button type="submit">Add account</button>
      </form>

      <ul className="list">
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            balance={getBalance(account, transactions)}
            onDelete={() => handleDeleteAccount(account)}
          />
        ))}
        {accounts.length === 0 && (
          <p className="empty">No accounts yet. Add an account to start tracking balances and payments.</p>
        )}
      </ul>
    </section>
  );
}

const categoryPresets = ['Payment', 'Shopping', 'Interest', 'Cash', 'Other'] as const;

function TransactionRow({
  transaction,
  accountName,
  onDelete,
}: {
  transaction: Transaction;
  accountName: string;
  onDelete?: (transaction: Transaction) => void;
}) {
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
        {onDelete && (
          <button type="button" className="ghost danger-text" onClick={() => onDelete(transaction)}>
            Delete
          </button>
        )}
      </div>
    </li>
  );
}

function TransactionsSection({
  accounts,
  transactions,
  onAddTransaction,
  onDeleteTransaction,
}: {
  accounts: Account[];
  transactions: Transaction[];
  onAddTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
}) {
  const [form, setForm] = useState({
    accountId: accounts[0]?.id ?? '',
    date: new Date().toISOString().slice(0, 10),
    amount: '0',
    direction: 'NEGATIVE' as TransactionDirection,
    category: 'General',
    description: '',
  });
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    accountId: 'ALL',
    direction: 'ALL' as TransactionDirection | 'ALL',
  });

  const accountNameLookup = useMemo(
    () =>
      accounts.reduce<Record<string, string>>((acc, account) => {
        acc[account.id] = account.name;
        return acc;
      }, {}),
    [accounts],
  );

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
    setError('');
  };

  const handleSubmit = (event: FormSubmitEvent) => {
    event.preventDefault();

    if (!form.accountId) {
      setError('İşlem eklemek için bir hesap seçin.');
      return;
    }

    const amountValue = Math.abs(Number(form.amount));

    if (Number.isNaN(amountValue)) {
      setError('Lütfen geçerli bir tutar girin.');
      return;
    }

    if (amountValue <= 0) {
      setError("Tutar 0'dan büyük olmalıdır.");
      return;
    }

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      accountId: form.accountId,
      date: new Date(form.date).toISOString(),
      amount: amountValue || 0,
      direction: form.direction,
      category: form.category.trim() || 'General',
      description: form.description.trim() || 'No description',
    };

    onAddTransaction(newTransaction);
    setForm((prev) => ({ ...prev, amount: '0', description: '' }));
    setError('');
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

  const handleDeleteTransaction = (transaction: Transaction) => {
    const confirmed = window.confirm(
      `Delete this transaction for ${accountNameLookup[transaction.accountId] ?? 'an account'}?`,
    );

    if (confirmed) {
      onDeleteTransaction(transaction.id);
    }
  };

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
            <p className="muted small">Her zaman pozitif tutar girin; yön borcun artıp azaldığını belirler.</p>
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

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={accounts.length === 0}>
          Add transaction
        </button>
      </form>

      <ul className="list">
        {filteredTransactions.map((transaction) => {
          const accountName = accounts.find((account) => account.id === transaction.accountId)?.name || 'Unknown account';
          return (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              accountName={accountName}
              onDelete={handleDeleteTransaction}
            />
          );
        })}
        {filteredTransactions.length === 0 && (
          <p className="empty">
            {transactions.length === 0
              ? 'No transactions yet. Log your first charge or payment to visualize activity.'
              : 'No transactions match your filters. Try adjusting them to see results.'}
          </p>
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

  const accountSummaries = useMemo(
    () => accounts.map((account) => ({ account, balance: getBalance(account, transactions) })),
    [accounts, transactions],
  );

  const totalRemainingDebt = useMemo(
    () => accountSummaries.reduce((sum, { balance }) => sum + Math.max(balance, 0), 0),
    [accountSummaries],
  );

  const breakdownByType = useMemo(
    () =>
      accountSummaries.reduce(
        (totals, { account, balance }) => ({
          ...totals,
          [account.type]: (totals[account.type] ?? 0) + Math.max(balance, 0),
        }),
        { CREDIT_CARD: 0, LOAN: 0, OVERDRAFT: 0 } as Record<AccountType, number>,
      ),
    [accountSummaries],
  );

  const recentTransactions = useMemo(() => {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - 30);
    return transactions.filter((transaction) => new Date(transaction.date) >= windowStart);
  }, [transactions]);

  const totalRecentPayments = useMemo(
    () =>
      recentTransactions
        .filter((transaction) => transaction.direction === 'POSITIVE')
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    [recentTransactions],
  );

  const totalRecentCharges = useMemo(
    () =>
      recentTransactions
        .filter((transaction) => transaction.direction === 'NEGATIVE')
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    [recentTransactions],
  );

  const highestDebtAccount = useMemo(
    () =>
      accountSummaries.reduce<{ account: Account; debt: number } | null>((current, entry) => {
        const debt = Math.max(entry.balance, 0);
        if (!current || debt > current.debt) {
          return { account: entry.account, debt };
        }
        return current;
      }, null),
    [accountSummaries],
  );

  const accountsWithoutRecentPayments = useMemo(
    () =>
      accountSummaries.filter(
        ({ account }) =>
          !recentTransactions.some(
            (transaction) => transaction.accountId === account.id && transaction.direction === 'POSITIVE',
          ),
      ),
    [accountSummaries, recentTransactions],
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

  const deleteAccount = (accountId: string) => {
    setAccounts((prev) => prev.filter((account) => account.id !== accountId));
    setTransactions((prev) => prev.filter((transaction) => transaction.accountId !== accountId));
  };

  const deleteTransaction = (transactionId: string) =>
    setTransactions((prev) => prev.filter((transaction) => transaction.id !== transactionId));

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <div className={`page ${themeClass}`}>
      <div className="container">
        <Header theme={theme} onToggleTheme={toggleTheme} />

        <div className="info-box">
          <p>
            All data is stored only on this device (local browser storage). Güvenlik için bilgileriniz
            dışa aktarılmaz.
          </p>
        </div>

        <section className="card stats">
          <div className="stats-header">
            <div>
              <p className="eyebrow">Debt pulse</p>
              <h2>{formatCurrency(totalRemainingDebt)}</h2>
              <p className="muted">Total remaining debt across all accounts.</p>
            </div>

            <div className="highlight-grid">
              <div className="highlight">
                <p className="muted small">30-day payments</p>
                <strong className="positive">{formatCurrency(totalRecentPayments)}</strong>
                <p className="muted">Expenses & interest: {formatCurrency(totalRecentCharges)}</p>
              </div>
              <div className="highlight">
                <p className="muted small">Highest debt</p>
                {highestDebtAccount ? (
                  <>
                    <strong className="negative">{formatCurrency(highestDebtAccount.debt)}</strong>
                    <p className="muted">{highestDebtAccount.account.name}</p>
                  </>
                ) : (
                  <p className="muted">Add an account to track your exposure.</p>
                )}
              </div>
            </div>
          </div>

          <div className="summary-grid">
            <div className="metric-card">
              <p className="muted small">Breakdown by account type</p>
              <ul className="mini-list">
                {Object.entries(breakdownByType).map(([type, amount]) => (
                  <li key={type}>
                    <span>{formatAccountType(type as AccountType)}</span>
                    <strong>{formatCurrency(amount)}</strong>
                  </li>
                ))}
              </ul>
            </div>

            <div className="metric-card">
              <p className="muted small">Account with highest debt</p>
              {highestDebtAccount ? (
                <div className="stack">
                  <strong className="negative">{formatCurrency(highestDebtAccount.debt)}</strong>
                  <p className="muted">{highestDebtAccount.account.bankName}</p>
                  <p>{highestDebtAccount.account.name}</p>
                </div>
              ) : (
                <p className="empty">No accounts yet.</p>
              )}
            </div>

            <div className="metric-card">
              <p className="muted small">Payment health (last 30 days)</p>
              {accountsWithoutRecentPayments.length === 0 ? (
                <p className="positive">Every account has a recent payment.</p>
              ) : (
                <ul className="mini-list warning">
                  {accountsWithoutRecentPayments.map(({ account }) => (
                    <li key={account.id}>
                      <span>{account.name}</span>
                      <span className="muted small">No POSITIVE transactions</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="stat-grid">
            {accountSummaries.map(({ account, balance }) => (
              <div key={account.id} className="stat">
                <div className="stack">
                  <p className="muted small">{formatAccountType(account.type)}</p>
                  <p>{account.name}</p>
                </div>
                <strong className={balance > 0 ? 'negative' : 'positive'}>{formatCurrency(balance)}</strong>
              </div>
            ))}
            {accounts.length === 0 && <p className="empty">Add an account to see balances.</p>}
          </div>
        </section>

        <main className="grid two-col">
          <AccountsSection
            accounts={accounts}
            transactions={transactions}
            onAddAccount={addAccount}
            onDeleteAccount={deleteAccount}
          />
          <TransactionsSection
            accounts={accounts}
            transactions={transactions}
            onAddTransaction={addTransaction}
            onDeleteTransaction={deleteTransaction}
          />
        </main>
      </div>
    </div>
  );
}
