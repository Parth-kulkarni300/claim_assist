import { Claim } from './types';

const API_BASE = '/api';

export async function getClaims(): Promise<Claim[]> {
  const res = await fetch(`${API_BASE}/claims`);
  if (!res.ok) {
    throw new Error(`Failed to fetch claims: ${res.statusText}`);
  }
  return res.json();
}

export async function getClaim(id: string): Promise<Claim> {
  const res = await fetch(`${API_BASE}/claims/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch claim #${id}`);
  }
  return res.json();
}

export async function submitClaim(formData: FormData): Promise<{
  claim_id: string;
  status: string;
  human_review_required: boolean;
  pricing_status: string;
}> {
  const res = await fetch(`${API_BASE}/claims`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to submit claim');
  }
  return data;
}

export async function approveClaim(
  id: string,
  amount?: number
): Promise<{ status: string; approved_amount: number }> {
  const res = await fetch(`${API_BASE}/claims/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(amount !== undefined ? { amount } : {}),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to approve claim');
  }
  return data;
}

export async function rejectClaim(
  id: string,
  reason: string
): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/claims/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to reject claim');
  }
  return data;
}

export function formatINR(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return Number(val).toLocaleString('en-IN');
}

export function formatDate(isoStr?: string | null): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}
