import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, ArrowRight, Loader2, Search, Clock, GitBranch } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

/* ── Recent jobs loader ──────────────────────────────────────────── */
function useRecentJobs(open) {
  const [recent,  setRecent]  = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .get('/api/jobs')
      .then((res) => {
        const data = Array.isArray(res.data)
          ? res.data
          : (res.data?.jobs || []);
        // Only DONE jobs, newest first, max 3
        const done = data
          .filter((j) => j.status === 'DONE')
          .slice(0, 3);
        setRecent(done);
      })
      .catch(() => setRecent([]))
      .finally(() => setLoading(false));
  }, [open]);

  return { recent, loading };
}

export default function CommandPalette({ open, onClose }) {
  const [url,     setUrl]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const { recent, loading: recentLoading } = useRecentJobs(open);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
    else      setUrl('');
  }, [open]);

  const submit = async (repoUrl) => {
    const target = (repoUrl || url).trim();
    if (!target) return;
    setSubmitting(true);
    try {
      const res = await api.post('/api/jobs', { repoUrl: target });
      onClose();
      navigate(`/results/${res.data.jobId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Could not start analysis');
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = url.trim().startsWith('https://github.com/') && url.trim().length > 24;

  /* ── Helper: format relative date ── */
  const relativeDate = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        /*
          FIX: The backdrop IS the centering container (display:flex + center).
          This centers the panel relative to the full viewport, which is
          correct and consistent regardless of sidebar state.
          Old code used two separate elements (backdrop + absolutely positioned panel)
          which caused the panel to appear shifted when the sidebar was visible.
        */
        <motion.div
          key="cp-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            background: 'rgba(22,22,20,0.78)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            /* Center the panel */
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 16px',
          }}
        >
          <motion.div
            key="cp-panel"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.96, y: -8  }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 500,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-hover)',
              borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 32px 72px rgba(0,0,0,0.65), 0 0 0 1px rgba(228,91,17,0.07)',
            }}
          >
            {/* ── Input row ── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
            }}>
              <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="https://github.com/owner/repo"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontFamily: '"DM Mono", monospace', fontSize: 13,
                  color: 'var(--text-primary)', caretColor: 'var(--accent)',
                }}
              />
              <button
                onClick={() => submit()}
                disabled={submitting || !isValid}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 8, border: 'none',
                  cursor: isValid && !submitting ? 'pointer' : 'default',
                  background: isValid ? 'var(--accent)' : 'var(--bg-elevated)',
                  color:      isValid ? 'white'        : 'var(--text-muted)',
                  fontFamily: '"DM Mono", monospace', fontSize: 12, fontWeight: 500,
                  transition: 'all 0.15s', flexShrink: 0,
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting
                  ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  : <ArrowRight size={12} />
                }
                {submitting ? 'Starting…' : 'Analyze'}
              </button>
            </div>

            {/* ── Recent repos section ── */}
            <div style={{ paddingBottom: 6 }}>
              <p style={{
                padding: '10px 16px 6px',
                fontFamily: '"DM Mono", monospace', fontSize: 10,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}>
                {recentLoading ? 'Loading…' : recent.length > 0 ? 'Recent analyses' : 'No recent analyses'}
              </p>

              {recentLoading ? (
                /* Skeleton rows */
                [0, 1, 2].map((i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px', opacity: 0.4,
                  }}>
                    <div style={{
                      width: 13, height: 13, borderRadius: '50%',
                      background: 'var(--bg-elevated)', flexShrink: 0,
                    }} />
                    <div style={{
                      height: 10, borderRadius: 4, width: '55%',
                      background: 'var(--bg-elevated)',
                    }} />
                  </div>
                ))
              ) : recent.length > 0 ? (
                recent.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => submit(job.repoUrl)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px', border: 'none', background: 'transparent',
                      cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <GitBranch size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{
                      flex: 1,
                      fontFamily: '"DM Mono", monospace', fontSize: 13,
                      color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {job.repoName || job.repoUrl}
                    </span>
                    <span style={{
                      fontFamily: '"DM Mono", monospace', fontSize: 11,
                      color: 'var(--text-muted)', flexShrink: 0,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <Clock size={10} />
                      {relativeDate(job.createdAt)}
                    </span>
                  </button>
                ))
              ) : (
                /* No recent — hint text */
                <div style={{ padding: '8px 16px 10px' }}>
                  <p style={{
                    fontFamily: '"DM Mono", monospace', fontSize: 12,
                    color: 'var(--text-muted)', lineHeight: 1.5,
                  }}>
                    Paste any public GitHub URL above to get started.
                  </p>
                </div>
              )}
            </div>

            {/* ── Footer hint ── */}
            <div style={{
              padding: '8px 16px',
              borderTop: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: 'var(--text-muted)' }}>
                ↵ to analyze &nbsp;·&nbsp; esc to close
              </span>
              <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: 'var(--text-muted)' }}>
                ⌘K
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
