import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  createAdminAssignment,
  fetchAdminInspectorWorkspace,
  fetchGeoDirectorates,
  fetchGeoDistricts,
  syncUserToDB,
} from '../../services/api';
import { User } from '../../types/spex';

const statusLabel: Record<string, string> = {
  active: 'نشط',
  inactive: 'معطل',
  pending_approval: 'بانتظار التفعيل',
  Pending: 'بانتظار قبول المفتش',
  Active: 'نشط',
  Changed: 'نشط / معدل',
  Removed: 'منتهي / ملغى',
};
const assignmentStatus = (status: string) => statusLabel[status] || status;
const districtIdOf = (u: any) => u.districtId || u.eduDistrictId || '';
const directorateIdOf = (u: any) => u.directorateId || u.eduDirectorateId || '';

interface WorkspaceProps {
  currentUser: User;
  onAddUser: (user: Partial<User>) => void;
  onUpdateUser: (user: User) => void;
}
export const AdminInspectorWorkspacePage: React.FC<WorkspaceProps> = ({
  currentUser,
  onAddUser,
  onUpdateUser,
}) => {
  const navigate = useNavigate();
  const [data, setData] = useState<{
    inspectors: any[];
    districts: any[];
    teachers: any[];
    assignments: any[];
  }>({ inspectors: [], districts: [], teachers: [], assignments: [] });
  const [tab, setTab] = useState<'inspectors' | 'districts' | 'assign' | 'pending' | 'history'>(
    'inspectors'
  );
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [query, setQuery] = useState(''),
    [coverage, setCoverage] = useState('all'),
    [assignmentFilter, setAssignmentFilter] = useState('all');
  const [teacherId, setTeacherId] = useState(''),
    [inspectorId, setInspectorId] = useState(''),
    [saving, setSaving] = useState(false),
    [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<any | null>(null),
    [directorates, setDirectorates] = useState<any[]>([]),
    [districts, setDistricts] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false),
    [newInspector, setNewInspector] = useState({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      directorateId: '',
      districtId: '',
    });
  const load = async () => {
    setLoading(true);
    const result = await fetchAdminInspectorWorkspace();
    setLoading(false);
    if (!result.success) setError(result.error || 'تعذر تحميل مساحة المفتشين.');
    else {
      setError('');
      setData({
        inspectors: result.inspectors || [],
        districts: result.districts || [],
        teachers: result.teachers || [],
        assignments: result.assignments || [],
      });
    }
  };
  useEffect(() => {
    void load();
    void fetchGeoDirectorates().then((r: any) => setDirectorates(r.directorates || []));
  }, []);
  const loadDistricts = async (id: string) => {
    if (!id) return setDistricts([]);
    const r: any = await fetchGeoDistricts(id);
    setDistricts(r.districts || []);
  };
  const inspectors = useMemo(
    () =>
      data.inspectors.filter((i) => {
        const text = [
          i.firstName,
          i.lastName,
          i.email,
          i.eduDirectorate?.name,
          i.eduDistrict?.name,
          i.directorateId,
          i.districtId,
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase();
        return !query.trim() || text.includes(query.trim().toLocaleLowerCase());
      }),
    [data.inspectors, query]
  );
  const pendingAssignments = data.assignments.filter((a) => a.status === 'Pending');
  const filteredAssignments = data.assignments.filter(
    (a) => assignmentFilter === 'all' || a.status === assignmentFilter
  );
  const teachers = data.teachers.filter((t) => !teacherId || t.id === teacherId);
  const saveAssignment = async () => {
    if (!teacherId || !inspectorId) return;
    setSaving(true);
    const r: any = await createAdminAssignment(teacherId, inspectorId);
    setSaving(false);
    setNotice(
      r.success ? 'تم إنشاء الإسناد بانتظار قبول المفتش.' : r.error || 'تعذر إنشاء الإسناد.'
    );
    if (r.success) {
      setTeacherId('');
      setInspectorId('');
      await load();
    }
  };
  const saveAffiliation = async () => {
    if (!editing) return;
    setSaving(true);
    const r = await syncUserToDB({
      ...editing,
      directorateId: editing.directorateId,
      districtId: editing.districtId,
    } as User);
    setSaving(false);
    if (!r.success || !r.user) setNotice(r.error || 'تعذر حفظ affiliation.');
    else {
      onUpdateUser(r.user);
      setEditing(null);
      setNotice('تم تحديث انتساب المفتش مع التحقق من المقاطعة.');
      await load();
    }
  };
  const createInspector = () => {
    if (
      !newInspector.firstName ||
      !newInspector.lastName ||
      !newInspector.email ||
      !newInspector.password ||
      !newInspector.directorateId ||
      !newInspector.districtId
    )
      return setNotice('استكمل الاسم والبريد وكلمة المرور والمديرية والمقاطعة.');
    onAddUser({ ...newInspector, role: 'inspector', status: 'active', isApprovedByAdmin: true });
    setShowCreate(false);
    setNewInspector({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      directorateId: '',
      districtId: '',
    });
    setNotice('تم إرسال طلب إنشاء حساب المفتش عبر المسار الحالي.');
  };
  const tabs = [
    ['inspectors', 'المفتشون'],
    ['districts', 'المقاطعات التفتيشية'],
    ['assign', 'إسناد الأساتذة'],
    ['pending', 'الإسنادات المعلقة'],
    ['history', 'سجل/حالة الإسنادات'],
  ] as const;
  if (loading)
    return (
      <div className="p-12 text-center text-slate-500" dir="rtl">
        <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-purple-600" />
        جارٍ تحميل مساحة المفتشين...
      </div>
    );
  return (
    <div className="space-y-6" dir="rtl">
      <header className="rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-purple-300" />
            <div>
              <p className="text-xs font-bold text-purple-200">إدارة الإسناد الإداري</p>
              <h1 className="mt-1 text-2xl font-black">المفتشون والإسنادات</h1>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20"
          >
            <Plus className="h-4 w-4" />
            إنشاء حساب مفتش
          </button>
        </div>
        <p className="mt-3 text-sm text-purple-100/80">
          بيانات المديريات والمقاطعات والإسنادات من PostgreSQL، مع بقاء قبول الإسناد بيد المفتش.
        </p>
      </header>
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold ${tab === key ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => void load()}
          className="mr-auto rounded-xl p-2 text-slate-500 hover:bg-slate-50"
          title="تحديث"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
          <AlertCircle className="ml-2 inline h-4 w-4" />
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-2xl bg-purple-50 p-4 text-sm font-bold text-purple-800">
          {notice}
        </div>
      )}
      {tab === 'inspectors' && (
        <section className="space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث بالاسم أو البريد أو المديرية أو المقاطعة..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-10 pl-3 text-sm outline-none focus:border-purple-500"
            />
          </div>
          {inspectors.length === 0 ? (
            <Empty text="لا توجد حسابات مفتشين." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {inspectors.map((i) => (
                <article
                  key={i.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-black text-slate-900">
                        {i.firstName} {i.lastName}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">{i.email}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${i.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}
                    >
                      {statusLabel[i.status] || i.status}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <p>الهاتف: {i.phone || 'غير مضاف'}</p>
                    <p>المديرية: {i.eduDirectorate?.name || i.directorateId || 'غير محددة'}</p>
                    <p>المقاطعة: {i.eduDistrict?.name || i.districtId || 'غير محددة'}</p>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Metric label="أساتذة مقبولون" value={i.acceptedTeacherCount || 0} />
                      <Metric label="إسنادات معلقة" value={i.pendingAssignmentCount || 0} />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => navigate(`/admin/accounts/${i.id}`)}
                      className="rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700"
                    >
                      فتح الحساب
                    </button>
                    <button
                      onClick={() => {
                        setEditing({ ...i });
                        void loadDistricts(directorateIdOf(i));
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      إدارة الانتساب
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      {tab === 'districts' && (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCoverage('all')}
              className={`rounded-xl px-3 py-2 text-xs font-bold ${coverage === 'all' ? 'bg-purple-600 text-white' : 'bg-white text-slate-600'}`}
            >
              كل المقاطعات
            </button>
            <button
              onClick={() => setCoverage('covered')}
              className={`rounded-xl px-3 py-2 text-xs font-bold ${coverage === 'covered' ? 'bg-purple-600 text-white' : 'bg-white text-slate-600'}`}
            >
              بها مفتش
            </button>
            <button
              onClick={() => setCoverage('empty')}
              className={`rounded-xl px-3 py-2 text-xs font-bold ${coverage === 'empty' ? 'bg-purple-600 text-white' : 'bg-white text-slate-600'}`}
            >
              بدون مفتش
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {data.districts
              .filter(
                (d) => coverage === 'all' || (coverage === 'covered' ? d.inspector : !d.inspector)
              )
              .map((d) => (
                <div
                  key={d.id}
                  className={`rounded-2xl border p-4 ${d.inspector ? 'border-slate-200 bg-white' : 'border-amber-200 bg-amber-50'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-black text-slate-900">{d.name}</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {d.directorate?.name || 'مديرية غير محددة'}
                      </p>
                    </div>
                    <Building2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-700">
                    {d.inspector
                      ? `المفتش: ${d.inspector.firstName} ${d.inspector.lastName}`
                      : 'بدون مفتش'}
                  </p>
                  <div className="mt-3 flex gap-2 text-[11px] font-bold text-slate-500">
                    <span>مقبولون: {d.acceptedTeacherCount || 0}</span>
                    <span>معلقون: {d.pendingAssignmentCount || 0}</span>
                  </div>
                  {!d.inspector && (
                    <button
                      onClick={() => {
                        setShowCreate(true);
                        setNewInspector({
                          ...newInspector,
                          directorateId: d.directorate?.id || '',
                          districtId: d.id,
                        });
                      }}
                      className="mt-3 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white"
                    >
                      تعيين مفتش
                    </button>
                  )}
                </div>
              ))}
          </div>
          {data.districts.length > 0 && data.districts.every((d) => d.inspector) && (
            <Empty text="جميع المقاطعات المعروضة لديها مفتش معيّن." />
          )}
        </section>
      )}
      {(tab === 'assign' || tab === 'pending' || tab === 'history') && (
        <section className="space-y-4">
          {tab === 'assign' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-base font-black">إسناد أستاذ إلى مفتش</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="rounded-xl border border-slate-200 p-3 text-sm"
                >
                  <option value="">اختر أستاذاً</option>
                  {data.teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName} — {t.email} — {t.schoolName || 'لا توجد مؤسسة'}
                      {t.teacherAssignment?.status === 'Active' ? ' — مسند حالياً' : ''}
                    </option>
                  ))}
                </select>
                <select
                  value={inspectorId}
                  onChange={(e) => setInspectorId(e.target.value)}
                  className="rounded-xl border border-slate-200 p-3 text-sm"
                >
                  <option value="">اختر مفتشاً نشطاً</option>
                  {data.inspectors
                    .filter((i) => i.status === 'active')
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.firstName} {i.lastName} —{' '}
                        {i.eduDistrict?.name || i.districtId || 'مقاطعة غير محددة'} —{' '}
                        {i.acceptedTeacherCount || 0} أستاذ
                      </option>
                    ))}
                </select>
              </div>
              <button
                onClick={saveAssignment}
                disabled={saving || !teacherId || !inspectorId}
                className="mt-4 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {saving ? 'جارٍ الحفظ...' : 'إنشاء إسناد بانتظار القبول'}
              </button>
              <p className="mt-3 text-xs text-slate-500">
                يتم التحقق من تطابق مديرية/مقاطعة الأستاذ والمفتش على الخادم.
              </p>
            </div>
          )}
          {tab !== 'assign' && (
            <div className="flex gap-2">
              <select
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
              >
                <option value="all">كل الحالات</option>
                <option value="Pending">بانتظار القبول</option>
                <option value="Active">نشط</option>
                <option value="Changed">نشط / معدل</option>
                <option value="Removed">منتهي / ملغى</option>
              </select>
            </div>
          )}{' '}
          {tab === 'assign' && (
            <AssignmentList
              assignments={data.assignments.filter((a) => a.status === 'Pending')}
              navigate={navigate}
              empty="لا توجد إسنادات معلقة لهذا العرض."
            />
          )}{' '}
          {tab === 'pending' && (
            <AssignmentList
              assignments={pendingAssignments}
              navigate={navigate}
              empty="لا توجد إسنادات بانتظار القبول."
            />
          )}{' '}
          {tab === 'history' && (
            <AssignmentList
              assignments={filteredAssignments}
              navigate={navigate}
              empty="لا توجد سجلات إسناد."
            />
          )}
        </section>
      )}
      {editing && (
        <Modal title="تعديل انتساب المفتش">
          <select
            value={editing.directorateId || ''}
            onChange={(e) => {
              setEditing({ ...editing, directorateId: e.target.value, districtId: '' });
              void loadDistricts(e.target.value);
            }}
            className="w-full rounded-xl border border-slate-200 p-3 text-sm"
          >
            <option value="">اختر المديرية</option>
            {directorates.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={editing.districtId || ''}
            onChange={(e) => setEditing({ ...editing, districtId: e.target.value })}
            className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm"
          >
            <option value="">اختر المقاطعة</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <div className="mt-4 flex gap-2">
            <button
              onClick={saveAffiliation}
              disabled={saving || !editing.directorateId || !editing.districtId}
              className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white"
            >
              حفظ
            </button>
            <button
              onClick={() => setEditing(null)}
              className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold"
            >
              إلغاء
            </button>
          </div>
        </Modal>
      )}
      {showCreate && (
        <Modal title="إنشاء حساب مفتش">
          <input
            placeholder="الاسم الأول"
            value={newInspector.firstName}
            onChange={(e) => setNewInspector({ ...newInspector, firstName: e.target.value })}
            className="w-full rounded-xl border border-slate-200 p-3 text-sm"
          />
          <input
            placeholder="اللقب"
            value={newInspector.lastName}
            onChange={(e) => setNewInspector({ ...newInspector, lastName: e.target.value })}
            className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm"
          />
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={newInspector.email}
            onChange={(e) => setNewInspector({ ...newInspector, email: e.target.value })}
            className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm"
          />
          <input
            type="password"
            placeholder="كلمة المرور الأولية"
            value={newInspector.password}
            onChange={(e) => setNewInspector({ ...newInspector, password: e.target.value })}
            className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm"
          />
          <select
            value={newInspector.directorateId}
            onChange={(e) => {
              setNewInspector({ ...newInspector, directorateId: e.target.value, districtId: '' });
              void loadDistricts(e.target.value);
            }}
            className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm"
          >
            <option value="">اختر المديرية</option>
            {directorates.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={newInspector.districtId}
            onChange={(e) => setNewInspector({ ...newInspector, districtId: e.target.value })}
            className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm"
          >
            <option value="">اختر المقاطعة</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <div className="mt-4 flex gap-2">
            <button
              onClick={createInspector}
              className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white"
            >
              إنشاء
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold"
            >
              إلغاء
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
const AssignmentList: React.FC<{
  assignments: any[];
  navigate: (to: string) => void;
  empty: string;
}> = ({ assignments, navigate, empty }) =>
  assignments.length === 0 ? (
    <Empty text={empty} />
  ) : (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-right text-sm">
        <thead className="bg-slate-50 text-xs font-bold text-slate-500">
          <tr>
            <th className="p-3">الأستاذ</th>
            <th className="p-3">المفتش</th>
            <th className="p-3">المديرية / المقاطعة</th>
            <th className="p-3">الحالة</th>
            <th className="p-3">التاريخ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {assignments.map((a) => (
            <tr key={a.id}>
              <td className="p-3 font-bold">
                {a.teacher ? `${a.teacher.firstName} ${a.teacher.lastName}` : 'غير متاح'}
                <span className="block text-xs font-normal text-slate-400">
                  {a.teacher?.email || ''}
                </span>
              </td>
              <td className="p-3">
                {a.inspector ? (
                  <button
                    onClick={() => navigate(`/admin/accounts/${a.inspector.id}`)}
                    className="font-bold text-purple-700"
                  >
                    {a.inspector.firstName} {a.inspector.lastName}
                  </button>
                ) : (
                  'بدون مفتش'
                )}
              </td>
              <td className="p-3 text-xs text-slate-500">
                {a.teacher?.districtId || a.teacher?.eduDistrictId || 'غير محددة'}
              </td>
              <td className="p-3">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">
                  {assignmentStatus(a.status)}
                </span>
              </td>
              <td className="p-3 text-xs text-slate-500">
                {a.createdAt ? new Date(a.createdAt).toLocaleDateString('ar-DZ') : 'غير محدد'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
const Metric: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <span className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600">
    {label}: {value}
  </span>
);
const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
    {text}
  </div>
);
const Modal: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
      <h2 className="mb-4 text-lg font-black text-slate-900">{title}</h2>
      {children}
    </div>
  </div>
);
