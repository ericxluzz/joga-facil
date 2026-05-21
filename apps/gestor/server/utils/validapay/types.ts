// ValidaPay API types — field names are best-effort based on public docs.
// Adjust after sandbox validation (see docs/validapay-sandbox-checklist.md).

export type ValidapayEnv = 'sandbox' | 'production';

// ── Auth ──────────────────────────────────────────────────────────────────

export type TokenResponse = {
  access_token?: string;
  accessToken?: string;
  token?: string;
  expires_in?: number;
  expiresIn?: number;
};

// ── Subaccount Proposals ──────────────────────────────────────────────────

export type ProposalAddress = {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
};

export type ProposalPFPayload = {
  type: 'PF';
  name: string;
  document: string; // CPF
  birthDate: string; // YYYY-MM-DD
  email: string;
  phone: string;
  address: ProposalAddress;
  financialDetails?: {
    estimatedMonthlyRevenue?: number;
  };
  webhookUrl?: string;
  documents?: ProposalDocument[];
};

export type ProposalPJPayload = {
  type: 'PJ';
  companyName: string;
  tradeName?: string;
  document: string; // CNPJ
  email: string;
  phone: string;
  address: ProposalAddress;
  representative: {
    name: string;
    document: string; // CPF
    birthDate: string; // YYYY-MM-DD
    email: string;
    phone: string;
  };
  financialDetails?: {
    estimatedMonthlyRevenue?: number;
  };
  webhookUrl?: string;
  documents?: ProposalDocument[];
};

export type ProposalDocument = {
  type: string; // rg_front, cnh, etc.
  url: string;
};

export type ProposalPayload = ProposalPFPayload | ProposalPJPayload;

export type ProposalResponse = {
  formId?: string;
  form_id?: string;
  id?: string;
  status?: string;
  accountNumber?: string;
  account_number?: string;
  [key: string]: unknown;
};

// ── Wallet ────────────────────────────────────────────────────────────────

export type BalanceResponse = {
  available?: number;
  availableAmount?: number;
  available_amount?: number;
  pending?: number;
  pendingAmount?: number;
  pending_amount?: number;
  [key: string]: unknown;
};

export type TransactionItem = {
  id: string;
  type: string;
  amount: number;
  description?: string;
  date?: string;
  createdAt?: string;
  status?: string;
  [key: string]: unknown;
};

export type TransactionsResponse = {
  items?: TransactionItem[];
  data?: TransactionItem[];
  transactions?: TransactionItem[];
  [key: string]: unknown;
};

export type WithdrawalResponse = {
  withdrawalId?: string;
  withdrawal_id?: string;
  id?: string;
  status?: string;
  [key: string]: unknown;
};
