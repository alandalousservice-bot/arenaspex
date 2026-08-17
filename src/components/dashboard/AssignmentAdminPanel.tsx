import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Loader2, Users2, Clock, AlertTriangle } from 'lucide-react';
import {
  fetchPendingSuggestions,
  approveMunicipalitySuggestion,
  rejectMunicipalitySuggestion,
  approveSchoolSuggestion,
  rejectSchoolSuggestion,
  fetchAllAssignments,
  reassignAllTeachers
} from '../../services/api';

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Changed: 'bg-blue-100 text-blue-700',
  Pending: 'bg-amber-100 text-amber-700',
  Removed: 'bg-gray-100 text-gray-500'
};

const STATUS_LABELS: Record<string, string> = {
  Active: 'مرتبط بمفتش',
  Changed: 'تم تغيير المفتش',
  Pending: 'بانتظار مفتش',
  Removed: 'ملغى'
};

/**
 * لوحة إدارية: اعتماد/رفض اقتراحات البلديات والمؤسسات الجديدة، عرض حالة كل سجلات
 * الإسناد، وزر "إعادة تنفيذ الإسناد الجماعي" وفق صلاحيات الإدارة المذكورة في المواصفة.
 */
export const AssignmentAdminPanel: React.FC = () => {
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reassigning, setReassigning] = useState(false);
  const [reassignSummary, setReassignSummary] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [suggestionsRes, assignmentsRes] = await Promise.all([fetchPendingSuggestions(), fetchAllAssignments()]);
    if (suggestionsRes.success) {
      setMunicipalities(suggestionsRes.municipalities);
      setSchools(suggestionsRes.schools);
    }
    if (assignmentsRes.success) setAssignments(assignmentsRes.assignments);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleReassignAll = async () => {
    setReassigning(true);
    const res = await reassignAllTeachers();
    setReassigning(false);
    if (res.success) {
      setReassignSummary(`تم فحص ${res.total} أستاذاً: ${res.active} مرتبط، ${res.changed} تغيّر مفتشه، ${res.pending} بانتظار مفتش.`);
      loadAll();
    }
  };

  const pendingCount = assignments.filter((a) => a.status === 'Pending').length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* ملخص */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Users2 className="h-4 w-4" /> إجمالي سجلات الإسناد
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-800">{assignments.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-amber-600">
            <Clock className="h-4 w-4" /> بانتظار مفتش
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-800">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <AlertTriangle className="h-4 w-4" /> اقتراحات بانتظار المراجعة
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-800">{municipalities.length + schools.length}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={handleReassignAll}
          disabled={reassigning}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {reassigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          إعادة تنفيذ الإسناد الجماعي
        </button>
        {reassignSummary && <p className="text-sm text-gray-500">{reassignSummary}</p>}
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          {/* اقتراحات البلديات */}
          {municipalities.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h4 className="mb-3 font-bold text-gray-800">اقتراحات بلديات جديدة</h4>
              <div className="space-y-2">
                {municipalities.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                    <span className="text-sm text-gray-700">{m.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await approveMunicipalitySuggestion(m.id);
                          loadAll();
                        }}
                        className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> اعتماد
                      </button>
                      <button
                        onClick={async () => {
                          await rejectMunicipalitySuggestion(m.id);
                          loadAll();
                        }}
                        className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                      >
                        <XCircle className="h-3.5 w-3.5" /> رفض
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* اقتراحات المؤسسات */}
          {schools.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h4 className="mb-3 font-bold text-gray-800">اقتراحات مؤسسات جديدة</h4>
              <div className="space-y-2">
                {schools.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                    <span className="text-sm text-gray-700">{s.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await approveSchoolSuggestion(s.id);
                          loadAll();
                        }}
                        className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> اعتماد
                      </button>
                      <button
                        onClick={async () => {
                          await rejectSchoolSuggestion(s.id);
                          loadAll();
                        }}
                        className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                      >
                        <XCircle className="h-3.5 w-3.5" /> رفض
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* جدول الإسناد */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-right">الأستاذ</th>
                  <th className="px-3 py-2 text-right">المفتش</th>
                  <th className="px-3 py-2 text-right">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      {a.teacher ? `${a.teacher.firstName} ${a.teacher.lastName}` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {a.inspector ? `${a.inspector.firstName} ${a.inspector.lastName}` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status] || ''}`}>
                        {STATUS_LABELS[a.status] || a.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {assignments.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-gray-400">
                      لا توجد سجلات إسناد بعد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
