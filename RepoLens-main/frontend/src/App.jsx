import React, { useState, createContext, useContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import CommandPalette from './components/CommandPalette';
import Dashboard from './pages/Dashboard';
import Results from './pages/Results';
import History from './pages/History';
import Login from './pages/Login';

export const AppContext = createContext(null);

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center gap-2">
        {['#E45B11', '#F4860D', '#F8AB0B'].map((color, i) => (
          <span
            key={i}
            className="block w-1.5 h-1.5 rounded-full animate-bounce"
            style={{ background: color, animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function AuthGuard({ children }) {
  const { user, loading, logout } = useAuth();
  const [paletteOpen,       setPaletteOpen]       = useState(false);
  const [sidebarCollapsed,  setSidebarCollapsed]   = useState(false);
  // sidebarSlot: ReactElement | null — set by Results page to inject doc list
  const [sidebarSlot,       setSidebarSlot]        = useState(null);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (user) setPaletteOpen((p) => !p);
      }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [user]);

  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/login" replace />;

  return (
    <AppContext.Provider value={{
      user, logout,
      paletteOpen, setPaletteOpen,
      sidebarCollapsed, setSidebarCollapsed,
      sidebarSlot, setSidebarSlot,
    }}>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
        <Sidebar />
        <main className="flex-1 overflow-hidden min-w-0">{children}</main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </AppContext.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <AuthGuard>
              <Routes>
                <Route path="/"            element={<Dashboard />} />
                <Route path="/results/:id" element={<Results />} />
                <Route path="/history"     element={<History />} />
                <Route path="*"            element={<Navigate to="/" replace />} />
              </Routes>
            </AuthGuard>
          }
        />
      </Routes>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-hover)',
            fontFamily: '"DM Mono", monospace',
            fontSize: '12px',
            borderRadius: '10px',
          },
          success: { iconTheme: { primary: '#F8AB0B', secondary: '#1C1C1A' } },
          error:   { iconTheme: { primary: '#E45B11', secondary: '#1C1C1A' } },
        }}
      />
    </BrowserRouter>
  );
}
