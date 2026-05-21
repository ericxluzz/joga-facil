// Maps tenant_payment_accounts rows → ValidaPay proposal payloads.
import type { TenantPaymentAccount } from '@agendaslim/db/schema';
import type { ProposalPayload, ProposalDocument, ProposalAddress } from './types';

function buildAddress(account: TenantPaymentAccount): ProposalAddress {
  return {
    street: account.addressStreet || '',
    number: account.addressNumber || '',
    complement: account.addressComplement || undefined,
    neighborhood: account.addressNeighborhood || '',
    city: account.addressCity || '',
    state: account.addressState || '',
    zipCode: (account.addressZipcode || '').replace(/\D/g, ''),
  };
}

export function accountToProposal(
  account: TenantPaymentAccount,
  documents: { documentType: string; fileUrl: string }[],
  webhookUrl: string,
): ProposalPayload {
  const address = buildAddress(account);
  const docs: ProposalDocument[] = documents.map((d) => ({
    type: d.documentType,
    url: d.fileUrl,
  }));

  const financialDetails = account.estimatedMonthlyRevenueCents
    ? { estimatedMonthlyRevenue: Number(account.estimatedMonthlyRevenueCents) / 100 }
    : undefined;

  if (account.personType === 'PJ') {
    return {
      type: 'PJ',
      companyName: account.legalName,
      tradeName: account.tradeName || undefined,
      document: account.document.replace(/\D/g, ''),
      email: account.email,
      phone: account.phone.replace(/\D/g, ''),
      address,
      representative: {
        name: account.representativeName || '',
        document: (account.representativeDocument || '').replace(/\D/g, ''),
        birthDate: account.representativeBirthDate || '',
        email: account.representativeEmail || '',
        phone: (account.representativePhone || '').replace(/\D/g, ''),
      },
      financialDetails,
      webhookUrl,
      documents: docs,
    };
  }

  return {
    type: 'PF',
    name: account.legalName,
    document: account.document.replace(/\D/g, ''),
    birthDate: account.birthDate || '',
    email: account.email,
    phone: account.phone.replace(/\D/g, ''),
    address,
    financialDetails,
    webhookUrl,
    documents: docs,
  };
}
