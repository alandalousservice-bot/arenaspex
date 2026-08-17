import React, { useEffect, useState } from 'react';
import { Building2, MapPin, School, ShieldCheck, CheckCircle2, PlusCircle, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import {
  fetchDirectorates,
  fetchMunicipalities,
  fetchInspectionDistricts,
  fetchSchools,
  suggestMunicipality,
  suggestSchool,
  saveTeacherProfessionalData
} from '../../services/api';

import { User } from '../../types/spex';

interface Option {
  id: string;
  name: string;
}

interface TeacherProfessionalDataFormProps {
  onCompleted: (result: { user: User; assignment: unknown; inspector: unknown }) => void;
}

const STEPS = ['المديرية', 'البلدية', 'المؤسسة', 'المقاطعة'] as const;

/**
 * نموذج استكمال البيانات المهنية للأستاذ — أربع خطوات وفق المواصفة:
 * مديرية التربية ← بلدية العمل ← المؤسسة التعليمية ← المقاطعة التفتيشية.
 * عند الحفظ، يستدعي /api/teacher/professional-data الذي يشغّل الإسناد التلقائي
 * فوراً في الخادم، ويعرض النتيجة (مفتش تم ربطه، أو "بانتظار مفتش").
 */
export const TeacherProfessionalDataForm: React.FC<TeacherProfessionalDataFormProps> = ({ onCompleted }) => {
  const [step, setStep] = useState(0);

  const [directorates, setDirectorates] = useState<Option[]>([]);
  const [municipalities, setMunicipalities] = useState<Option[]>([]);
  const [schools, setSchools] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);

  const [directorateId, setDirectorateId] = useState('');
  const [municipalityId, setMunicipalityId] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [districtId, setDistrictId] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [resultMessage, setResultMessage] = useState('');

  const [suggestMode, setSuggestMode] = useState<'municipality' | 'school' | null>(null);
  const [suggestName, setSuggestName] = useState('');
  const [suggestSent, setSuggestSent] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetchDirectorates();
      if (res.success) setDirectorates(res.directorates);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!directorateId) return;
    setMunicipalityId('');
    setInstitutionId('');
    setDistrictId('');
    setSchools([]);
    (async () => {
      setLoading(true);
      const [muniRes, distRes] = await Promise.all([
        fetchMunicipalities(directorateId),
        fetchInspectionDistricts(directorateId)
      ]);
      if (muniRes.success) setMunicipalities(muniRes.municipalities);
      if (distRes.success) setDistricts(distRes.districts);
      setLoading(false);
    })();
  }, [directorateId]);

  useEffect(() => {
    if (!municipalityId) return;
    setInstitutionId('');
    (async () => {
      setLoading(true);
      const res = await fetchSchools(municipalityId);
      if (res.success) setSchools(res.schools);
      setLoading(false);
    })();
  }, [municipalityId]);

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const canGoNext =
    (step === 0 && !!directorateId) ||
    (step === 1 && !!municipalityId) ||
    (step === 2 && !!institutionId) ||
    step === 3;

  const handleSuggestSubmit = async () => {
    if (!suggestName.trim()) return;
    if (suggestMode === 'municipality') {
      const res = await suggestMunicipality(suggestName.trim(), directorateId);
      if (res.success) setSuggestSent(true);
      else setError(res.error || 'تعذر إرسال الاقتراح.');
    } else if (suggestMode === 'school') {
      const res = await suggestSchool(suggestName.trim(), municipalityId);
      if (res.success) setSuggestSent(true);
      else setError(res.error || 'تعذر إرسال الاقتراح.');
    }
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    const res = await saveTeacherProfessionalData({ directorateId, municipalityId, institutionId, districtId });
    setSaving(false);
    if (!res.success) {
      setError(res.error || 'تعذر حفظ البيانات.');
      return;
    }
    setResultMessage(res.message || '');
    onCompleted({ user: res.user, assignment: res.assignment, inspector: res.inspector });
  };

  const renderSuggestBox = (mode: 'municipality' | 'school', label: string) => (
    <div className="mt-3">
      {suggestMode === mode ? (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-3">
          {suggestSent ? (
            <p className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> تم إرسال اقتراحك، بانتظار اعتماد الإدارة.
            </p>
          ) : (
            <>
              <input
                value={suggestName}
                onChange={(e) => setSuggestName(e.target.value)}
                placeholder={`اكتب اسم ${label} المقترحة`}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSuggestSubmit}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  إرسال الاقتراح
                </button>
                <button
                  onClick={() => setSuggestMode(null)}
                  className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
                >
                  إلغاء
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <button
          onClick={() => {
            setSuggestMode(mode);
            setSuggestSent(false);
            setSuggestName('');
          }}
          className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          <PlusCircle className="h-4 w-4" /> لم أجد {label}؟ اقترح إضافتها
        </button>
      )}
    </div>
  );

  if (resultMessage) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm">
        <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
        <h3 className="mb-2 text-lg font-bold text-gray-800">تم استكمال بياناتك المهنية</h3>
        <p className="text-sm leading-relaxed text-gray-600">{resultMessage}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" dir="rtl">
      <h3 className="mb-1 text-lg font-bold text-gray-800">استكمال البيانات المهنية</h3>
      <p className="mb-5 text-sm text-gray-500">لربطك تلقائياً بمفتش التربية البدنية والرياضية المختص.</p>

      <div className="mb-5 flex items-center gap-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                i <= step ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i + 1}
            </div>
            {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 ${i < step ? 'bg-emerald-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>
      <p className="mb-4 text-sm font-semibold text-emerald-700">{STEPS[step]}</p>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <>
          {step === 0 && (
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                <Building2 className="h-4 w-4" /> مديرية التربية
              </label>
              <select
                value={directorateId}
                onChange={(e) => setDirectorateId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">اختر مديرية التربية...</option>
                {directorates.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {step === 1 && (
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                <MapPin className="h-4 w-4" /> بلدية العمل
              </label>
              <select
                value={municipalityId}
                onChange={(e) => setMunicipalityId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">اختر البلدية...</option>
                {municipalities.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {renderSuggestBox('municipality', 'البلدية')}
            </div>
          )}

          {step === 2 && (
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                <School className="h-4 w-4" /> المؤسسة التعليمية
              </label>
              <select
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">اختر المؤسسة...</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {renderSuggestBox('school', 'المؤسسة')}
            </div>
          )}

          {step === 3 && (
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                <ShieldCheck className="h-4 w-4" /> المقاطعة التفتيشية
              </label>
              <select
                value={districtId}
                onChange={(e) => setDistrictId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">اختر المقاطعة التي تتبع لها مؤسستك...</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={goBack}
          disabled={step === 0}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-gray-500 disabled:opacity-0"
        >
          <ArrowRight className="h-4 w-4" /> السابق
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={goNext}
            disabled={!canGoNext}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            التالي <ArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={!districtId || saving}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            حفظ البيانات
          </button>
        )}
      </div>
    </div>
  );
};
