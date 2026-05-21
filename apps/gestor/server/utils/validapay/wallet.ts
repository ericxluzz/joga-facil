// Wallet operations: balance, transactions, withdrawals.
import { vpFetch } from './client';
import type { BalanceResponse, TransactionsResponse, WithdrawalResponse } from './types';

export type WalletBalance = {
  availableCents: number;
  pendingCents: number;
};

export type WalletTransaction = {
  id: string;
  type: string;
  amountCents: number;
  description: string;
  date: string;
  status: string;
  raw: Record<string, unknown>;
};

function decimalToCents(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export async function getBalance(accountNumber: string): Promise<WalletBalance> {
  const res = await vpFetch<BalanceResponse>('/v1/wallet/balance', { accountNumber });

  const available =
    res.available ?? res.availableAmount ?? res.available_amount ?? 0;
  const pending =
    res.pending ?? res.pendingAmount ?? res.pending_amount ?? 0;

  return {
    availableCents: decimalToCents(available),
    pendingCents: decimalToCents(pending),
  };
}

export async function getTransactions(
  accountNumber: string,
  params: { from?: string; to?: string; type?: string } = {},
): Promise<WalletTransaction[]> {
  const qs = new URLSearchParams();
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.type) qs.set('type', params.type);

  const path = `/v1/wallet/transactions${qs.toString() ? `?${qs}` : ''}`;
  const res = await vpFetch<TransactionsResponse>(path, { accountNumber });

  const items = res.items ?? res.data ?? res.transactions ?? [];
  return items.map((item) => ({
    id: item.id,
    type: item.type,
    amountCents: decimalToCents(item.amount),
    description: item.description || '',
    date: item.date || item.createdAt || '',
    status: item.status || '',
    raw: item as Record<string, unknown>,
  }));
}

export async function requestWithdrawal(
  accountNumber: string,
  amountCents: number,
): Promise<WithdrawalResponse> {
  return vpFetch<WithdrawalResponse>('/v1/wallet/withdrawals', {
    method: 'POST',
    accountNumber,
    body: JSON.stringify({ amount: amountCents / 100 }),
  });
}
