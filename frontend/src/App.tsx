import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  User,
  Building2,
  RefreshCw,
  Sparkles,
  Cpu,
  ExternalLink,
  FileCode,
  X
} from 'lucide-react';
import { Claim } from './types';
import { getClaims, formatINR } from './api';
import { CustomerDashboard } from './components/CustomerDashboard';
import { InsurerDashboard } from './components/InsurerDashboard';

interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error';
}

export const App: React.FC = () => {
  const [activeDashboard, setActiveDashboard] = useState<'customer' | 'insurer'>('customer');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showModelModal, setShowModelModal] = useState<boolean>(false);

  const showToast = useCallback((title: string, message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const loadAllClaims = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const data = await getClaims();
      setClaims(data);
    } catch (err: any) {
      if (!quiet) {
        showToast('Connection Issue', err.message || 'Could not fetch claims.', 'error');
      }
    } finally {
      setLoading(false);
      if (!quiet) setIsRefreshing(false);
    }
  }, [showToast]);

  // Initial load
  useEffect(() => {
    loadAllClaims();
  }, [loadAllClaims]);

  // Background polling every 4 seconds to keep both dashboards in sync
  useEffect(() => {
    const timer = setInterval(() => {
      loadAllClaims(true);
    }, 4000);
    return () => clearInterval(timer);
  }, [loadAllClaims]);

  // Pending count for insurer tab badge
  const pendingCount = claims.filter((c) => c.status === 'pending').length;

  // Approved credited total for customer tab badge
  const approvedCount = claims.filter((c) => c.status === 'approved').length;

  return (
    <div className="app-container">
      {/* Ambient background glowing orbs */}
      <div className="bg-ambient" />

      {/* ── App Header ──────────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="brand" onClick={() => setActiveDashboard('customer')}>
          <div className="brand-icon">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="brand-title">ClaimAssist</div>
            <div className="brand-tag">Gemma Vision AI · Deterministic Pricing</div>
          </div>
        </div>

        {/* ── Mode Switcher ────────────────────────────────────────────────── */}
        <div className="mode-tabs">
          <button
            type="button"
            className={`mode-tab-btn ${activeDashboard === 'customer' ? 'active' : ''}`}
            onClick={() => setActiveDashboard('customer')}
          >
            <User size={16} />
            <span>Customer Portal</span>
            {approvedCount > 0 && (
              <span className="pill-badge" title="Approved claims">
                {approvedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`mode-tab-btn insurer ${activeDashboard === 'insurer' ? 'active' : ''}`}
            onClick={() => setActiveDashboard('insurer')}
          >
            <Building2 size={16} />
            <span>Insurance Company</span>
            {pendingCount > 0 && (
              <span
                className="pill-badge"
                style={{ background: 'rgba(245, 158, 11, 0.4)', color: '#fff' }}
                title="Claims waiting for review"
              >
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Header Right Controls ────────────────────────────────────────── */}
        <div className="header-right">
          <button
            type="button"
            className="refresh-btn"
            style={{
              background: 'rgba(59, 130, 246, 0.12)',
              borderColor: 'rgba(59, 130, 246, 0.3)',
              color: 'var(--blue-light)',
              fontWeight: 600,
            }}
            onClick={() => setShowModelModal(true)}
            title="Open-Weight Model & Architecture Info"
          >
            <Cpu size={14} />
            <span>Open-Weight AI</span>
          </button>

          <div className="live-indicator">
            <span className="live-dot" />
            <span>Live Sync</span>
          </div>

          <button
            type="button"
            className="refresh-btn"
            onClick={() => loadAllClaims(false)}
            disabled={isRefreshing}
            title="Refresh claims data"
          >
            <RefreshCw size={14} className={isRefreshing ? 'spinner' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* ── Main Dashboard Workspace ───────────────────────────────────────── */}
      <main className="main-content">
        {loading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6rem 2rem',
              color: 'var(--text-subtle)',
              gap: '1rem',
            }}
          >
            <div className="spinner" style={{ width: 36, height: 36 }} />
            <div>Connecting to ClaimAssist Engine...</div>
          </div>
        ) : activeDashboard === 'customer' ? (
          <CustomerDashboard
            claims={claims}
            onClaimSubmitted={() => loadAllClaims(true)}
            onRefresh={() => loadAllClaims(true)}
            showToast={showToast}
          />
        ) : (
          <InsurerDashboard
            claims={claims}
            onClaimProcessed={() => loadAllClaims(true)}
            showToast={showToast}
          />
        )}
      </main>

      {/* ── Open-Weight Model Architecture Modal ──────────────────────────── */}
      {showModelModal && (
        <div className="modal-overlay" onClick={() => setShowModelModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '640px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title" style={{ color: 'var(--blue-light)' }}>
                <Cpu size={22} /> Open-Weight AI Architecture
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setShowModelModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-subtext" style={{ marginBottom: '1rem' }}>
              ClaimAssist uses an open-weight vision model for vehicle perception, strictly decoupled from financial calculations.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Model Specifications
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', rowGap: '0.4rem', fontSize: '0.88rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Model Name:</span>
                  <strong>Gemma 4 31B Instruct</strong>

                  <span style={{ color: 'var(--text-muted)' }}>Model ID:</span>
                  <code style={{ color: 'var(--blue-light)' }}>google/gemma-4-31b-it:free</code>

                  <span style={{ color: 'var(--text-muted)' }}>Fallback Model:</span>
                  <code style={{ color: 'var(--purple-light)' }}>google/gemma-4-26b-a4b-it:free</code>

                  <span style={{ color: 'var(--text-muted)' }}>License:</span>
                  <span style={{ color: 'var(--green-light)', fontWeight: 700 }}>Apache 2.0 (Open-Weight / Permissive)</span>

                  <span style={{ color: 'var(--text-muted)' }}>Published By:</span>
                  <span>Google DeepMind</span>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Where & How It Is Used
                </div>
                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-subtle)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <li>
                    <strong>Exact Implementation:</strong> File <code style={{ color: 'var(--blue-light)' }}>src/vision.py</code> in function <code style={{ color: 'var(--blue-light)' }}>analyze_damage()</code>.
                  </li>
                  <li>
                    <strong>Native Multimodal Vision:</strong> The damaged vehicle photo is base64-encoded and passed directly into Gemma 4's multimodal attention layers.
                  </li>
                  <li>
                    <strong>Perception-Only Boundary:</strong> The model is strictly prompted to output JSON damage entries (<code style={{ color: 'var(--amber-light)' }}>part</code>, <code style={{ color: 'var(--amber-light)' }}>damage_type</code>, <code style={{ color: 'var(--amber-light)' }}>severity</code>). It is prohibited from estimating repair prices or making payout decisions.
                  </li>
                  <li>
                    <strong>Deterministic Cost Lookup:</strong> Pricing is resolved separately via <code style={{ color: 'var(--green-light)' }}>prices.csv</code> and <code style={{ color: 'var(--green-light)' }}>src/pricing.py</code> so AI never hallucinates costs.
                  </li>
                </ul>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <a
                  href="https://huggingface.co/google/gemma-4-31b-it"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border)',
                    padding: '0.4rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    color: 'var(--text)',
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={13} /> Gemma 4 Weights (Hugging Face)
                </a>

                <a
                  href="https://openrouter.ai/google/gemma-4-31b-it:free"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border)',
                    padding: '0.4rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    color: 'var(--text)',
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={13} /> OpenRouter Free Vision API
                </a>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowModelModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notifications ────────────────────────────────────────────── */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <div className="toast-title">{t.title}</div>
            <div className="toast-msg">{t.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default App;
