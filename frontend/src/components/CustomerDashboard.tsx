import React, { useState, useEffect, useRef } from 'react';
import {
  Wallet,
  Car,
  UploadCloud,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  FileText,
  X,
  Sparkles,
  ArrowRight,
  ChevronDown,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Claim, PricingResult } from '../types';
import { submitClaim, formatINR, formatDate } from '../api';

interface CustomerDashboardProps {
  claims: Claim[];
  onClaimSubmitted: (claimId: string) => void;
  onRefresh: () => void;
  showToast: (title: string, message: string, type?: 'success' | 'error') => void;
}

const STORAGE_KEY = 'claimassist_customer_claim_ids';

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  claims,
  onClaimSubmitted,
  onRefresh,
  showToast,
}) => {
  // Store customer's claim IDs in localStorage
  const [myClaimIds, setMyClaimIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    // Default seed claim for immediate visual demo if present
    const seedIds = ['CLM1001', 'CLM1002', 'CLM1003'];
    return seedIds;
  });

  const [customerName, setCustomerName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevApprovedCountRef = useRef<number>(0);

  // Filter claims that belong to this customer
  const myClaims = claims.filter((c) => myClaimIds.includes(c.id));

  // Calculate total credited money
  const approvedClaims = myClaims.filter((c) => c.status === 'approved');
  const totalCredited = approvedClaims.reduce(
    (sum, c) => sum + (c.approved_amount || 0),
    0
  );

  // Save to localStorage when IDs change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(myClaimIds));
  }, [myClaimIds]);

  // Watch for newly approved claims to fire celebratory confetti
  useEffect(() => {
    if (approvedClaims.length > prevApprovedCountRef.current && prevApprovedCountRef.current > 0) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#34d399', '#60a5fa']
      });
      showToast(
        '💰 Payment Credited!',
        `Your claim was approved! ₹${formatINR(totalCredited)} is credited to your wallet balance.`,
        'success'
      );
    }
    prevApprovedCountRef.current = approvedClaims.length;
  }, [approvedClaims.length, totalCredited, showToast]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Invalid File', 'Please select a valid image (JPG, PNG, WEBP).', 'error');
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      showToast('Missing Image', 'Please upload a photo of the vehicle damage.', 'error');
      return;
    }
    if (!customerName.trim()) {
      showToast('Missing Name', 'Please enter your full name.', 'error');
      return;
    }
    if (!vehicleNumber.trim()) {
      showToast('Missing Vehicle Registration', 'Please enter vehicle registration number.', 'error');
      return;
    }

    setIsSubmitting(true);
    setSubmitPhase('Uploading damage photo...');

    const fd = new FormData();
    fd.append('image', selectedFile);
    fd.append('customer_name', customerName.trim());
    fd.append('vehicle_number', vehicleNumber.trim().toUpperCase());

    try {
      setSubmitPhase('Gemma Vision AI analyzing vehicle damage...');
      const res = await submitClaim(fd);

      // Add to my claim IDs
      const newIds = [res.claim_id, ...myClaimIds];
      setMyClaimIds(newIds);
      onClaimSubmitted(res.claim_id);

      showToast(
        'Claim Submitted Successfully ✅',
        `Claim #${res.claim_id} is under review. You will receive updates as the insurer processes it.`,
        'success'
      );

      // Reset form
      handleClearFile();
      setCustomerName('');
      setVehicleNumber('');
      onRefresh();
    } catch (err: any) {
      showToast('Submission Error', err.message || 'Could not submit claim.', 'error');
    } finally {
      setIsSubmitting(false);
      setSubmitPhase('');
    }
  };

  return (
    <div className="customer-dashboard">
      {/* ── Wallet Card ──────────────────────────────────────────────────────── */}
      <div className="wallet-card">
        <div className="wallet-details">
          <div className="wallet-icon-box">
            <Wallet size={34} />
          </div>
          <div className="wallet-meta">
            <span className="wallet-label">Approved Wallet Balance</span>
            <div className="wallet-balance">
              <span className="wallet-currency">₹</span>
              <span>{formatINR(totalCredited)}</span>
            </div>
            <span className="wallet-subtext">
              {approvedClaims.length > 0
                ? `Credited from ${approvedClaims.length} approved insurance claim${
                    approvedClaims.length > 1 ? 's' : ''
                  }`
                : 'No approved payouts yet. Submit a claim below to receive funds.'}
            </span>
          </div>
        </div>

        {approvedClaims.length > 0 ? (
          <div className="wallet-badge-credited">
            <Sparkles size={16} /> Funds Credited & Ready
          </div>
        ) : (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              padding: '0.6rem 1.2rem',
              borderRadius: '50px',
              fontSize: '0.82rem',
              color: 'var(--text-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Clock size={15} /> Awaiting Adjudication
          </div>
        )}
      </div>

      {/* ── Submit Claim Form ────────────────────────────────────────────────── */}
      <div className="section-header">
        <div className="section-title">
          <span className="title-dot"></span> Submit New Damage Claim
        </div>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Your Full Name</label>
              <input
                type="text"
                placeholder="e.g. Rajesh Kumar"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="form-group">
              <label>Vehicle Registration Number</label>
              <input
                type="text"
                placeholder="e.g. MH12AB1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          {!previewUrl ? (
            <div
              className={`drop-zone ${isDragOver ? 'over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                }}
                disabled={isSubmitting}
              />
              <div className="drop-zone-icon">
                <UploadCloud size={40} />
              </div>
              <div className="drop-zone-text">
                Drag & drop vehicle damage photo or <strong>browse file</strong>
              </div>
              <div className="drop-zone-hint">
                JPG, PNG, WEBP up to 16 MB · AI analyzes dent, scratch, bumper, hood & glass
              </div>
            </div>
          ) : (
            <div className="preview-box">
              <img src={previewUrl} alt="Selected vehicle damage" />
              {!isSubmitting && (
                <button
                  type="button"
                  className="preview-remove-btn"
                  onClick={handleClearFile}
                  title="Remove image"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          )}

          <button type="submit" className="btn-submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <div className="spinner" />
                <span>{submitPhase || 'Analyzing vehicle damage with AI...'}</span>
              </>
            ) : (
              <>
                <Car size={18} />
                <span>Submit Vehicle Claim for Assessment</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* ── My Submitted Claims ──────────────────────────────────────────────── */}
      <div className="section-header">
        <div className="section-title">
          <span className="title-dot green"></span> My Submitted Claims
        </div>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {myClaims.length} Claim{myClaims.length !== 1 ? 's' : ''} tracked
        </span>
      </div>

      <div className="claims-grid">
        {myClaims.length === 0 ? (
          <div className="empty-box">
            <div className="empty-box-icon">📋</div>
            <div>No claims submitted yet. Upload a vehicle damage photo above to file your first claim.</div>
          </div>
        ) : (
          myClaims.map((claim) => {
            const isApproved = claim.status === 'approved';
            const isRejected = claim.status === 'rejected';
            const isExpanded = expandedClaimId === claim.id;
            const damages = claim.vision_result?.damages || [];
            const breakdown = claim.pricing_result?.breakdown || [];
            const pr: Partial<PricingResult> = claim.pricing_result || {};

            return (
              <div
                key={claim.id}
                className="insurer-claim-card"
                style={{ cursor: 'pointer' }}
              >
                <div
                  className="insurer-card-header"
                  onClick={() => setExpandedClaimId((prev) => (prev === claim.id ? null : claim.id))}
                >
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

                  <div className="claim-info">
                    <div className="claim-id-text">Claim #{claim.id}</div>
                    <div className="claim-title-text">
                      {claim.vehicle_number} · {claim.customer_name}
                    </div>
                    <div className="claim-date-text">
                      Submitted on {formatDate(claim.submitted_at)}
                    </div>
                  </div>

                  <div className="claim-status-col" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                    {isApproved && (
                      <>
                        <div className="status-badge approved">
                          <CheckCircle2 size={13} /> Approved
                        </div>
                        <div className="amount-credited-text">
                          + ₹{formatINR(claim.approved_amount)}
                        </div>
                        <div className="amount-credited-label">Credited to Balance</div>
                      </>
                    )}

                    {isRejected && (
                      <>
                        <div className="status-badge rejected">
                          <XCircle size={13} /> Rejected
                        </div>
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: 'var(--red-light)',
                            maxWidth: '220px',
                          }}
                        >
                          {claim.reject_reason || 'Policy criteria not met.'}
                        </div>
                      </>
                    )}

                    {!isApproved && !isRejected && (
                      <>
                        <div className="status-badge pending">
                          <Clock size={13} /> Under Review
                        </div>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-subtle)',
                          }}
                        >
                          {pr.estimated_payout_inr ? `Est. Payout ₹${formatINR(pr.estimated_payout_inr)}` : 'Awaiting adjudication'}
                        </div>
                      </>
                    )}
                  </div>

                  <ChevronDown
                    size={18}
                    className={`expand-chevron ${isExpanded ? 'open' : ''}`}
                    style={{ marginLeft: '0.75rem' }}
                  />
                </div>

                {isExpanded && (
                  <div className="insurer-card-body" onClick={(e) => e.stopPropagation()}>
                    <div className="detail-split-grid">
                      {/* Left: Image preview */}
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

                      {/* Right: Gemma 4 Damage Tags */}
                      <div>
                        <div className="detail-block">
                          <div className="detail-block-title">
                            <Eye size={15} color="var(--blue-light)" /> Gemma Vision AI Damage Breakdown
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
                                    <div className="damage-part-name">{item.part.replace(/_/g, ' ')}</div>
                                    <div className="damage-type-name">Damage: {item.damage_type.replace(/_/g, ' ')}</div>
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
                      </div>
                    </div>

                    {/* Cost Breakdown Table */}
                    {breakdown.length > 0 && (
                      <div className="detail-block">
                        <div className="detail-block-title">
                          <FileSpreadsheet size={15} color="var(--green-light)" /> Deterministic Repair Cost Estimation
                        </div>
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
                                <td colSpan={2} style={{ color: 'var(--text-muted)' }}>Policy Deductible</td>
                                <td className="cost-val" style={{ color: 'var(--text-muted)' }}>– ₹{formatINR(pr.deductible_inr)}</td>
                              </tr>
                            )}
                            {pr.estimated_payout_inr !== undefined && (
                              <tr>
                                <td colSpan={2} className="payout-highlight">Calculated Payout Credit</td>
                                <td className="cost-val payout-highlight">₹{formatINR(pr.estimated_payout_inr)}</td>
                              </tr>
                            )}
                          </tfoot>
                        </table>
                      </div>
                    )}

                    {/* Official Report */}
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
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
