import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Edit3,
  KeyRound,
  Loader2,
  Save,
  ShieldCheck,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  activateUserAccount,
  AdminAccountDetail,
  fetchAdminAccount,
  syncUserToDB,
} from '../../services/api';
import { User } from '../../types/spex';

const roleLabels: Record<string, string> = {
  teacher: 'أستاذ',
  inspector: 'مفتش',
  director: 'مدير',
  admin: 'مشرف',
};
const statusLabel = (u: AdminAccountDetail) =>
  u.status === 'pending_approval' || u.isApprovedByAdmin === false
    ? 'بانتظار التفعيل'
    : u.status === 'active'
      ? 'نشط'
      : 'معطل';
const fallback = (value?: string | number | null, text = 'غير مضاف') =>
  value === undefined || value === null || value === '' ? text : String(value);

export const AdminAccountDetailPage: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminAccountDetail | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [editing, setEditing] = useState(false),
    [saving, setSaving] = useState(false),
    [notice, setNotice] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    schoolName: '',
    municipality: '',
    specialization: '',
    bio: '',
  });
  const load = async () => {
    if (!userId) return;
    setLoading(true);
    const result = await fetchAdminAccount(userId);
    setLoading(false);
    if (!result.success || !result.user) setError(result.error || 'الحساب غير موجود.');
    else {
      setUser(result.user);
      setForm({
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        email: result.user.email,
        phone: result.user.phone || '',
        schoolName: result.user.schoolName || '',
        municipality: result.user.municipality || '',
        specialization: result.user.specialization || '',
        bio: result.user.bio || '',
      });
    }
  };
  useEffect(() => {
    void load();
  }, [userId]);
  const save = async () => {
    if (!user) return;
    setSaving(true);
    setNotice('');
    const result = await syncUserToDB({ ...user, ...form } as User);
    setSaving(false);
    if (!result.success || !result.user) {
      setNotice(result.error || 'تعذر حفظ التغييرات.');
      return;
    }
    setUser({ ...user, ...result.user, ...form });
    setEditing(false);
    setNotice('تم حفظ التغييرات.');
  };
  const activate = async () => {
    if (!user) return;
    const result = await activateUserAccount(user.id);
    if (!result.success || !result.user) {
      setNotice(result.error || 'تعذر تفعيل الحساب.');
      return;
    }
    setUser({ ...user, ...result.user, status: 'active', isApprovedByAdmin: true });
    setNotice('تم تفعيل الحساب، وبقي في الدليل.');
  };
  const toggleDisabled = async () => {
    if (!user || user.isPlatformOwner || !currentUser.isPlatformOwner) return;
    const result = await syncUserToDB({
      ...user,
      status: user.status === 'inactive' ? 'active' : 'inactive',
    } as User);
    if (!result.success || !result.user) {
      setNotice(result.error || 'تعذر تغيير حالة الحساب.');
      return;
    }
    setUser({ ...user, ...result.user });
    setNotice('تم تحديث حالة الحساب.');
  };
  if (loading)
    return (
      <div className="p-12 text-center text-slate-500" dir="rtl">
        <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-purple-600" />
        جارٍ تحميل الحساب...
      </div>
    );
  if (error || !user)
    return (
      <div
        className="space-y-4 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-800"
        dir="rtl"
      >
        <h1 className="text-xl font-black">الحساب غير متاح</h1>
        <p>{error || 'لم يتم العثور على هذا الحساب.'}</p>
        <button
          onClick={() => navigate('/admin/accounts')}
          className="rounded-xl bg-white px-4 py-2 font-bold"
        >
          العودة إلى إدارة الحسابات
        </button>
      </div>
    );
  const affiliation = user.adminAffiliation || {};
  const isInspector = user.role === 'inspector',
    isTeacher = user.role === 'teacher';
  return (
    <div className="workspace-page workspace-page--admin space-y-6" dir="rtl">
      <button
        onClick={() => navigate('/admin/accounts')}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-purple-700"
      >
        <ArrowRight className="h-4 w-4" />
        العودة إلى دليل الحسابات
      </button>
      <header className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200/80">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-xl font-black text-purple-800">
              {user.firstName?.[0] || '?'}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900">
                  {user.firstName} {user.lastName}
                </h1>
                {user.isPlatformOwner && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                    مالك المنصة
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {roleLabels[user.role] || user.role} · {user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
              {statusLabel(user)}
            </span>
            {!user.isPlatformOwner &&
              (user.status === 'pending_approval' || user.isApprovedByAdmin === false) && (
                <button
                  onClick={activate}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
                >
                  تفعيل الحساب
                </button>
              )}
            {!user.isPlatformOwner &&
              currentUser.isPlatformOwner &&
              user.status !== 'pending_approval' && (
                <button
                  onClick={toggleDisabled}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"
                >
                  {user.status === 'inactive' ? 'إعادة التفعيل' : 'تعطيل الحساب'}
                </button>
              )}
          </div>
        </div>
      </header>
      {notice && (
        <div className="rounded-2xl bg-purple-50 p-3 text-sm font-bold text-purple-800">
          {notice}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="البيانات الأساسية" icon={<UserRound className="h-4 w-4" />}>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['firstName', 'الاسم'],
              ['lastName', 'اللقب'],
              ['email', 'البريد الإلكتروني'],
              ['phone', 'الهاتف'],
            ].map(([key, label]) => (
              <Field
                key={key}
                label={label}
                value={form[key as keyof typeof form]}
                editing={editing}
                onChange={(v) => setForm({ ...form, [key]: v })}
              />
            ))}
            <Info label="الدور" value={roleLabels[user.role] || user.role} />
            <Info
              label="تاريخ الإنشاء"
              value={
                user.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-DZ') : 'غير محدد'
              }
            />
            <Info
              label="حالة الاعتماد"
              value={user.isApprovedByAdmin === false ? 'بانتظار اعتماد الإدارة' : 'معتمد'}
            />
          </div>
        </Section>
        <Section title="الانتساب المهني" icon={<ShieldCheck className="h-4 w-4" />}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Info
              label="المديرية"
              value={fallback(affiliation.directorateName || user.directorateId, 'غير محددة')}
            />
            <Info
              label="المقاطعة التفتيشية"
              value={fallback(affiliation.districtName || user.districtId, 'غير محددة')}
            />
            {isTeacher && (
              <Field
                label="المؤسسة"
                value={form.schoolName || affiliation.institutionName || ''}
                editing={editing}
                onChange={(v) => setForm({ ...form, schoolName: v })}
              />
            )}
            {isTeacher && (
              <Field
                label="البلدية"
                value={form.municipality || affiliation.municipalityName || ''}
                editing={editing}
                onChange={(v) => setForm({ ...form, municipality: v })}
              />
            )}
            {!isInspector && (
              <Field
                label="التخصص"
                value={form.specialization}
                editing={editing}
                onChange={(v) => setForm({ ...form, specialization: v })}
              />
            )}
            {isInspector && <Info label="المؤسسة" value="لا تنطبق على حساب المفتش" />}
          </div>
          {isInspector && (
            <button
              onClick={() => navigate('/admin/inspectors')}
              className="mt-5 rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700"
            >
              فتح إدارة الإسنادات المتقدمة
            </button>
          )}
        </Section>
        <Section title="ملخص الحساب" icon={<Users className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Metric label="الطلاب" value={isTeacher ? user.counts?.students || 0 : '—'} />
            <Metric label="الفصول" value={isTeacher ? user.counts?.classes || 0 : '—'} />
            <Metric
              label="الأساتذة المسندون"
              value={isInspector ? user.counts?.assignedTeachers || 0 : '—'}
            />
          </div>
          {isTeacher && (
            <p className="mt-4 text-sm text-slate-600">
              المفتش المسند:{' '}
              {user.assignment?.inspector
                ? `${user.assignment.inspector.firstName} ${user.assignment.inspector.lastName}`
                : 'لا يوجد إسناد مقبول'}
            </p>
          )}
          {isInspector && (
            <p className="mt-4 text-sm text-slate-600">
              حالة الإسناد:{' '}
              {user.counts?.assignedTeachers
                ? 'لديه أساتذة مسندون'
                : 'لا يوجد أساتذة مسندون حالياً'}
            </p>
          )}
        </Section>
        <Section title="إدارة الحساب" icon={<KeyRound className="h-4 w-4" />}>
          <div className="flex flex-wrap gap-3">
            <Info
              label="الخدمة المساعدة"
              value={user.serviceAccess?.enabled ? 'مفعلة' : 'غير مفعلة'}
            />
            <Info
              label="الاعتماد"
              value={user.serviceAccess?.credentialEnabled ? 'بيانات اعتماد محفوظة' : 'غير مهيأ'}
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {editing ? (
              <>
                <button
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold"
                >
                  <XCircle className="h-4 w-4" />
                  إلغاء
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-50 px-4 py-2 text-xs font-bold text-purple-700"
              >
                <Edit3 className="h-4 w-4" />
                تعديل البيانات المسموحة
              </button>
            )}
            <button
              onClick={() => navigate('/admin/services?userId=' + encodeURIComponent(user.id))}
              className="rounded-xl bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800"
            >
              إدارة الخدمات
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
};
const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({
  title,
  icon,
  children,
}) => (
  <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
    <h2 className="mb-5 flex items-center gap-2 text-base font-black text-slate-900">
      {icon}
      {title}
    </h2>
    {children}
  </section>
);
const Info: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div className="text-[11px] font-bold text-slate-400">{label}</div>
    <div className="mt-1 text-sm font-bold text-slate-800">{value}</div>
  </div>
);
const Field: React.FC<{
  label: string;
  value: string;
  editing: boolean;
  onChange: (value: string) => void;
}> = ({ label, value, editing, onChange }) => (
  <div>
    <div className="text-[11px] font-bold text-slate-400">{label}</div>
    {editing ? (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-purple-200 px-2 py-1.5 text-sm outline-none focus:border-purple-500"
      />
    ) : (
      <div className="mt-1 text-sm font-bold text-slate-800">{fallback(value)}</div>
    )}
  </div>
);
const Metric: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="rounded-2xl bg-slate-50 p-4">
    <div className="text-xs font-bold text-slate-500">{label}</div>
    <div className="mt-1 text-2xl font-black text-slate-900">{value}</div>
  </div>
);
