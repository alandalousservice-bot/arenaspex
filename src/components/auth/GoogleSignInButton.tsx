/**
 * SPEX - Google Sign-In Button (fixed gsi/transform blank issue)
 * - يعتمد كلياً على وضع popup + FedCM، بدون login_uri، لتفادي تحويل المتصفح إلى
 *   https://accounts.google.com/gsi/transform الذي كان يبقى فارغاً عند حجب كوكيز الطرف الثالث.
 * - عند غياب VITE_GOOGLE_CLIENT_ID يظهر زر معطّل بتلميح واضح.
 */
import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

interface GoogleIdentityServices {
  accounts?: {
    id?: {
      initialize: (config: GoogleIdConfiguration) => void;
      renderButton: (container: HTMLElement, options: GoogleRenderButtonOptions) => void;
      cancel: () => void;
    };
  };
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: { credential: string }) => void;
  ux_mode: 'popup';
  auto_select: boolean;
  cancel_on_tap_outside: boolean;
  use_fedcm_for_prompt: boolean;
  use_fedcm_for_button: boolean;
  context: 'signup' | 'signin';
}

interface GoogleRenderButtonOptions {
  type: 'standard';
  theme: 'outline';
  size: 'large';
  text: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape: 'pill';
  logo_alignment: 'center';
  width: number;
}

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let gsiLoadPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (gsiLoadPromise) return gsiLoadPromise;

  gsiLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('تعذر تحميل سكربت Google.')));
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('تعذر تحميل سكربت Google.'));
    document.head.appendChild(script);
  });

  return gsiLoadPromise;
}

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void | Promise<void>;
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  disabled?: boolean;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onCredential,
  text = 'continue_with',
  disabled = false,
}) => {
  const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!clientId || disabled) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id || !containerRef.current) return;

        // التهيئة الصحيحة لتفادي الانتقال إلى gsi/transform:
        // - ux_mode: 'popup' فقط، بدون login_uri
        // - use_fedcm_for_prompt + use_fedcm_for_button للمسار الحديث
        // - auto_select: false لتفادي تسجيل دخول تلقائي مربك
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential: string }) => {
            if (response?.credential) onCredential(response.credential);
          },
          ux_mode: 'popup',
          auto_select: false,
          cancel_on_tap_outside: false,
          // FedCM هو المسار الحديث في Chrome ويحل مشكلة حجب كوكيز الطرف الثالث
          use_fedcm_for_prompt: true,
          use_fedcm_for_button: true,
          // سياق الزر (يساعد Google على تحسين النصوص) — signup للسجل الجديد
          context: text === 'signup_with' ? 'signup' : 'signin',
        } as any);

        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'pill',
          logo_alignment: 'center',
          width: 320,
        });
      })
      .catch(() => {
        if (!cancelled)
          setLoadError(
            'تعذر تحميل زر الدخول عبر Google. تحقق من اتصالك بالإنترنت أو حاول تعطيل مانع الإعلانات.'
          );
      });

    return () => {
      cancelled = true;
      try {
        window.google?.accounts?.id?.cancel();
      } catch {
        // Google prompt cleanup is best-effort during component unmount.
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, disabled, text]);

  if (!clientId) {
    return (
      <button
        type="button"
        disabled
        title="اضبط VITE_GOOGLE_CLIENT_ID و GOOGLE_CLIENT_ID في متغيرات البيئة لتفعيل الدخول عبر Google"
        className="w-full py-3 px-4 bg-slate-100 text-slate-400 font-extrabold text-xs rounded-2xl border border-slate-200 flex items-center justify-center gap-3 cursor-not-allowed"
      >
        <svg className="w-5 h-5 opacity-50" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>الدخول عبر Google (غير مفعّل بعد)</span>
      </button>
    );
  }

  if (loadError) {
    return <p className="text-[11px] text-rose-500 text-center">{loadError}</p>;
  }

  return <div ref={containerRef} className="flex justify-center w-full" />;
};
