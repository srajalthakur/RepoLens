import { motion } from 'framer-motion';
import { Github, ArrowRight, Zap } from 'lucide-react';

const GITHUB_AUTH_URL = 'https://backend-7lb5.onrender.com/auth/github';

const FEATURES = [
  'Architecture diagrams',
  'Full API reference',
  'Setup & deploy guides',
  'Database schema maps',
];

export default function Login() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      {/* Ambient glow blobs */}
      <div style={{
        position: 'absolute', top: '-160px', left: '-160px',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(228,91,17,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-120px', right: '-120px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(248,171,11,0.10) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={{
          position: 'relative', zIndex: 1,
          maxWidth: '400px', width: '100%',
          padding: '0 24px', textAlign: 'center',
        }}
      >
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 12, marginBottom: 36,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, #E45B11 0%, #F8AB0B 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px rgba(228,91,17,0.35)',
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="10" cy="10" r="7.5" stroke="white" strokeWidth="2.2"/>
              <line x1="15.5" y1="15.5" x2="20" y2="20" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 24,
            color: 'var(--text-primary)', letterSpacing: '-0.03em',
          }}>
            RepoLens
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 30,
          lineHeight: 1.2, letterSpacing: '-0.03em',
          color: 'var(--text-primary)', marginBottom: 12,
        }}>
          Understand any codebase{' '}
          <span style={{
            background: 'linear-gradient(90deg, #E45B11, #F8AB0B)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            instantly.
          </span>
        </h1>

        <p style={{
          fontSize: 14, lineHeight: 1.65,
          color: 'var(--text-secondary)', marginBottom: 28,
        }}>
          Paste a GitHub URL and get full AI documentation — architecture diagrams,
          API references, and more — in under a minute.
        </p>

        {/* Feature pills */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8,
          justifyContent: 'center', marginBottom: 32,
        }}>
          {FEATURES.map((f) => (
            <span key={f} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 11px', borderRadius: 20,
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              fontFamily: '"DM Mono", monospace', fontSize: 11,
              color: 'var(--text-secondary)',
            }}>
              <Zap size={10} style={{ color: '#F8AB0B' }} />
              {f}
            </span>
          ))}
        </div>

        {/* GitHub OAuth button */}
        <motion.a
          href={GITHUB_AUTH_URL}
          whileHover={{ scale: 1.01, boxShadow: '0 0 28px rgba(228,91,17,0.22)' }}
          whileTap={{ scale: 0.99 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, padding: '14px 24px', borderRadius: 12,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-hover)',
            color: 'var(--text-primary)', textDecoration: 'none',
            fontFamily: '"DM Mono", monospace', fontSize: 13, fontWeight: 500,
          }}
        >
          <Github size={18} />
          Continue with GitHub
          <ArrowRight size={14} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
        </motion.a>

        <p style={{
          marginTop: 18, fontFamily: '"DM Mono", monospace',
          fontSize: 11, color: 'var(--text-muted)',
        }}>
          Read-only access · Your code is never stored
        </p>
      </motion.div>
    </div>
  );
}
