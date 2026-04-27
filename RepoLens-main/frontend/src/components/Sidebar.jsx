import { useContext, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Clock, Plus, LogOut,
  PanelLeftOpen, PanelLeftClose,
} from 'lucide-react';
import { AppContext } from '../App';
import { motion, AnimatePresence } from 'framer-motion';

function LensIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="5.25" stroke="white" strokeWidth="1.75" />
      <line x1="11" y1="11" x2="14.5" y2="14.5" stroke="white" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

const NAV_ITEMS = [
  { to: '/',        end: true,  label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/history', end: false, label: 'History',   Icon: Clock },
];

/* ─── Tooltip ────────────────────────────────────────────────────── */
function Tooltip({ label, children }) {
  const [show, setShow] = useState(false);
  return (
    <div
      style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.1 }}
            style={{
              position: 'absolute', left: 40, top: '50%', transform: 'translateY(-50%)',
              background: 'var(--bg-elevated)', border: '1px solid var(--border-hover)',
              borderRadius: 7, padding: '5px 10px',
              fontFamily: '"DM Mono",monospace', fontSize: 11,
              color: 'var(--text-primary)', whiteSpace: 'nowrap',
              pointerEvents: 'none', zIndex: 200,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Rail icon button ───────────────────────────────────────────── */
function RailBtn({ onClick, label, children, active = false }) {
  return (
    <Tooltip label={label}>
      <button
        onClick={onClick}
        style={{
          width: 32, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8,
          border: active ? '1px solid rgba(228,91,17,0.35)' : 'none',
          background: active ? 'rgba(228,91,17,0.1)' : 'transparent',
          color: active ? 'var(--accent)' : 'var(--text-muted)',
          cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.background = 'var(--bg-elevated)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }
        }}
      >
        {children}
      </button>
    </Tooltip>
  );
}

/* ─── Collapsed rail ─────────────────────────────────────────────── */
function CollapsedRail({ user, onExpand, onNewAnalysis, navigate }) {
  const path = window.location.pathname;

  return (
    <div style={{
      width: 44, height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 10, paddingBottom: 12,
      gap: 2,
    }}>
      {/* Expand */}
      <Tooltip label="Expand sidebar">
        <button
          onClick={onExpand}
          style={{
            width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, border: 'none',
            background: 'transparent', color: 'var(--text-muted)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <PanelLeftOpen size={14} />
        </button>
      </Tooltip>

      {/* Divider */}
      <div style={{ width: 20, height: 1, background: 'var(--border)', margin: '4px 0', flexShrink: 0 }} />

      {/* New Analysis */}
      <RailBtn onClick={onNewAnalysis} label="New Analysis">
        <Plus size={14} />
      </RailBtn>

      {/* Dashboard */}
      <RailBtn onClick={() => navigate('/')} label="Dashboard" active={path === '/'}>
        <LayoutDashboard size={14} />
      </RailBtn>

      {/* History */}
      <RailBtn onClick={() => navigate('/history')} label="History" active={path === '/history'}>
        <Clock size={14} />
      </RailBtn>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Avatar with tooltip showing username */}
      <Tooltip label={user?.username || 'User'}>
        <div style={{ cursor: 'default' }}>
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user?.username || 'User'}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                border: '1.5px solid var(--border-hover)', objectFit: 'cover', display: 'block',
              }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'linear-gradient(135deg,#E45B11,#F8AB0B)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: '"DM Mono",monospace', fontSize: 11, color: 'white', fontWeight: 600,
            }}>
              {(user?.username || 'U')[0].toUpperCase()}
            </div>
          )}
        </div>
      </Tooltip>
    </div>
  );
}

/* ─── Expanded sidebar inner content ────────────────────────────── */
function SidebarInner({ user, onNewAnalysis, onLogout, sidebarSlot }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minWidth: 224 }}>

      {!sidebarSlot && (
        <div style={{ padding: '4px 12px 10px' }}>
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
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
        {sidebarSlot ? (
          sidebarSlot
        ) : (
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV_ITEMS.map(({ to, end, label, Icon }) => (
              <NavLink key={to} to={to} end={end} className="sidebar-nav-item">
                <Icon size={15} style={{ flexShrink: 0 }} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </div>

      {/* User row */}
      {!sidebarSlot && (
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user?.username || 'User'}
              style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                border: '1.5px solid var(--border-hover)', objectFit: 'cover',
              }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#E45B11,#F8AB0B)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: '"DM Mono",monospace', fontSize: 11, color: 'white', fontWeight: 600,
            }}>
              {(user?.username || 'U')[0].toUpperCase()}
            </div>
          )}
          <span style={{
            flex: 1, minWidth: 0,
            fontFamily: '"DM Mono",monospace', fontSize: 12,
            color: 'var(--text-secondary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {user?.username || 'user'}
          </span>
          <button onClick={onLogout} title="Sign out" className="sidebar-icon-btn" style={{ flexShrink: 0 }}>
            <LogOut size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Main export ─────────────────────────────────────────────────── */
export default function Sidebar() {
  const {
    user, logout,
    setPaletteOpen,
    sidebarCollapsed, setSidebarCollapsed,
    sidebarSlot,
  } = useContext(AppContext);
  const navigate     = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <motion.aside
        animate={{ width: sidebarCollapsed ? 44 : 224 }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        style={{
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border)',
          height: '100%', overflow: 'hidden', flexShrink: 0,
        }}
        className="hidden md:flex flex-col"
      >
        <AnimatePresence mode="wait" initial={false}>
          {sidebarCollapsed ? (
            <motion.div
              key="rail"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{ height: '100%' }}
            >
              <CollapsedRail
                user={user}
                onExpand={() => setSidebarCollapsed(false)}
                onNewAnalysis={() => setPaletteOpen(true)}
                navigate={navigate}
              />
            </motion.div>
          ) : (
            <motion.div
              key="full"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minWidth: 224 }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '14px 12px 8px', flexShrink: 0,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: 'linear-gradient(135deg,#E45B11 0%,#F8AB0B 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <LensIcon size={15} />
                </div>
                <span style={{
                  fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 15,
                  color: 'var(--text-primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap',
                }}>
                  RepoLens
                </span>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  title="Collapse sidebar"
                  className="sidebar-icon-btn"
                  style={{ marginLeft: 'auto', flexShrink: 0 }}
                >
                  <PanelLeftClose size={14} />
                </button>
              </div>

              <SidebarInner
                user={user}
                onNewAnalysis={() => setPaletteOpen(true)}
                onLogout={handleLogout}
                sidebarSlot={sidebarSlot}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      {/* Mobile top bar */}
      <div
        className="md:hidden flex items-center justify-between px-4 py-3 absolute top-0 left-0 right-0 z-30"
        style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <div style={{
            width: 24, height: 24, borderRadius: 7, flexShrink: 0,
            background: 'linear-gradient(135deg,#E45B11,#F8AB0B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LensIcon size={12} />
          </div>
          <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
            RepoLens
          </span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="sidebar-icon-btn">
          <PanelLeftOpen size={18} />
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: 'rgba(22,22,20,0.7)' }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-50 md:hidden flex flex-col"
              style={{ width: 224, background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 12px 8px', flexShrink: 0 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'linear-gradient(135deg,#E45B11,#F8AB0B)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <LensIcon size={15} />
                </div>
                <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
                  RepoLens
                </span>
                <button onClick={() => setMobileOpen(false)} className="sidebar-icon-btn" style={{ marginLeft: 'auto' }}>
                  <PanelLeftClose size={14} />
                </button>
              </div>
              <SidebarInner
                user={user}
                onNewAnalysis={() => { setPaletteOpen(true); setMobileOpen(false); }}
                onLogout={handleLogout}
                sidebarSlot={sidebarSlot}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
