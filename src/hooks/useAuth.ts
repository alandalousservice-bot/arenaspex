/**
 * SPEX - Authentication Session Hook
 * Owns the session state (isAuthenticated, authView, currentUser) and performs
 * the server-side session check on mount. The source of truth is the server
 * session (httpOnly cookie), not a flag readable/writable from the browser console.
 */

import { useState, useEffect } from 'react';
import { User } from '../types/spex';
import { fetchCurrentSession } from '../services/api';
import { DEMO_USERS } from '../data/initialState';

export type AuthView = 'landing' | 'login';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingSession, setIsCheckingSession] = useState<boolean>(true);
  const [authView, setAuthView] = useState<AuthView>(() =>
    typeof window !== 'undefined' && window.location.search.includes('reset_token=') ? 'login' : 'landing'
  );
  const [currentUser, setCurrentUser] = useState<User>(DEMO_USERS[0]);

  // On load, ask the server whether we have a valid session instead of trusting local storage
  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      const result = await fetchCurrentSession();
      if (cancelled) return;
      if (result.success && result.user) {
        setCurrentUser(result.user);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setIsCheckingSession(false);
    }
    checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    isAuthenticated,
    setIsAuthenticated,
    isCheckingSession,
    authView,
    setAuthView,
    currentUser,
    setCurrentUser
  };
}
