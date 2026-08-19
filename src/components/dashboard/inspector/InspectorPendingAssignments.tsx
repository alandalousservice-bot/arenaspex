/**
 * SPEX - Inspector Pending Assignments (PART B - B4)
 * يجلب القائمة من /api/inspector/pending-assignments ويعرض بطاقة الأستاذ
 * (الاسم/المدرسة/البلدية/الهاتف/البريد/تاريخ الميلاد/تاريخ الطلب) مع قبول/رفض+سبب
 */
import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Phone, Mail, School, MapPin, Calendar, Clock, User, Loader2 } from 'lucide-react';

interface PendingAssignment {
  id: string;
  teacherId: string;
  inspectorId: string | null;
  status: string;
  assignedAt: string | null;
  createdAt: string;
  updatedAt: string;
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    schoolName: string | null;
    municipality: string | null;
    phone: string | null;
    email: string;
    birthDate: string | null;
    createdAt: string;
  } | null;
}

export const InspectorPendingAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<PendingAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [showReasonFor, setShowReasonFor] = useState<string | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/inspector/pending-assignments');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'تعذر جلب طلبات الإسناد.');
        setAssignments([]);
      } else {
        setAssignments(data.assignments || []);
      }
    } catch (e) {
      setError('تعذر الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAccept = async (teacherId: string) => {
    setProcessingId(teacherId);
    try {
      const res = await fetch(`/api/inspector/assignments/${teacherId}/accept`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'تعذر قبول الإسناد.');
      } else {
        setAssignments((prev) => prev.filter((a) => a.teacherId !== teacherId));
      }
    } catch {
      alert('تعذر الاتصال بالخادم.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (teacherId: string) => {
    const reason = rejectReason[teacherId] || '';
    setProcessingId(teacherId);
    try {
      const res = await fetch(`/api/inspector/assignments/${teacherId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'تعذر رفض الإسناد.');
      } else {
        setAssignments((prev) => prev.filter((a) => a.teacherId !== teacherId));
        setShowReasonFor(null);
      }
    } catch {
      alert('تعذر الاتصال بالخادم.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-slate-200 flex items-center justify-center gap-2 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">جارٍ تحميل طلبات الإسناد المعلقة...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-center justify-between">
        <span>{error}</span>
        <button onClick={fetchPending} className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs">إعادة المحاولة</button>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <p className="text-sm font-bold text-emerald-800">لا توجد طلبات إسناد معلقة حالياً</p>
        <p className="text-xs text-emerald-600 mt-1">سيظهر هنا أي أستاذ طلب الإسناد لمقاطعتك بانتظار موافقتك.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />
          طلبات الإسناد المعلقة ({assignments.length})
        </h3>
        <button onClick={fetchPending} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg">تحديث</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assignments.map((a) => {
          const t = a.teacher;
          if (!t) return null;
          const fullName = `${t.firstName} ${t.lastName}`;
          const reqDate = new Date(a.createdAt).toLocaleDateString('ar-DZ');
          const birthDate = t.birthDate ? new Date(t.birthDate).toLocaleDateString('ar-DZ') : '—';
          const isProcessing = processingId === a.teacherId;
          return (
            <div key={a.id} className="p-4 bg-white rounded-2xl border border-amber-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-black text-slate-900">{fullName}</h4>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> تاريخ الطلب: {reqDate}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <School className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold">المدرسة:</span>
                  <span>{t.schoolName || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold">البلدية:</span>
                  <span>{t.municipality || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold">الهاتف:</span>
                  <span dir="ltr">{t.phone || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold">البريد:</span>
                  <span dir="ltr" className="truncate">{t.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold">تاريخ الميلاد:</span>
                  <span>{birthDate}</span>
                </div>
              </div>

              {showReasonFor === a.teacherId && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700">سبب الرفض (اختياري):</label>
                  <textarea
                    value={rejectReason[a.teacherId] || ''}
                    onChange={(e) => setRejectReason((prev) => ({ ...prev, [a.teacherId]: e.target.value }))}
                    placeholder="اكتب سبب الرفض..."
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                    rows={2}
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => handleAccept(a.teacherId)}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>قبول الإسناد</span>
                </button>

                {showReasonFor === a.teacherId ? (
                  <>
                    <button
                      onClick={() => handleReject(a.teacherId)}
                      disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>تأكيد الرفض</span>
                    </button>
                    <button
                      onClick={() => setShowReasonFor(null)}
                      className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs"
                    >
                      إلغاء
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowReasonFor(a.teacherId)}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs rounded-xl border border-slate-200"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>رفض</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
