import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronDown,
  AlertTriangle,
  FileSpreadsheet,
  Check,
  X,
  ExternalLink,
  Info,
  FileText
} from 'lucide-react';
import { Claim, PricingResult } from '../types';
import { approveClaim, rejectClaim, formatINR, formatDate } from '../api';

interface InsurerDashboardProps {
  claims: Claim[];
  onClaimProcessed: () => void;
  showToast: (title: string, message: string, type?: 'success' | 'error') => void;
}

export const InsurerDashboard: React.FC<InsurerDashboardProps> = ({
  claims,
  onClaimProcessed,
  showToast,
}) => {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'processed'>('pending');

  // Approve modal state
  const [approveModalClaim, setApproveModalClaim] = useState<Claim | null>(null);
  const [approveAmount, setApproveAmount] = useState<number>(0);
  const [isApproving, setIsApproving] = useState(false);

  // Reject modal state
  const [rejectModalClaim, setRejectModalClaim] = useState<Claim | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Filtering
  const pendingClaims = claims.filter((c) => c.status === 'pending');
  const processedClaims = claims.filter((c) => c.status !== 'pending');

  const approvedClaims = claims.filter((c) => c.status === 'approved');
  const rejectedClaims = claims.filter((c) => c.status === 'rejected');
  const totalPaidOut = approvedClaims.reduce(
    (sum, c) => sum + (c.approved_amount || 0),
    0
  );

  const toggleExpand = (id: string) => {
    setExpandedCardId((prev) => (prev === id ? null : id));
  };

  const handleOpenApproveModal = (claim: Claim) => {
    const suggested =
      claim.pricing_result?.estimated_payout_inr ??
      claim.pricing_result?.known_damage_estimate_inr ??
      claim.pricing_result?.total_repair_estimate_inr ??
      0;
    setApproveModalClaim(claim);
    setApproveAmount(suggested);
  };

  const handleConfirmApprove = async () => {
    if (!approveModalClaim) return;
    if (approveAmount < 0 || isNaN(approveAmount)) {
      showToast('Invalid Amount', 'Please provide a valid non-negative payout amount.', 'error');
      return;
    }

    setIsApproving(true);
    try {
      await approveClaim(approveModalClaim.id, approveAmount);
      showToast(
        'Claim Approved & Credited! 💸',
        `₹${formatINR(approveAmount)} has been credited to ${approveModalClaim.customer_name}'s dashboard.`,
        'success'
      );
      setApproveModalClaim(null);
      onClaimProcessed();
    } catch (err: any) {
      showToast('Approval Failed', err.message || 'Could not approve claim.', 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const handleOpenRejectModal = (claim: Claim) => {
    setRejectModalClaim(claim);
    setRejectReason('Damage not covered under current comprehensive policy terms.');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalClaim) return;
    if (!rejectReason.trim()) {
      showToast('Reason Required', 'Please provide a rejection reason.', 'error');
      return;
    }

    setIsRejecting(true);
    try {
      await rejectClaim(rejectModalClaim.id, rejectReason.trim());
      showToast(
        'Claim Rejected',
        `Claim #${rejectModalClaim.id} has been marked as rejected.`,
        'success'
      );
      setRejectModalClaim(null);
      onClaimProcessed();
    } catch (err: any) {
      showToast('Rejection Failed', err.message || 'Could not reject claim.', 'error');
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="insurer-dashboard">
      {/* ── KPI Stats Bar ────────────────────────────────────────────────────── */}
      <div className="stats-bar">
        <div className="stat-cell">
          <div className="stat-num">{claims.length}</div>
          <div className="stat-label">Total Claims</div>
        </div>
        <div className="stat-cell">
          <div className="stat-num pending">{pendingClaims.length}</div>
          <div className="stat-label">Pending Review</div>
        </div>
        <div className="stat-cell">
          <div className="stat-num approved">{approvedClaims.length}</div>
          <div className="stat-label">Approved</div>
        </div>
        <div className="stat-cell">
          <div className="stat-num rejected">{rejectedClaims.length}</div>
          <div className="stat-label">Rejected</div>
        </div>
        <div className="stat-cell">
          <div className="stat-num payout">₹{formatINR(totalPaidOut)}</div>
          <div className="stat-label">Total Credited</div>
        </div>
      </div>

      {/* ── Tabs for Pending vs Processed ────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            background: activeTab === 'pending' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)',
            borderColor: activeTab === 'pending' ? 'var(--amber)' : 'var(--border)',
            borderWidth: '1px',
            borderStyle: 'solid',
            color: activeTab === 'pending' ? 'var(--amber-light)' : 'var(--text-subtle)',
            padding: '0.5rem 1.25rem',
            borderRadius: '50px',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s ease',
          }}
        >
          <ShieldAlert size={16} /> Pending Review ({pendingClaims.length})
        </button>

        <button
          onClick={() => setActiveTab('processed')}
          style={{
            background: activeTab === 'processed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
            borderColor: activeTab === 'processed' ? 'var(--green)' : 'var(--border)',
            borderWidth: '1px',
            borderStyle: 'solid',
            color: activeTab === 'processed' ? 'var(--green-light)' : 'var(--text-subtle)',
            padding: '0.5rem 1.25rem',
            borderRadius: '50px',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s ease',
          }}
        >
          <CheckCircle2 size={16} /> Processed Claims ({processedClaims.length})
        </button>
      </div>

      {/* ── Claims Rendering ─────────────────────────────────────────────────── */}
      {activeTab === 'pending' && (
        <div className="pending-claims-section">
          {pendingClaims.length === 0 ? (
            <div className="empty-box">
              <div className="empty-box-icon">🎉</div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.3rem' }}>
                All Caught Up!
              </div>
              <div>No claims currently pending insurer adjudication.</div>
            </div>
          ) : (
            pendingClaims.map((claim) => renderClaimCard(claim, true))
          )}
        </div>
      )}

      {activeTab === 'processed' && (
        <div className="processed-claims-section">
          {processedClaims.length === 0 ? (
            <div className="empty-box">
              <div className="empty-box-icon">📁</div>
              <div>No processed claims recorded yet.</div>
            </div>
          ) : (
            processedClaims.map((claim) => renderClaimCard(claim, false))
          )}
        </div>
      )}

      {/* ── Approve & Credit Modal ───────────────────────────────────────────── */}
      {approveModalClaim && (
        <div className="modal-overlay" onClick={() => setApproveModalClaim(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ color: 'var(--green-light)' }}>
                <CheckCircle2 size={22} /> Approve Claim & Credit Customer
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setApproveModalClaim(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-subtext">
              Approving Claim <strong>#{approveModalClaim.id}</strong> will immediately credit this amount into{' '}
              <strong>{approveModalClaim.customer_name}</strong>'s customer dashboard.
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label>Credited Payout Amount (INR ₹)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={approveAmount}
                onChange={(e) => setApproveAmount(parseInt(e.target.value, 10) || 0)}
                autoFocus
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                Default: Deterministic CSV calculation (Repair cost minus ₹1,000 deductible)
              </span>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setApproveModalClaim(null)}
                disabled={isApproving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-approve-credit"
                style={{ flex: 'initial' }}
                onClick={handleConfirmApprove}
                disabled={isApproving}
              >
                {isApproving ? 'Processing Credit...' : `Confirm & Credit ₹${formatINR(approveAmount)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ─────────────────────────────────────────────────────── */}
      {rejectModalClaim && (
        <div className="modal-overlay" onClick={() => setRejectModalClaim(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ color: 'var(--red-light)' }}>
                <XCircle size={22} /> Reject Claim
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setRejectModalClaim(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-subtext">
              Rejecting Claim <strong>#{rejectModalClaim.id}</strong> ({rejectModalClaim.vehicle_number} -{' '}
              {rejectModalClaim.customer_name}). The customer will be informed of this reason.
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label>Rejection Rationale</label>
              <textarea
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="State policy exclusion or inspection requirement..."
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setRejectModalClaim(null)}
                disabled={isRejecting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-reject-claim"
                onClick={handleConfirmReject}
                disabled={isRejecting}
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper renderer for a claim card
  function renderClaimCard(claim: Claim, isPending: boolean) {
    const isExpanded = expandedCardId === claim.id;
    const damages = claim.vision_result?.damages || [];
    const uncertainties = claim.vision_result?.uncertainties || [];
    const breakdown = claim.pricing_result?.breakdown || [];
    const pr: Partial<PricingResult> = claim.pricing_result || {};

    const suggestedPayout =
      pr.estimated_payout_inr ??
      pr.known_damage_estimate_inr ??
      pr.total_repair_estimate_inr ??
      0;

    return (
      <div key={claim.id} className="insurer-claim-card">
        {/* Card Header Bar */}
        <div className="insurer-card-header" onClick={() => toggleExpand(claim.id)}>
          {claim.image_filename ? (
            <img
              className="claim-thumb"
              src={`/uploads/${claim.image_filename}`}
              alt="Vehicle"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="claim-thumb-fallback">🚗</div>
          )}

          <div className="insurer-meta-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span className="claim-id-text">#{claim.id}</span>
              {claim.status === 'pending' && (
                <span className="status-badge pending">⏳ Pending</span>
              )}
              {claim.status === 'approved' && (
                <span className="status-badge approved">✅ Approved</span>
              )}
              {claim.status === 'rejected' && (
                <span className="status-badge rejected">❌ Rejected</span>
              )}
              {claim.vision_result?.human_review_required && (
                <span className="status-badge review">🔍 Review Flagged</span>
              )}
            </div>

            <div className="insurer-name">{claim.customer_name}</div>
            <div className="insurer-veh">🚗 {claim.vehicle_number}</div>
          </div>

          <div className="insurer-card-right">
            {isPending && suggestedPayout > 0 && (
              <>
                <div className="est-payout-val">₹{formatINR(suggestedPayout)}</div>
                <div className="est-payout-lbl">Calculated Payout</div>
              </>
            )}

            {!isPending && claim.status === 'approved' && (
              <>
                <div className="est-payout-val">₹{formatINR(claim.approved_amount)}</div>
                <div className="est-payout-lbl">Credited Payout</div>
              </>
            )}

            <div className="claim-date-text" style={{ marginTop: '0.35rem' }}>
              {formatDate(claim.submitted_at)}
            </div>
          </div>

          <ChevronDown
            size={18}
            className={`expand-chevron ${isExpanded ? 'open' : ''}`}
          />
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="insurer-card-body">
            <div className="detail-split-grid">
              {/* Left Column: Image preview */}
              <div className="detail-image-box">
                {claim.image_filename ? (
                  <img
                    src={`/uploads/${claim.image_filename}`}
                    alt="Damage Assessment"
                  />
                ) : (
                  <div
                    style={{
                      height: '180px',
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '3rem',
                    }}
                  >
                    🚗
                  </div>
                )}
              </div>

              {/* Right Column: Gemma Vision AI Breakdown */}
              <div>
                <div className="detail-block">
                  <div className="detail-block-title">
                    <Eye size={15} color="var(--blue-light)" /> Gemma Vision AI Damage Assessment
                  </div>

                  {damages.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No damage components identified.
                    </div>
                  ) : (
                    <div className="damage-list">
                      {damages.map((item, idx) => (
                        <div key={idx} className="damage-row">
                          <div>
                            <div className="damage-part-name">
                              {item.part.replace(/_/g, ' ')}
                            </div>
                            <div className="damage-type-name">
                              Damage: {item.damage_type.replace(/_/g, ' ')}
                            </div>
                          </div>
                          <span
                            className={`sev-tag ${
                              item.severity === 'severe'
                                ? 'sev-severe'
                                : item.severity === 'moderate'
                                ? 'sev-moderate'
                                : 'sev-minor'
                            }`}
                          >
                            {item.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI Uncertainties */}
                {uncertainties.length > 0 && (
                  <div className="uncertainty-box">
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                      <AlertTriangle size={15} /> AI Vision Uncertainties / Notes:
                    </div>
                    <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                      {uncertainties.map((u, i) => (
                        <li key={i}>{u}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Deterministic Cost Breakdown Table */}
            <div className="detail-block">
              <div className="detail-block-title">
                <FileSpreadsheet size={15} color="var(--green-light)" /> Deterministic Repair Cost Estimation (CSV Table)
              </div>

              {breakdown.length > 0 ? (
                <table className="cost-table">
                  <thead>
                    <tr>
                      <th>Automotive Component</th>
                      <th>Damage Details</th>
                      <th style={{ textAlign: 'right' }}>Standard Catalog Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.map((b, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                          {b.part.replace(/_/g, ' ')}
                        </td>
                        <td style={{ color: 'var(--text-subtle)', textTransform: 'capitalize' }}>
                          {b.damage_type.replace(/_/g, ' ')} ({b.severity})
                        </td>
                        <td className="cost-val">₹{formatINR(b.estimated_repair_cost_inr)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {pr.total_repair_estimate_inr !== undefined && (
                      <tr>
                        <td colSpan={2}>Total Repair Estimate</td>
                        <td className="cost-val">₹{formatINR(pr.total_repair_estimate_inr)}</td>
                      </tr>
                    )}
                    {pr.deductible_inr !== undefined && (
                      <tr>
                        <td colSpan={2} style={{ color: 'var(--text-muted)' }}>
                          Policy Deductible
                        </td>
                        <td className="cost-val" style={{ color: 'var(--text-muted)' }}>
                          – ₹{formatINR(pr.deductible_inr)}
                        </td>
                      </tr>
                    )}
                    {pr.estimated_payout_inr !== undefined && (
                      <tr>
                        <td colSpan={2} className="payout-highlight">
                          Calculated Payout Credit
                        </td>
                        <td className="cost-val payout-highlight">
                          ₹{formatINR(pr.estimated_payout_inr)}
                        </td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  {pr.reason ? (
                    <div style={{ color: 'var(--amber-light)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Info size={15} /> {Array.isArray(pr.reason) ? pr.reason.join('; ') : pr.reason}
                    </div>
                  ) : (
                    'No price breakdown available.'
                  )}
                </div>
              )}
            </div>

            {/* Official Terminal Assessment Report */}
            {claim.report_text && (
              <div className="detail-block">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <div className="detail-block-title" style={{ margin: 0 }}>
                    <FileText size={15} color="var(--blue-light)" /> Official Claim Assessment Report
                  </div>
                  <button
                    type="button"
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-subtle)',
                      padding: '0.3rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(claim.report_text || '');
                      showToast('Copied!', 'Official report copied to clipboard.', 'success');
                    }}
                  >
                    📋 Copy Report
                  </button>
                </div>
                <pre
                  style={{
                    background: 'rgba(0, 0, 0, 0.55)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '1.2rem',
                    fontSize: '0.82rem',
                    fontFamily: 'monospace',
                    color: '#e2e8f0',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.45',
                    maxHeight: '320px',
                    overflowY: 'auto',
                  }}
                >
                  {claim.report_text}
                </pre>
              </div>
            )}

            {/* Actions or Processed Banner */}
            {isPending && (
              <div className="action-buttons-row">
                <button
                  type="button"
                  className="btn-approve-credit"
                  onClick={() => handleOpenApproveModal(claim)}
                >
                  <Check size={18} />
                  <span>Approve & Credit ₹{formatINR(suggestedPayout)} to Customer</span>
                </button>

                <button
                  type="button"
                  className="btn-reject-claim"
                  onClick={() => handleOpenRejectModal(claim)}
                >
                  <X size={18} />
                  <span>Reject Claim</span>
                </button>
              </div>
            )}

            {!isPending && claim.status === 'approved' && (
              <div className="banner-processed approved">
                <CheckCircle2 size={24} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                    Approved & Credited: ₹{formatINR(claim.approved_amount)}
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                    Processed on {formatDate(claim.processed_at)} · Money credited to customer wallet
                  </div>
                </div>
              </div>
            )}

            {!isPending && claim.status === 'rejected' && (
              <div className="banner-processed rejected">
                <XCircle size={24} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>Claim Rejected</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                    Reason: {claim.reject_reason || 'Policy criteria not met.'} · Processed on{' '}
                    {formatDate(claim.processed_at)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
};
