export type AccountType = 'CREDIT_CARD' | 'LOAN' | 'OVERDRAFT';

export type TransactionDirection = 'POSITIVE' | 'NEGATIVE';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  bankName: string;
  currency: 'TRY';
  startingDebt: number;
  createdAt: string;
  notes: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  direction: TransactionDirection;
  category: string;
  description: string;
}
