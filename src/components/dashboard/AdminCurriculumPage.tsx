import React, { useEffect, useMemo, useState } from 'react';
import {
  BookMarked,
  CheckCircle2,
  FileText,
  Info as InfoIcon,
  Layers,
  Loader2,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { ANNUAL_PLAN_REFERENCE } from '../../data/annualPlanReference';
import { COMPLETE_ANNUAL_CURRICULUM, PE_FIELDS, PE_LEVELS } from '../../data/algerianCurriculum';
import {
  buildKnowledgeCoverage,
  type CoverageResourceType,
  type CoverageStatus,
} from '../../services/knowledgeCoverage.service';
import { AdminCurriculumOverride, fetchAdminCurriculumOverrides } from '../../services/api';
import { KnowledgeItem } from '../../types/spex';

const tabs = [
  ['structure', 'بنية المنهاج'],
  ['annual', 'المخطط السنوي المرجعي'],
  ['sections', 'المقاطع التعلمية'],
  ['objectives', 'الأهداف والكفاءات'],
  ['coverage', 'تشخيص التغطية البيداغوجية'],
  ['overrides', 'تخصيصات الأساتذة'],
  ['metadata', 'معلومات النسخة والمرجع'],
] as const;
const statusLabels: Record<CoverageStatus, string> = {
  EMPTY: 'EMPTY — فارغ',
  LOW: 'LOW — منخفض',
  ADEQUATE: 'ADEQUATE — كافٍ',
};
const categoryLabels: Record<CoverageResourceType, string> = {
  games: 'الألعاب التربوية',
  objectives: 'الأهداف الإجرائية',
  remedial: 'الأنشطة العلاجية',
  situations: 'المواقف التربوية',
};

export const AdminCurriculumPage: React.FC<{ knowledgeItems: KnowledgeItem[] }> = ({
  knowledgeItems,
}) => {
  const [tab, setTab] = useState<(typeof tabs)[number][0]>('structure');
  const [levelId, setLevelId] = useState('lvl_p1');
  const [fieldId, setFieldId] = useState('all');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CoverageResourceType | 'all'>('all');
  const [overrides, setOverrides] = useState<AdminCurriculumOverride[]>([]);
  const [loadingOverrides, setLoadingOverrides] = useState(false);
  const [error, setError] = useState('');

  const level = COMPLETE_ANNUAL_CURRICULUM[levelId] || COMPLETE_ANNUAL_CURRICULUM.lvl_p1;
  const annual = ANNUAL_PLAN_REFERENCE[levelId] || ANNUAL_PLAN_REFERENCE.lvl_p1;
  const fields = Object.values(level.fields).filter((field) => {
    const text =
      `${field.fieldName} ${field.finalCompetency} ${field.sessionsList.map((session) => session.objective).join(' ')}`.toLocaleLowerCase();
    return (
      (fieldId === 'all' || field.fieldId === fieldId) &&
      (!query.trim() || text.includes(query.trim().toLocaleLowerCase()))
    );
  });
  const coverage = useMemo(() => buildKnowledgeCoverage({ knowledgeItems }), [knowledgeItems]);
  const coverageRows = coverage.filter(
    (row) =>
      row.levelId === levelId &&
      (fieldId === 'all' || row.fieldId === fieldId) &&
      (category === 'all' || row.statuses[category])
  );

  const loadOverrides = async () => {
    setLoadingOverrides(true);
    try {
      setOverrides(await fetchAdminCurriculumOverrides());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل تخصيصات الأساتذة.');
    } finally {
      setLoadingOverrides(false);
    }
  };
  useEffect(() => {
    void loadOverrides();
  }, []);

  return (
    <div dir="rtl" className="space-y-6">
      <header className="rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-6 text-white shadow-lg">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white/10 p-3">
            <BookMarked className="h-6 w-6 text-purple-200" />
          </div>
          <div>
            <span className="text-xs font-bold text-purple-200">مرجع المنصة المحمي</span>
            <h1 className="mt-1 text-2xl font-black">إدارة المنهاج والمراجع</h1>
            <p className="mt-2 text-sm text-purple-100/80">
              عرض رسمي وتشخيصي للمنهاج دون تعديل النص أو البنية المرجعية.
            </p>
          </div>
        </div>
      </header>
      <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap gap-2">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-xl px-3 py-2 text-xs font-black ${tab === key ? 'bg-purple-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-purple-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث في الكفاءة أو الهدف أو المقطع"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-10 pl-3 text-xs outline-none focus:border-purple-500"
            />
          </div>
          <select
            value={levelId}
            onChange={(e) => setLevelId(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold"
          >
            {PE_LEVELS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            value={fieldId}
            onChange={(e) => setFieldId(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold"
          >
            <option value="all">كل الميادين</option>
            {PE_FIELDS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </section>
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
          {error}
          <button
            onClick={() => void loadOverrides()}
            className="mr-3 rounded-lg bg-white px-3 py-1 text-xs"
          >
            إعادة المحاولة
          </button>
        </div>
      )}
      {tab === 'structure' && <Structure level={level} fields={fields} />}
      {tab === 'annual' && <AnnualPlan level={annual} />}
      {tab === 'sections' && <Sections fields={fields} />}
      {tab === 'objectives' && <Objectives level={level} fields={fields} />}
      {tab === 'coverage' && (
        <Coverage rows={coverageRows} category={category} setCategory={setCategory} />
      )}
      {tab === 'overrides' && <Overrides rows={overrides} loading={loadingOverrides} />}
      {tab === 'metadata' && <Metadata />}
    </div>
  );
};

const ReferenceBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">
    <ShieldCheck className="h-3 w-3" />
    مرجع رسمي — للعرض فقط
  </span>
);
const Structure: React.FC<{
  level: (typeof COMPLETE_ANNUAL_CURRICULUM)[string];
  fields: Array<(typeof COMPLETE_ANNUAL_CURRICULUM)[string]['fields'][string]>;
}> = ({ level, fields }) => (
  <section className="space-y-4">
    <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5">
      <ReferenceBadge />
      <h2 className="mt-3 text-xl font-black">{level.levelName}</h2>
      <p className="mt-2 text-sm font-bold text-slate-700">
        الكفاءة الشاملة: {level.levelName} — {level.totalSessions} حصة مرجعية
      </p>
    </div>
    {fields.map((field) => (
      <article
        key={field.fieldId}
        className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="text-xs font-black text-purple-700">{field.fieldId}</span>
            <h3 className="mt-1 text-lg font-black">{field.fieldName}</h3>
            <p className="mt-2 text-sm font-bold text-slate-700">
              الكفاءة الختامية: {field.finalCompetency}
            </p>
          </div>
          <ReferenceBadge />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <List title="معايير تحقيق الكفاءة" items={field.criteria} />
          <List title="مؤشرات تحقيق الكفاءة" items={field.indicators} />
        </div>
        <p className="mt-4 text-xs font-bold text-slate-500">
          المسار: السنة ← الميدان ← المقاطع والحصص ← الأهداف المرجعية
        </p>
      </article>
    ))}
  </section>
);
const AnnualPlan: React.FC<{ level: (typeof ANNUAL_PLAN_REFERENCE)[string] }> = ({ level }) => (
  <section className="space-y-4">
    <Header title="المخطط السنوي المرجعي" icon={<FileText className="h-5 w-5 text-purple-600" />} />
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
      <ReferenceBadge />
      <h2 className="mt-2 text-lg font-black">{level.levelName}</h2>
      <p className="mt-2 text-sm font-bold text-slate-700">
        الكفاءة الشاملة: {level.comprehensive}
      </p>
    </div>
    {level.domains.map((domain) => (
      <article key={domain.fieldId} className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-black">{domain.fieldName}</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Info label="الكفاءة الختامية" value={domain.finalCompetency} />
          <Info label="مركبات الكفاءة" value={domain.components} />
          <Info label="الموارد المعرفية" value={domain.knowledgeResources} />
          <Info label="الموارد العرضية" value={domain.transversalResources} />
          <Info label="معايير ومؤشرات التقويم" value={domain.evaluationCriteria} />
          <Info label="الزمن المرجعي" value={domain.time} />
        </div>
      </article>
    ))}
  </section>
);
const Sections: React.FC<{
  fields: Array<(typeof COMPLETE_ANNUAL_CURRICULUM)[string]['fields'][string]>;
}> = ({ fields }) => (
  <section className="space-y-4">
    <Header title="المقاطع التعلمية" icon={<Layers className="h-5 w-5 text-purple-600" />} />
    {fields.map((field) => (
      <article key={field.fieldId} className="rounded-2xl border border-slate-200 bg-white p-5">
        <ReferenceBadge />
        <h3 className="mt-3 font-black">{field.fieldName}</h3>
        <p className="mt-1 text-sm font-bold text-slate-700">{field.finalCompetency}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {field.sessionsList.map((session) => (
            <div
              key={session.sessionNumber}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <span className="text-[10px] font-black text-purple-700">
                الحصة {session.sessionNumber} · {session.typeLabel}
              </span>
              <p className="mt-2 text-xs font-bold text-slate-700">{session.objective}</p>
            </div>
          ))}
        </div>
      </article>
    ))}
  </section>
);
const Objectives: React.FC<{
  level: (typeof COMPLETE_ANNUAL_CURRICULUM)[string];
  fields: Array<(typeof COMPLETE_ANNUAL_CURRICULUM)[string]['fields'][string]>;
}> = ({ level, fields }) => (
  <section className="space-y-4">
    <Header
      title="الأهداف والكفاءات"
      icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
    />
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
      <ReferenceBadge />
      <p className="mt-2 text-sm font-black">الكفاءة الشاملة: {level.levelName}</p>
    </div>
    {fields.map((field) => (
      <article key={field.fieldId} className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-black">
          {field.fieldName} · {field.fieldId}
        </h3>
        <p className="mt-2 text-sm font-bold text-slate-700">
          الكفاءة الختامية: {field.finalCompetency}
        </p>
        <div className="mt-3 space-y-2">
          {field.sessionsList.map((session) => (
            <div key={session.sessionNumber} className="rounded-xl bg-slate-50 p-3 text-xs">
              <span className="font-black text-purple-700">
                هدف مرجعي — {field.fieldId}__{session.sessionNumber}
              </span>
              <p className="mt-1 font-bold text-slate-700">{session.objective}</p>
            </div>
          ))}
        </div>
      </article>
    ))}
  </section>
);
const Coverage: React.FC<{
  rows: ReturnType<typeof buildKnowledgeCoverage>;
  category: CoverageResourceType | 'all';
  setCategory: (value: CoverageResourceType | 'all') => void;
}> = ({ rows, category, setCategory }) => (
  <section className="space-y-4">
    <Header
      title="تشخيص التغطية البيداغوجية"
      icon={<SlidersHorizontal className="h-5 w-5 text-amber-600" />}
    />
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm font-bold text-amber-900">
      تشخيص للقراءة فقط. العتبات الحالية محفوظة: EMPTY، LOW، ADEQUATE. لا يتم إنشاء أو تعديل محتوى
      من هذه الصفحة.
    </div>
    <select
      value={category}
      onChange={(e) => setCategory(e.target.value as CoverageResourceType | 'all')}
      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
    >
      <option value="all">كل أنواع الموارد</option>
      {Object.entries(categoryLabels).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map((row) => (
        <article key={row.fieldId} className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="font-black">{row.fieldName}</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {(Object.keys(categoryLabels) as CoverageResourceType[])
              .filter((key) => category === 'all' || key === category)
              .map((key) => (
                <div key={key} className="rounded-xl bg-slate-50 p-3">
                  <div className="font-bold text-slate-500">{categoryLabels[key]}</div>
                  <div className="mt-1 font-black">
                    {row[`${key}Count` as keyof typeof row] as number} ·{' '}
                    {statusLabels[row.statuses[key]]}
                  </div>
                </div>
              ))}
          </div>
        </article>
      ))}
    </div>
  </section>
);
const Overrides: React.FC<{ rows: AdminCurriculumOverride[]; loading: boolean }> = ({
  rows,
  loading,
}) => (
  <section className="space-y-4">
    <Header title="تخصيصات الأساتذة" icon={<InfoIcon className="h-5 w-5 text-indigo-600" />} />
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 text-sm font-bold text-indigo-900">
      هذه تخصيصات منفصلة عن مرجع المنصة. عرض النص المخصص هنا لا يغيّر الصياغة الرسمية أو بنية
      المنهاج.
    </div>
    {loading ? (
      <div className="rounded-2xl bg-white p-10 text-center text-slate-500">
        <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
        جارٍ تحميل التخصيصات...
      </div>
    ) : rows.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-500">
        لا توجد تخصيصات مسجلة.
      </div>
    ) : (
      <div className="space-y-3">
        {rows.map((row) => (
          <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-black">
                  {row.teacher
                    ? `${row.teacher.firstName} ${row.teacher.lastName}`
                    : 'أستاذ غير متوفر'}
                </h3>
                <p className="text-xs text-slate-500">
                  {row.teacher?.email || row.teacherId} · {row.levelId} · {row.kind}
                </p>
              </div>
              <span className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-700">
                TEACHER_OVERRIDE
              </span>
            </div>
            <p className="mt-2 text-xs font-bold text-slate-500">
              آخر تحديث: {new Date(row.updatedAt).toLocaleString('ar-DZ')} · الحالة: {row.status}
            </p>
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-[11px] text-slate-700">
              {JSON.stringify(row.data?.overrides || {}, null, 2)}
            </pre>
          </article>
        ))}
      </div>
    )}
  </section>
);
const Metadata = () => (
  <section className="space-y-4">
    <Header title="معلومات النسخة والمرجع" icon={<InfoIcon className="h-5 w-5 text-slate-600" />} />
    <div className="grid gap-3 md:grid-cols-2">
      <Info
        label="المصدر المرجعي"
        value="ملفات المنصة الرسمية: algerianCurriculum.ts و annualPlanReference.ts"
      />
      <Info label="حالة المرجع" value="مرجع رسمي — للعرض فقط" />
      <Info
        label="النسخة النشطة"
        value="غير متوفر كنموذج CurriculumVersion مستقل في المخطط الحالي."
      />
      <Info label="معلومات وزارة/وثيقة إضافية" value="لا تتوفر معلومات مرجعية إضافية." />
    </div>
  </section>
);
const Header: React.FC<{ title: string; icon: React.ReactNode }> = ({ title, icon }) => (
  <div className="flex items-center gap-2">
    <span>{icon}</span>
    <h2 className="text-xl font-black">{title}</h2>
  </div>
);
const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl bg-slate-50 p-3">
    <dt className="text-[11px] font-bold text-slate-400">{label}</dt>
    <dd className="mt-1 whitespace-pre-wrap text-xs font-bold text-slate-700">{value}</dd>
  </div>
);
const List: React.FC<{ title: string; items: string[] }> = ({ title, items }) => (
  <div className="rounded-2xl bg-slate-50 p-3">
    <h4 className="text-xs font-black text-slate-500">{title}</h4>
    <ul className="mt-2 space-y-1 text-xs font-bold text-slate-700">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>• {item}</li>
      ))}
    </ul>
  </div>
);
