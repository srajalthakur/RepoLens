import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Github, CheckCircle, Clock, XCircle, Loader2, ArrowRight } from 'lucide-react';

const STATUS = {
  DONE:       { Icon: CheckCircle, color: '#F8AB0B', label: 'Complete'   },
  PROCESSING: { Icon: Loader2,     color: '#E45B11', label: 'Processing', spin: true },
  PENDING:    { Icon: Clock,       color: '#B0B2A3', label: 'Pending'    },
  FAILED:     { Icon: XCircle,     color: '#E45B11', label: 'Failed'     },
};

function timeAgo(dateStr) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const m  = Math.floor(ms / 60000);
  const h  = Math.floor(ms / 3600000);
  const d  = Math.floor(ms / 86400000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'Just now';
}

export default function HistoryCard({ job, index }) {
  const navigate = useNavigate();
  const cfg = STATUS[job.status] ?? STATUS.PENDING;
  const { Icon } = cfg;

  const repoShort = job.repoUrl?.replace('https://github.com/', '') ?? job.repoName ?? '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.045 }}
      onClick={() => navigate(`/results/${job.id}`)}
      style={{
        padding: '14px 16px', borderRadius: '12px', cursor: 'pointer',
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-elevated)';
        e.currentTarget.style.borderColor = 'var(--border-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-surface)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Repo info */}
        <Github size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: '"DM Mono", monospace', fontSize: '13px',
            color: 'var(--text-primary)', fontWeight: 500,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {repoShort}
          </p>
          <p style={{
            fontFamily: '"DM Mono", monospace', fontSize: '11px',
            color: 'var(--text-muted)', marginTop: '2px',
          }}>
            {timeAgo(job.createdAt)}
          </p>
        </div>

        {/* Status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          <Icon
            size={12}
            style={{
              color: cfg.color,
              animation: cfg.spin ? 'spin 1s linear infinite' : undefined,
            }}
          />
          <span style={{
            fontFamily: '"DM Mono", monospace', fontSize: '11px', color: 'var(--text-muted)',
          }}>
            {cfg.label}
          </span>
        </div>

        <ArrowRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      </div>

      {/* Doc progress dots */}
      {job.status === 'DONE' && (
        <div style={{ display: 'flex', gap: '3px', marginTop: '10px' }}>
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              style={{
                flex: 1, height: '3px', borderRadius: '2px',
                background:
                  i < (job.documents?.length ?? 0)
                    ? 'linear-gradient(90deg, #E45B11, #F8AB0B)'
                    : 'var(--bg-elevated)',
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}