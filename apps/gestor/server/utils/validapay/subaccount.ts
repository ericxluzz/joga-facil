// Subaccount / proposal operations.
import { vpFetch } from './client';
import type { ProposalPayload, ProposalResponse } from './types';

export async function createSubaccountProposal(
  payload: ProposalPayload,
): Promise<ProposalResponse> {
  return vpFetch<ProposalResponse>('/v1/proposals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getSubaccountStatus(formId: string): Promise<ProposalResponse> {
  return vpFetch<ProposalResponse>(`/v1/proposals/${encodeURIComponent(formId)}`);
}

/** Extracts the formId from a proposal response regardless of field name. */
export function extractFormId(res: ProposalResponse): string | null {
  return res.formId || res.form_id || res.id || null;
}

/** Extracts the accountNumber from a proposal response regardless of field name. */
export function extractAccountNumber(res: ProposalResponse): string | null {
  return res.accountNumber || res.account_number || null;
}
