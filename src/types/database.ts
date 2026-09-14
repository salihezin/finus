export type AccountType = 'CASH' | 'BANK' | 'CREDIT_CARD' | 'FX_GOLD';
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'DEBT_GIVEN' | 'DEBT_TAKEN';
export type CategoryType = 'INCOME' | 'EXPENSE';

export interface Profile {
  id: string;
  full_name: string;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  credit_limit: number | null;
  cutoff_day: number | null;
  due_day_offset: number | null;
  created_at: string;
}

export interface Person {
  id: string;
  name: string;
  balance: number;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  created_at: string;
}

export interface Installment {
  id: string;
  account_id: string;
  title: string;
  total_amount: number;
  monthly_amount: number;
  total_installments: number;
  remaining_installments: number;
  start_date: string;
  is_active: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  created_by: string;
  account_id: string;
  target_account_id: string | null;
  person_id: string | null;
  category_id: string | null;
  amount: number;
  type: TransactionType;
  period: string | null;
  transaction_date: string;
  description: string | null;
  parent_installment_id: string | null;
  created_at: string;
}