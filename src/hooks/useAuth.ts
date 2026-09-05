/**
 * SPEX - Authentication Session Hook (PART C - C3)
 * Owns the session state and performs server-side session check.
 * C3 additions:
 * - انقطاع ≠ خروج: عند fetchCurrentSession بـ{offline:true} (navigator.onLine===false صراحة)
 *   نعمل من النسخة المحلية spex_current_user مع علم isOfflineSession
 * - نبض إعادة التحقق (دقيقتان + visibilitychange + 'online') دوماً عند التوفر
 * - إن عاد بـ{disabled:true, user} ⇒ كيان الخادم (inactive) ⇒ يقفل إلى وضع المشاهدة
 *   + استدعاء lib/killSwitch.ts
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../types/spex';
import { fetchCurrentSession } from '../services/api';
import { triggerKillSwitch } from '../lib/killSwitch';

export type AuthView = 'landing' | 'login';

// Never hydrate an unauthenticated browser with a demo account.  The session
// is the only source of account data; this placeholder is intentionally empty.
export const EMPTY_SESSION_USER: User = {
  id: '',
  username: '',
  spexId: '',
  firstName: '',
  lastName: '',
  email: '',
  role: 'teacher',
  directorateId: '',
  districtId: '',
  status: 'inactive',
};

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingSession, setIsCheckingSession] = useState<boolean>(true);
  const [isOfflineSession, setIsOfflineSession] = useState<boolean>(false);
  const [authView, setAuthView] = useState<AuthView>(() =>
    typeof window !== 'undefined' && window.location.search.includes('reset_token=')
      ? 'login'
      : 'landing'
  );
  const [currentUser, setCurrentUser] = useState<User>(EMPTY_SESSION_USER);

  const pollingRef = useRef<number | null>(null);

  const checkSession = useCallback(async () => {
    const result = await fetchCurrentSession();

    // PART C: انقطاع ≠ خروج — نعمل من النسخة المحلية
    if ((result as any).offline) {
      if (result.user) {
        setCurrentUser(result.user);
        setIsAuthenticated(true);
        setIsOfflineSession(true);
        setIsCheckingSession(false);
        return;
      } else {
        // offline بلا نسخة محلية → غير مصادق
        setCurrentUser(EMPTY_SESSION_USER);
        setIsAuthenticated(false);
        setIsOfflineSession(true);
        setIsCheckingSession(false);
        return;
      }
    }

    // PART C: تعطيل الحساب من المشرف => قفل إلى وضع المشاهدة + killSwitch
    if ((result as any).disabled && (result as any).user) {
      const disabledUser = (result as any).user as User;
      setCurrentUser(disabledUser);
      setIsAuthenticated(true); // يبقى مصادقاً لكن App سيعرض PendingApprovalViewerScreen لأنه inactive
      setIsOfflineSession(false);
      setIsCheckingSession(false);
      try {
        triggerKillSwitch();
      } catch {
        // Kill-switch activation is best-effort; preserve the existing session state if it fails.
      }
      // حفظ المستخدم المعطل محلياً لعرض شاشته
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('spex_current_user', JSON.stringify(disabledUser));
        }
      } catch {
        // Persisting a disabled user locally is best-effort for the read-only screen.
      }
      return;
    }

    if (result.success && result.user) {
      setCurrentUser(result.user);
      setIsAuthenticated(true);
      setIsOfflineSession(false);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('spex_current_user', JSON.stringify(result.user));
        }
      } catch {
        // Persisting the authenticated user locally is best-effort session caching.
      }
    } else {
      // check if result code is ACCOUNT_GONE -> clear local
      if ((result as any).code === 'ACCOUNT_GONE') {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('spex_current_user');
          }
        } catch {
          // Removing stale local session data is best-effort cleanup.
        }
      }
      setIsAuthenticated(false);
      setIsOfflineSession(false);
      setCurrentUser(EMPTY_SESSION_USER);
    }
    setIsCheckingSession(false);
  }, []);

  // Initial check
  useEffect(() => {
    let cancelled = false;
    async function initial() {
      if (cancelled) return;
      await checkSession();
    }
    initial();
    return () => {
      cancelled = true;
    };
  }, [checkSession]);

  // نبض إعادة التحقق (دقيقتان + visibilitychange + 'online') دوماً عند التوفر
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const startPolling = () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
      pollingRef.current = window.setInterval(
        () => {
          if (navigator.onLine) {
            checkSession();
          }
        },
        2 * 60 * 1000
      ); // دقيقتان
    };

    startPolling();

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        checkSession();
      }
    };

    const onOnline = () => {
      checkSession();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);

    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
    };
  }, [checkSession]);

  return {
    isAuthenticated,
    setIsAuthenticated,
    isCheckingSession,
    isOfflineSession,
    authView,
    setAuthView,
    currentUser,
    setCurrentUser,
    refreshSession: checkSession,
  };
}
