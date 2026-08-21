import React, { useEffect, useMemo, useState } from 'react';
import { EducationalSituation, User } from '../../types/spex';

const empty = {
  name: '',
  grade: 1,
  fieldId: 'f_locomotion',
  fieldName: 'الميدان الأول: الوضعيات والتنقلات',
  objectiveIds: ['manual'],
  objectiveTexts: [''],
  sourceGoal: '',
  organization: '',
  equipment: [],
  variations: '',
};
const request = async (url: string, options?: RequestInit) => {
  const response = await fetch(`/api${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'تعذر تنفيذ العملية');
  return body;
};

export const EducationalSituationsBankView: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const [items, setItems] = useState<EducationalSituation[]>([]);
  const [q, setQ] = useState('');
  const [grade, setGrade] = useState('');
  const [field, setField] = useState('');
  const [objective, setObjective] = useState('');
  const [selected, setSelected] = useState<EducationalSituation | null>(null);
  const [draft, setDraft] = useState<any>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (grade) params.set('grade', grade);
      if (field) params.set('fieldId', field);
      if (objective) params.set('objective', objective);
      const body = await request(`/educational-situations?${params}`);
      setItems(body.situations);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر تحميل البنك');
    }
  };
  useEffect(() => {
    void load();
  }, [q, grade, field, objective]);
  const mine = useMemo(
    () => items.filter((item) => item.ownerId === currentUser.id),
    [items, currentUser.id]
  );
  const pending = useMemo(
    () => items.filter((item) => item.status === 'PENDING_APPROVAL'),
    [items]
  );
  const reviewer = currentUser.role === 'admin' || currentUser.role === 'inspector';
  const save = async () => {
    try {
      const payload = {
        ...draft,
        objectiveTexts: draft.objectiveTexts.filter(Boolean),
        equipment: String(draft.equipment || '')
          .split(/[،,]/)
          .map((x: string) => x.trim())
          .filter(Boolean),
      };
      await request(
        editingId ? `/educational-situations/${editingId}` : '/educational-situations',
        { method: editingId ? 'PUT' : 'POST', body: JSON.stringify(payload) }
      );
      setDraft(empty);
      setEditingId(null);
      setMessage(editingId ? 'تم تعديل الموقف الخاص.' : 'تم حفظ الموقف الخاص.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر الحفظ');
    }
  };
  const edit = (item: EducationalSituation) => {
    setEditingId(item.id);
    setDraft({
      ...item,
      equipment: item.equipment.join('، '),
      objectiveTexts: item.objectiveTexts.length ? item.objectiveTexts : [''],
    });
  };
  const remove = async (id: string) => {
    if (!window.confirm('حذف هذا الموقف الخاص؟')) return;
    try {
      await request(`/educational-situations/${id}`, { method: 'DELETE' });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر الحذف');
    }
  };
  const submit = async (id: string) => {
    await request(`/educational-situations/${id}/submit`, { method: 'POST' });
    await load();
  };
  const review = async (id: string, action: 'approve' | 'reject') => {
    const rejectionReason = action === 'reject' ? window.prompt('سبب الرفض (إلزامي):') || '' : '';
    try {
      await request(`/educational-situations/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ action, rejectionReason }),
      });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر المراجعة');
    }
  };
  return (
    <div className="space-y-5" dir="rtl">
      <div className="rounded-2xl border bg-white p-5">
        <h2 className="text-lg font-extrabold">بنك المواقف التربوية</h2>
        <p className="text-xs text-slate-500">
          المواقف العامة ومواقفك الخاصة المرتبطة بالأهداف التعليمية.
        </p>
        <div className="mt-4 grid gap-2 md:grid-cols-4">
          <input
            placeholder="البحث بالاسم"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rounded-xl border p-2"
          />
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="rounded-xl border p-2"
          >
            <option value="">كل المستويات</option>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            value={field}
            onChange={(e) => setField(e.target.value)}
            className="rounded-xl border p-2"
          >
            <option value="">كل الميادين</option>
            <option value="f_locomotion">الوضعيات والتنقلات</option>
            <option value="f_fundamentals">الحركات القاعدية</option>
            <option value="f_structuring">التنظيم الجماعي</option>
          </select>
          <input
            placeholder="الهدف التعليمي المطابق"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            className="rounded-xl border p-2"
          />
        </div>
      </div>
      {message && <p className="rounded-xl bg-amber-50 p-3 text-sm">{message}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {items
          .filter((item) => item.status === 'APPROVED' || item.ownerId === currentUser.id)
          .map((item) => (
            <div key={item.id} className="rounded-2xl border bg-white p-4 text-right">
              <button onClick={() => setSelected(item)} className="w-full text-right">
                <strong>{item.name}</strong>
                <p className="mt-1 text-xs">
                  السنة {item.grade} — {item.fieldName}
                </p>
                <p className="mt-1 text-xs text-slate-600">{item.objectiveTexts.join('، ')}</p>
                <p className="mt-1 text-xs text-slate-500">{item.equipment.join('، ')}</p>
              </button>
              {item.ownerId === currentUser.id && (
                <>
                  <span className="mt-2 inline-block text-xs font-bold text-blue-700">
                    {item.status}
                    {item.rejectionReason ? ` — ${item.rejectionReason}` : ''}
                  </span>
                  {['PRIVATE', 'REJECTED'].includes(item.status) && (
                    <span className="mr-2">
                      <button
                        onClick={() => edit(item)}
                        className="rounded-lg border px-2 py-1 text-xs"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => void remove(item.id)}
                        className="mr-1 rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-700"
                      >
                        حذف
                      </button>
                    </span>
                  )}
                </>
              )}
            </div>
          ))}
      </div>
      {currentUser.role === 'teacher' && (
        <section className="rounded-2xl border bg-white p-5">
          <h3 className="font-extrabold">{editingId ? 'تعديل موقف تربوي' : 'إضافة موقف تربوي'}</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {['name', 'fieldName', 'sourceGoal', 'organization', 'variations'].map((key) => (
              <input
                key={key}
                placeholder={
                  key === 'name' ? 'اسم الموقف' : key === 'organization' ? 'التنظيم/الإنجاز' : key
                }
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                className="rounded-xl border p-2"
              />
            ))}
            <input
              placeholder="الهدف التعليمي"
              value={draft.objectiveTexts[0]}
              onChange={(e) => setDraft({ ...draft, objectiveTexts: [e.target.value] })}
              className="rounded-xl border p-2"
            />
            <input
              placeholder="الوسائل"
              value={draft.equipment}
              onChange={(e) => setDraft({ ...draft, equipment: e.target.value })}
              className="rounded-xl border p-2"
            />
          </div>
          <button
            onClick={save}
            className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
          >
            {editingId ? 'حفظ التعديل' : 'حفظ كموقف خاص'}
          </button>
          {editingId && (
            <button
              onClick={() => {
                setEditingId(null);
                setDraft(empty);
              }}
              className="mr-2 mt-3 rounded-xl border px-3 py-2 text-sm"
            >
              إلغاء
            </button>
          )}
          {mine
            .filter((item) => ['PRIVATE', 'REJECTED'].includes(item.status))
            .map((item) => (
              <button
                key={item.id}
                onClick={() => void submit(item.id)}
                className="mr-2 mt-3 rounded-xl border border-blue-300 px-3 py-2 text-xs font-bold"
              >
                إرسال إلى بنك المواقف: {item.name}
              </button>
            ))}
        </section>
      )}
      {reviewer && (
        <section className="rounded-2xl border bg-white p-5">
          <h3 className="font-extrabold">مواقف بانتظار الاعتماد</h3>
          {pending.map((item) => (
            <div
              key={item.id}
              className="mt-3 flex items-center justify-between rounded-xl border p-3"
            >
              <span>
                {item.name} — السنة {item.grade} — {item.objectiveTexts.join('، ')}
              </span>
              <span>
                <button
                  onClick={() => void review(item.id, 'approve')}
                  className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white"
                >
                  اعتماد
                </button>
                <button
                  onClick={() => void review(item.id, 'reject')}
                  className="mr-2 rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white"
                >
                  رفض
                </button>
              </span>
            </div>
          ))}
        </section>
      )}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-w-2xl rounded-2xl bg-white p-6">
            <button onClick={() => setSelected(null)} className="float-left">
              ✕
            </button>
            <h3 className="font-extrabold">{selected.name}</h3>
            <p className="mt-2">{selected.sourceGoal}</p>
            <p className="mt-2">{selected.organization}</p>
            <p className="mt-2">الوسائل: {selected.equipment.join('، ')}</p>
            <p className="mt-2">التنويعات: {selected.variations || '—'}</p>
          </div>
        </div>
      )}
    </div>
  );
};
