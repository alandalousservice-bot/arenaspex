import React, { useEffect, useState } from 'react';
import { AUDIT_EVENT_LABELS, AUDIT_STATE_LABELS, type AuditEventView } from '../../types/audit';
const roleLabels: Record<string, string> = {
  admin: 'المشرف',
  teacher: 'الأستاذ',
  inspector: 'المفتش',
  director: 'المدير',
};
const entityLabels: Record<string, string> = {
  USER: 'الحساب',
  INSPECTOR_DISTRICT: 'مقاطعة المفتش',
  TEACHER_TRANSFER: 'نقل الأستاذ',
  TEACHER_ASSIGNMENT: 'إسناد الأستاذ',
  INFORMATION_CARD: 'بطاقة المعلومات',
  PEDAGOGICAL_VISIT: 'الزيارة البيداغوجية',
  VISIT_REPORT: 'تقرير الزيارة',
};
const stateLabels: Record<string, string> = {
  archived: 'مؤرشف',
  deleted: 'محذوف',
  Active: 'مقبول',
  Changed: 'مقبول بعد نقل',
  Removed: 'مزال',
  active: 'نشط',
  inactive: 'غير نشط',
  pending_approval: 'ينتظر التفعيل',
  Pending: 'معلّق',
  Accepted: 'مقبول',
  Rejected: 'مرفوض',
  DRAFT: 'مسودة',
  SUBMITTED: 'مرسلة',
  VERIFIED: 'محققة',
  NEEDS_CORRECTION: 'تحتاج تصحيحًا',
  SCHEDULED: 'مبرمجة',
  COMPLETED: 'منجزة',
  POSTPONED: 'مؤجلة',
  CANCELLED: 'ملغاة',
  FINAL: 'نهائي',
  GUIDANCE: 'توجيهية',
  MONITORING: 'مراقبة',
  TENURE: 'تثبيت',
};
const date = (value: string) =>
  new Date(value).toLocaleString('ar-DZ', {
    timeZone: 'Africa/Algiers',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
async function read<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'تعذر تحميل سجل التدقيق.');
  return data;
}
function State({ title, value }: { title: string; value: AuditEventView['before'] }) {
  if (!value || !Object.keys(value).length) return null;
  return (
    <section className="rounded-xl border p-4">
      <h3 className="mb-3 font-black">{title}</h3>
      <dl className="space-y-2">
        {Object.entries(value)
          .filter(
            ([key]) =>
              !(['inspectorId', 'districtId', 'directorateId'] as string[]).includes(key) ||
              !value[key.replace('Id', 'Name')]
          )
          .map(([key, v]) => (
            <div key={key} className="flex flex-wrap gap-2 text-sm">
              <dt className="font-bold">{AUDIT_STATE_LABELS[key] || key}:</dt>
              <dd className="min-w-0 break-words">
                {v === null
                  ? 'لم يحدد'
                  : typeof v === 'boolean'
                    ? v
                      ? 'نعم'
                      : 'لا'
                    : stateLabels[String(v)] || roleLabels[String(v)] || String(v)}
              </dd>
            </div>
          ))}
      </dl>
    </section>
  );
}
export function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState<AuditEventView[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    eventType: '',
    entityType: '',
    actor: '',
    affectedUser: '',
    from: '',
    to: '',
  });
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AuditEventView | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setEvents([]);
    void read<{ events: AuditEventView[]; total: number }>(
      `/api/admin/audit-events?page=${page}&${query}`
    )
      .then((data) => {
        if (active) {
          setEvents(data.events);
          setTotal(data.total);
        }
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, query]);
  const apply = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value)
        params.set(
          key,
          key === 'from'
            ? `${value}T00:00:00+01:00`
            : key === 'to'
              ? `${value}T23:59:59+01:00`
              : value
        );
    }
    setPage(1);
    setQuery(params.toString());
    setSelected(null);
  };
  async function open(id: string) {
    setError('');
    try {
      const result = await read<{ event: AuditEventView }>(
        `/api/admin/audit-events/${encodeURIComponent(id)}`
      );
      setSelected(result.event);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <main dir="rtl" className="mx-auto min-w-0 max-w-6xl space-y-5">
      <header className="rounded-3xl bg-slate-900 p-6 text-white">
        <h1 className="text-2xl font-black">سجل التدقيق</h1>
        <p className="mt-2 text-sm">سجل دائم للعمليات الإدارية والمهنية المهمة؛ للقراءة فقط.</p>
      </header>
      <form
        onSubmit={apply}
        className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <label className="text-sm">
          العملية
          <select
            aria-label="العملية"
            value={filters.eventType}
            onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
            className="mt-1 w-full rounded-lg border p-2"
          >
            <option value="">كل العمليات</option>
            {Object.entries(AUDIT_EVENT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          نوع العنصر
          <select
            aria-label="نوع العنصر"
            value={filters.entityType}
            onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
            className="mt-1 w-full rounded-lg border p-2"
          >
            <option value="">كل العناصر</option>
            {Object.entries(entityLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {(['actor', 'affectedUser'] as const).map((key) => (
          <label key={key} className="text-sm">
            {key === 'actor' ? 'المنفذ' : 'المستخدم المتأثر'}
            <input
              aria-label={key === 'actor' ? 'المنفذ' : 'المستخدم المتأثر'}
              value={filters[key]}
              onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
              className="mt-1 w-full rounded-lg border p-2"
              placeholder="بحث بالاسم"
              maxLength={100}
            />
          </label>
        ))}
        {(['from', 'to'] as const).map((key) => (
          <label key={key} className="text-sm">
            {key === 'from' ? 'من تاريخ' : 'إلى تاريخ'}
            <input
              type="date"
              aria-label={key === 'from' ? 'من تاريخ' : 'إلى تاريخ'}
              value={filters[key]}
              onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
              className="mt-1 w-full rounded-lg border p-2"
            />
          </label>
        ))}
        <button className="rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white">
          تطبيق المرشحات
        </button>
      </form>
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-800">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">جارٍ تحميل السجل…</p>
      ) : (
        <section aria-label="أحداث التدقيق" className="space-y-3">
          {events.length ? (
            events.map((event) => (
              <article
                key={event.id}
                className="flex min-w-0 flex-wrap items-start justify-between gap-3 rounded-2xl border bg-white p-4"
              >
                <div className="min-w-0">
                  <h2 className="font-black">{AUDIT_EVENT_LABELS[event.eventType]}</h2>
                  <time className="text-xs text-slate-500">{date(event.createdAt)}</time>
                  <p className="mt-2 break-words text-sm">
                    {event.actorName} · {roleLabels[event.actorRole] || event.actorRole}
                  </p>
                  <p className="break-words text-sm">
                    {entityLabels[event.entityType] || event.entityType}
                    {event.affectedName ? ` · ${event.affectedName}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => void open(event.id)}
                  className="rounded-xl border px-4 py-2 text-sm font-bold"
                >
                  التفاصيل
                </button>
              </article>
            ))
          ) : (
            <p>لا توجد أحداث ضمن المرشحات المختارة.</p>
          )}
        </section>
      )}
      <nav
        aria-label="صفحات سجل التدقيق"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <button
          disabled={loading || page === 1}
          onClick={() => setPage(page - 1)}
          className="rounded-xl border px-4 py-2 disabled:opacity-40"
        >
          السابق
        </button>
        <span className="text-sm">
          الصفحة {page} من {Math.max(1, Math.ceil(total / 20))} · {total} حدث
        </span>
        <button
          disabled={loading || page * 20 >= total}
          onClick={() => setPage(page + 1)}
          className="rounded-xl border px-4 py-2 disabled:opacity-40"
        >
          التالي
        </button>
      </nav>
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="تفاصيل حدث التدقيق"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4"
        >
          <section className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white p-5">
            <div className="flex justify-between gap-3">
              <h2 className="font-black">{AUDIT_EVENT_LABELS[selected.eventType]}</h2>
              <button onClick={() => setSelected(null)} className="rounded-lg border px-3 py-1">
                إغلاق
              </button>
            </div>
            <p>
              {selected.actorName} · {roleLabels[selected.actorRole] || selected.actorRole}
            </p>
            <p>{date(selected.createdAt)}</p>
            <p>
              {entityLabels[selected.entityType]} · {selected.affectedName || 'حدث إداري'}
            </p>
            {selected.reason && (
              <p className="break-words rounded-xl bg-slate-50 p-3">السبب: {selected.reason}</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <State title="قبل العملية" value={selected.before} />
              <State title="بعد العملية" value={selected.after} />
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
