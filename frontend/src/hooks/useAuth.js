import { useState, useEffect } from 'react';
import api from '../lib/api';

export function useAuth() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => {
        // FIX: /auth/me returns { user: {...} }, not the user object directly.
        // Previously res.data was used as-is, so raw.username was undefined
        // and everything fell back to 'user' / 'U'.
        const raw = res.data?.user || res.data;

        if (!raw || (!raw.id && !raw.username)) {
          setUser(null);
          return;
        }

        const normalised = {
          ...raw,
          // auth.js already saves githubUser.login as username and
          // githubUser.avatar_url as avatarUrl — just make sure both exist
          username:  raw.username  || raw.login      || raw.name || 'user',
          avatarUrl: raw.avatarUrl || raw.avatar_url || raw.avatarURL || '',
        };

        setUser(normalised);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    try { await api.get('/auth/logout'); } catch (_) {}
    setUser(null);
  };

  return { user, loading, logout };
}
