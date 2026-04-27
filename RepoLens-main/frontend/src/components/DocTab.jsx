const DOC_ICONS = {
  OVERVIEW:     '◆',
  SPEC:         '◈',
  ARCHITECTURE: '⬡',
  TECHSTACK:    '◉',
  DATABASE:     '◫',
  API:          '⬖',
  SETUP:        '◔',
  DEPLOYMENT:   '◐',
};

export default function DocTab({ type, label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '10px 12px',
        border: 'none',
        borderBottom: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
        background: 'transparent',
        color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
        fontFamily: '"DM Mono", monospace', fontSize: '11px',
        whiteSpace: 'nowrap', cursor: 'pointer',
        transition: 'color 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)'; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--text-muted)'; }}
    >
      <span style={{ color: isActive ? 'var(--accent)' : 'inherit', fontSize: '10px' }}>
        {DOC_ICONS[type]}
      </span>
      {label}
    </button>
  );
}