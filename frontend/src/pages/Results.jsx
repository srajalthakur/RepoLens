import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, CheckCircle, Loader2, Circle,
  Clock, ExternalLink, XCircle, Plus,
} from 'lucide-react';
import api from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import { AppContext } from '../App';
import DocViewer from '../components/DocViewer';
import PdfModal from '../components/PdfModal';

/* ─── Constants ─────────────────────────────────────────────────── */
const DOC_ORDER = [
  'OVERVIEW','SPEC','ARCHITECTURE','TECHSTACK',
  'DATABASE','API','SETUP','DEPLOYMENT',
];

const DOC_META = {
  OVERVIEW:     { label: 'Project Overview',    icon: '◆' },
  SPEC:         { label: 'Reverse Eng. Spec',   icon: '◈' },
  ARCHITECTURE: { label: 'Architecture',        icon: '⬡' },
  TECHSTACK:    { label: 'Tech Stack',          icon: '◉' },
  DATABASE:     { label: 'Database Schema',     icon: '◫' },
  API:          { label: 'API Reference',       icon: '⬖' },
  SETUP:        { label: 'Setup Guide',         icon: '◔' },
  DEPLOYMENT:   { label: 'Deployment Guide',    icon: '◐' },
};

/* ─── Waiting dots ──────────────────────────────────────────────── */
function WaitingDots({ message }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {['#E45B11','#F4860D','#F8AB0B'].map((color, i) => (
          <motion.span
            key={i}
            style={{ display: 'block', width: 8, height: 8, borderRadius: '50%', background: color }}
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 0.75, delay: i * 0.15, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>
      {message && (
        <p style={{ fontFamily: '"DM Mono",monospace', fontSize: 12, color: 'var(--text-muted)' }}>
          {message}
        </p>
      )}
    </div>
  );
}

/* ─── Generating sidebar slot ───────────────────────────────────── */
function GeneratingSidebar({ completedTypes, progressMsg, rateLimitMsg, repoName, onCancel }) {
  const progress   = completedTypes.length / DOC_ORDER.length;
  const currentIdx = DOC_ORDER.findIndex((t) => !completedTypes.includes(t));
  const done       = new Set(completedTypes);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Repo label */}
      {repoName && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontFamily: '"DM Mono",monospace', fontSize: 11, color: 'var(--text-muted)', padding: '0 2px' }}>
            Analyzing
          </p>
          <p style={{
            fontFamily: '"DM Mono",monospace', fontSize: 12, color: 'var(--text-secondary)',
            marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {repoName}
          </p>
        </div>
      )}

      {/* Progress bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}>
            Generating
          </p>
          <p style={{ fontFamily: '"DM Mono",monospace', fontSize: 11, color: 'var(--text-muted)' }}>
            {completedTypes.length}/{DOC_ORDER.length}
          </p>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
          <motion.div
            style={{ height: '100%', borderRadius: 2, background: 'linear-gradient(90deg,#E45B11,#F8AB0B)' }}
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {DOC_ORDER.map((type, i) => {
          const isDone    = done.has(type);
          const isCurrent = !isDone && i === currentIdx;
          return (
            <div key={type} style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '6px 8px', borderRadius: 7,
              background: isCurrent ? 'rgba(228,91,17,0.08)' : 'transparent',
            }}>
              {isDone
                ? <CheckCircle size={13} style={{ color: '#F8AB0B', flexShrink: 0 }} />
                : isCurrent
                ? <Loader2 size={13} style={{ color: '#E45B11', flexShrink: 0, animation: 'spin 1s linear infinite' }} />
                : <Circle   size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              }
              <span style={{
                fontFamily: '"DM Mono",monospace', fontSize: 11,
                color: isDone ? 'var(--text-secondary)' : isCurrent ? 'var(--text-primary)' : 'var(--text-muted)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {DOC_META[type].label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Status / rate-limit message */}
      {(progressMsg || rateLimitMsg) && (
        <div style={{
          margin: '10px 0',
          padding: '9px 11px', borderRadius: 8,
          background: rateLimitMsg ? 'rgba(251,194,85,0.07)' : 'var(--bg-elevated)',
          border: `1px solid ${rateLimitMsg ? 'rgba(251,194,85,0.2)' : 'var(--border)'}`,
        }}>
          {rateLimitMsg
            ? <div style={{ display: 'flex', gap: 7 }}>
                <Clock size={11} style={{ color: '#FBC255', marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontFamily: '"DM Mono",monospace', fontSize: 10, color: '#FBC255', lineHeight: 1.5 }}>{rateLimitMsg}</p>
              </div>
            : <p style={{ fontFamily: '"DM Mono",monospace', fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>{progressMsg}</p>
          }
        </div>
      )}

      {/* Cancel */}
      <button
        onClick={onCancel}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          padding: '9px 12px', borderRadius: 8, marginTop: 4,
          border: '1px solid rgba(228,91,17,0.25)',
          background: 'transparent', color: 'var(--accent)',
          fontFamily: '"DM Mono",monospace', fontSize: 11,
          cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(228,91,17,0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <XCircle size={12} />
        Cancel
      </button>
    </div>
  );
}

/* ─── Done sidebar slot ──────────────────────────────────────────────
   FIX: Removed Dashboard button and repo link — those live in the
   topbar. This sidebar slot now shows only:
     1. New Analysis button (opens command palette)
     2. Document list with active highlighting
     3. Export section
──────────────────────────────────────────────────────────────────── */
function DoneSidebar({ docs, activeTab, setActiveTab, jobId, completedTypes, onNewAnalysis }) {
  const [pdfOpen, setPdfOpen] = useState(false);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* New Analysis button */}
        <div style={{ paddingBottom: 10 }}>
          <button
            onClick={onNewAnalysis}
            className="sidebar-new-btn"
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={13} />
              <span>New Analysis</span>
            </div>
            <kbd className="sidebar-kbd">⌘</kbd>
          </button>
        </div>

        {/* Documents label */}
        <p style={{
          fontFamily: '"DM Mono",monospace', fontSize: 10,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--text-muted)', padding: '0 4px', marginBottom: 6,
        }}>
          Documents
        </p>

        {/* Doc list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {DOC_ORDER.filter((t) => docs[t]).map((type) => {
            const isActive = activeTab === type;
            return (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '8px 10px', borderRadius: 8, border: 'none',
                  background: isActive ? 'var(--bg-elevated)' : 'transparent',
                  borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontFamily: '"DM Mono",monospace', fontSize: 12,
                  cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 0.12s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(226,228,213,0.04)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <span style={{ fontSize: 10, color: isActive ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }}>
                  {DOC_META[type].icon}
                </span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {DOC_META[type].label}
                </span>
                <CheckCircle size={11} style={{ color: '#F8AB0B', flexShrink: 0 }} />
              </button>
            );
          })}
        </div>

        {/* Export */}
        <div style={{ paddingTop: 12, marginTop: 8, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <p style={{
            fontFamily: '"DM Mono",monospace', fontSize: 10,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--text-muted)', marginBottom: 6, padding: '0 2px',
          }}>
            Export
          </p>
          <button
            onClick={() => setPdfOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)', fontFamily: '"DM Mono",monospace', fontSize: 11,
              cursor: 'pointer', width: '100%', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            PDF / ZIP Download
          </button>
        </div>
      </div>

      {pdfOpen && (
        <PdfModal jobId={jobId} completedTypes={completedTypes} onClose={() => setPdfOpen(false)} />
      )}
    </>
  );
}

/* ─── Results page ──────────────────────────────────────────────── */
export default function Results() {
  const { id }              = useParams();
  const navigate            = useNavigate();
  // FIX: added setPaletteOpen so DoneSidebar can open the command palette
  const { setSidebarSlot, setPaletteOpen } = useContext(AppContext);

  const [docs,         setDocs]         = useState({});
  const [status,       setStatus]       = useState('loading');
  const [progressMsg,  setProgressMsg]  = useState('Initializing…');
  const [rateLimitMsg, setRateLimitMsg] = useState(null);
  const [activeTab,    setActiveTab]    = useState(null);
  const [repoUrl,      setRepoUrl]      = useState('');
  const [repoName,     setRepoName]     = useState('');

  const parseRepoName = (url) => {
    try {
      const parts = new URL(url).pathname.split('/').filter(Boolean);
      return parts.slice(0, 2).join('/');
    } catch { return url; }
  };

  const handleCancel = useCallback(() => navigate('/'), [navigate]);

  /* Load job on mount */
  useEffect(() => {
    api.get(`/api/jobs/${id}`)
      .then((res) => {
        const job  = res.data?.job || res.data;
        const url  = job.repoUrl || '';
        const name = parseRepoName(url) || job.repoName || 'Repository';
        setRepoUrl(url);
        setRepoName(name);

        if (job.documents?.length > 0) {
          const map = {};
          job.documents.forEach((d) => { map[d.type] = d.content; });
          setDocs(map);
          setActiveTab((p) => p || DOC_ORDER.find((t) => map[t]));
        }

        if      (job.status === 'DONE')   setStatus('done');
        else if (job.status === 'FAILED') setStatus('failed');
        else                              setStatus('processing');
      })
      .catch(() => navigate('/'));
  }, [id]);

  /* Socket — only connects when actively processing */
  const handlers = {
    'job:status':    useCallback(({ message }) => { setProgressMsg(message); setStatus('processing'); }, []),
    'job:rateLimit': useCallback(({ message }) => { setRateLimitMsg(message); }, []),
    'job:docComplete': useCallback(({ type, content }) => {
      setRateLimitMsg(null);
      setDocs((p) => ({ ...p, [type]: content }));
      setActiveTab((p) => p || type);
    }, []),
    'job:done': useCallback(() => { setStatus('done'); }, []),
    /* job:cached — backend now completes all DB writes before responding,
       so the initial GET /api/jobs/:id will already return DONE + docs.
       This handler is a safety net for any edge cases. */
    'job:cached': useCallback(({ jobId }) => {
      api.get(`/api/jobs/${jobId}`).then((res) => {
        const job = res.data?.job || res.data;
        const map = {};
        (job.documents || []).forEach((d) => { map[d.type] = d.content; });
        setDocs(map);
        setActiveTab(DOC_ORDER.find((t) => map[t]));
        setStatus('done');
      });
    }, []),
    'job:error': useCallback(({ message }) => { setStatus('failed'); setProgressMsg(message); }, []),
  };

  useSocket(status === 'processing' ? id : null, handlers);

  const isProcessing   = status === 'processing' || status === 'loading';
  const isDone         = status === 'done';
  const completedTypes = DOC_ORDER.filter((t) => docs[t]);

  /* Inject sidebar slot */
  const slotVersion = useRef(0);
  useEffect(() => {
    slotVersion.current += 1;
    const v = slotVersion.current;

    if (isProcessing) {
      setSidebarSlot(
        <GeneratingSidebar
          key={`gen-${v}`}
          completedTypes={completedTypes}
          progressMsg={progressMsg}
          rateLimitMsg={rateLimitMsg}
          repoName={repoName}
          onCancel={handleCancel}
        />
      );
    } else if (isDone) {
      setSidebarSlot(
        <DoneSidebar
          key={`done-${v}`}
          docs={docs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          jobId={id}
          completedTypes={completedTypes}
          /* FIX: opens the global command palette, not a separate page */
          onNewAnalysis={() => setPaletteOpen(true)}
        />
      );
    }
  }, [isProcessing, isDone, completedTypes.length, progressMsg, rateLimitMsg, docs, activeTab, repoUrl, repoName]);

  /* Remove slot on unmount */
  useEffect(() => () => setSidebarSlot(null), []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── Top bar — Dashboard + repo link live HERE, not in the sidebar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 16px', flexShrink: 0, minHeight: 44,
        background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border)',
      }}>
        {/* Dashboard link */}
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 8px', borderRadius: 7, border: 'none',
            background: 'transparent', color: 'var(--text-muted)',
            fontFamily: '"DM Mono",monospace', fontSize: 11,
            cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <LayoutDashboard size={13} />
          Dashboard
        </button>

        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>›</span>

        {/* Repo link */}
        {repoUrl ? (
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: '"DM Mono",monospace', fontSize: 12,
              color: 'var(--text-secondary)', textDecoration: 'none',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-amber)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            {repoName}
            <ExternalLink size={11} style={{ opacity: 0.6 }} />
          </a>
        ) : repoName ? (
          <span style={{ fontFamily: '"DM Mono",monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
            {repoName}
          </span>
        ) : (
          <span style={{ fontFamily: '"DM Mono",monospace', fontSize: 12, color: 'var(--text-muted)' }}>
            Loading…
          </span>
        )}

        {/* Status pill */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7 }}>
          <motion.span
            style={{
              display: 'block', width: 7, height: 7, borderRadius: '50%',
              background: isDone ? '#F8AB0B' : isProcessing ? '#E45B11' : '#585B4A',
            }}
            animate={isProcessing ? { opacity: [1, 0.3, 1] } : {}}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
          <span style={{ fontFamily: '"DM Mono",monospace', fontSize: 11, color: 'var(--text-muted)' }}>
            {isDone ? 'Complete' : isProcessing ? 'Generating…' : status}
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {completedTypes.length > 0
          ? <DocViewer docs={docs} activeTab={activeTab} />
          : <WaitingDots message={progressMsg} />
        }
      </div>
    </div>
  );
}
