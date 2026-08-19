/**
 * SPEX - Offline Banner (PART C)
 * يعرض حالة عدم الاتصال ووجود صندوق صادر معلق
 */
import React, { useEffect, useState } from 'react';
import { WifiOff, CloudUpload } from 'lucide-react';

export const OfflineBanner: React.FC<{ isOfflineSession?: boolean }> = ({ isOfflineSession }) => {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [outboxCount, setOutboxCount] = useState(0);

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    const checkOutbox = () => {
      try {
        const raw = localStorage.getItem('spex_outbox_v1');
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) setOutboxCount(arr.length);
          else setOutboxCount(0);
        } else setOutboxCount(0);
      } catch {
        setOutboxCount(0);
      }
    };

    checkOutbox();
    const interval = setInterval(checkOutbox, 3000);
    window.addEventListener('storage', checkOutbox);

    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      window.removeEventListener('storage', checkOutbox as any);
      clearInterval(interval);
    };
  }, []);

  if (isOnline && !isOfflineSession && outboxCount === 0) return null;

  return (
    <div className="sticky top-0 z-[60] w-full bg-amber-500 text-amber-950 text-xs font-bold px-4 py-2 flex items-center justify-center gap-2 shadow-sm">
      {!isOnline || isOfflineSession ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>وضع عدم الاتصال — تعمل من النسخة المحلية. سيتم المزامنة تلقائياً عند عودة الشبكة.</span>
        </>
      ) : null}
      {isOnline && outboxCount > 0 && (
        <>
          <CloudUpload className="w-4 h-4 animate-pulse" />
          <span>{outboxCount} عناصر بانتظار المزامنة — جارٍ الإرسال...</span>
        </>
      )}
    </div>
  );
};
