import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Package, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import HistoryCard from '../components/HistoryCard';
import api from '../lib/api';

export default function History() {
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState('');
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    api
      .get('/api/jobs')
      .then((res) => {
        const data = Array.isArray(res.data)
          ? res.data
          : (res.data?.jobs || res.data?.data || []);
        setJobs(data);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load history');
      })
      .finally(() => setLoading(false));
  }, []);

  /* ── Clear all history ─────────────────────────────────────────── */
  const handleClearHistory = async () => {
    if (jobs.length === 0) return;
    const confirmed = window.confirm(
      `Delete all ${jobs.length} analysis records? This cannot be undone.`
    );
    if (!confirmed) return;

    setClearing(true);
    try {
      await api.delete('/api/jobs');
      setJobs([]);
      toast.success('History cleared');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to clear history');
    } finally {
      setClearing(false);
    }
  };

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    return (
      j.repoUrl?.toLowerCase().includes(q) ||
      j.repoName?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', flexShrink: 0,
        background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border)',
      }}>
        {/* Title */}
        <div>
          <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
            Analysis History
          </h2>
          <p style={{ fontFamily: '"DM Mono",monospace', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {jobs.length} {jobs.length === 1 ? 'repository' : 'repositories'} analyzed
          </p>
        </div>

        {/* Right controls: Clear All + Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* Clear All History button — only shown when there are jobs */}
          {jobs.length > 0 && (
            <button
              onClick={handleClearHistory}
              disabled={clearing}
              title="Clear all analysis history"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 12px', borderRadius: 9,
                background: 'transparent',
                border: '1px solid rgba(228,91,17,0.3)',
                color: clearing ? 'var(--text-muted)' : 'var(--accent)',
                fontFamily: '"DM Mono",monospace', fontSize: 12,
                cursor: clearing ? 'default' : 'pointer',
                transition: 'all 0.15s',
                opacity: clearing ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!clearing) {
                  e.currentTarget.style.background = 'rgba(228,91,17,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(228,91,17,0.6)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(228,91,17,0.3)';
              }}
            >
              <Trash2 size={12} />
              {clearing ? 'Clearing…' : 'Clear All'}
            </button>
          )}

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 12px', borderRadius: 9,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)', width: 210,
          }}>
            <Search size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search repos…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontFamily: '"DM Mono",monospace', fontSize: 12, color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 160 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {['#E45B11', '#F4860D', '#F8AB0B'].map((c, i) => (
                <motion.span
                  key={i}
                  style={{ display: 'block', width: 6, height: 6, borderRadius: '50%', background: c }}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 0.7, delay: i * 0.14, repeat: Infinity }}
                />
              ))}
            </div>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, textAlign: 'center' }}>
            <p style={{ fontFamily: '"DM Mono",monospace', fontSize: 12, color: '#E45B11', marginBottom: 6 }}>
              {error}
            </p>
            <p style={{ fontFamily: '"DM Mono",monospace', fontSize: 11, color: 'var(--text-muted)' }}>
              Make sure you are logged in
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, textAlign: 'center' }}>
            <Package size={36} style={{ color: 'var(--text-muted)', marginBottom: 14 }} />
            <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text-secondary)', marginBottom: 6 }}>
              {search ? 'No matching repos' : 'No analyses yet'}
            </p>
            <p style={{ fontFamily: '"DM Mono",monospace', fontSize: 12, color: 'var(--text-muted)' }}>
              {search ? 'Try a different search' : 'Press ⌘ to analyze your first repo'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 680 }}>
            {filtered.map((job, i) => (
              <HistoryCard key={job.id} job={job} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
