/**
 * SPEX - Annual Plan View Component
 * المخطط السنوي الرسمي: الكفاءة الشاملة، الكفاءات الختامية، مركبات الكفاءة، الموارد
 * التعلمية، المؤشرات، والحجم الساعي لكل مقطع تعليمي. لا يحتوي أبداً على تواريخ تنفيذ.
 */

import React, { useState } from 'react';
import {
  Calendar,
  Printer,
  Layers,
  Clock,
  BookOpen,
  ArrowLeft,
  CalendarCheck,
  Target,
  Save,
  Pencil,
  ShieldCheck,
  Loader2,
  School,
  User as UserIcon,
  GraduationCap,
  RotateCcw,
  ChevronLeft
} from 'lucide-react';
import {
  PE_LEVELS,
  COMPLETE_ANNUAL_CURRICULUM,
  OVERALL_COMPETENCY_BY_LEVEL,
  getFieldAllocatedHours
} from '../../data/algerianCurriculum';
import { User } from '../../types/spex';
import { useCurriculumOverrides } from '../../hooks/useCurriculumOverrides';

const ACADEMIC_YEAR_LABEL = '2025 / 2026';

interface AnnualPlanViewProps {
  currentUser: User;
  onNavigateToAnnualSchedule?: () => void;
  /** فتح الصفحة التفصيلية لمقطع تعليمي (وحدة المقاطع التعليمية) عند النقر على ميدان */
  onOpenLearningSection?: (levelId: string, fieldId: string) => void;
}

/** حقل نصوص قابل للتعديل كمصفوفة أسطر (مركبات الكفاءة / الموارد / المؤشرات) */
function EditableList({
  officialValues,
  overrideValues,
  isEditing,
  onChange,
  accentClass
}: {
  officialValues: string[];
  overrideValues: string[] | undefined;
  isEditing: boolean;
  onChange: (next: string[]) => void;
  accentClass: string;
}) {
  const displayValues = overrideValues && overrideValues.length > 0 ? overrideValues : officialValues;

  if (isEditing) {
    return (
      <textarea
        value={displayValues.join('\n')}
        onChange={(e) => onChange(e.target.value.split('\n'))}
        rows={Math.max(3, displayValues.length)}
        placeholder="سطر واحد لكل عنصر..."
        className="w-full px-2.5 py-2 bg-white rounded-lg border border-blue-300 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-y"
      />
    );
  }

  return (
    <ul className="text-xs text-slate-700 space-y-1 pt-1">
      {displayValues.filter(Boolean).map((v, i) => (
        <li key={i} className="flex items-start gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${accentClass} shrink-0 mt-1.5`} />
          <span>{v}</span>
        </li>
      ))}
    </ul>
  );
}

export const AnnualPlanView: React.FC<AnnualPlanViewProps> = ({
  currentUser,
  onNavigateToAnnualSchedule,
  onOpenLearningSection
}) => {
  const [selectedLevelId, setSelectedLevelId] = useState<string>('lvl_p1');
  const {
    record: componentsRecord,
    values: fieldOverrides,
    setValue: setFieldOverride,
    restore: restoreField,
    save: saveOverrides,
    isSaving,
    isLockedForTeacher
  } = useCurriculumOverrides({ currentUser, levelId: selectedLevelId, kind: 'plan_components' });
  const [isEditing, setIsEditing] = useState(false);

  const selectedLevel = PE_LEVELS.find((l) => l.id === selectedLevelId) || PE_LEVELS[0];
  const levelCurriculum = COMPLETE_ANNUAL_CURRICULUM[selectedLevelId] || COMPLETE_ANNUAL_CURRICULUM['lvl_p1'];
  const overallCompetency = OVERALL_COMPETENCY_BY_LEVEL[selectedLevelId] || OVERALL_COMPETENCY_BY_LEVEL['lvl_p1'];

  const canEdit = currentUser.role === 'teacher' && !isLockedForTeacher;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 print:space-y-3">
      {/* Printable Header */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3 mb-4 space-y-1">
        <h3 className="text-sm font-black text-slate-900">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
        <h4 className="text-xs font-bold text-slate-700">وزارة التربية الوطنية - {currentUser.schoolName || 'المدرسة الابتدائية'}</h4>
        <h5 className="text-xs font-extrabold text-blue-900 mt-1">
          المخطط السنوي لبناء التعلمات والكفاءات الختامية ({levelCurriculum.levelName})
        </h5>
        <div className="flex justify-between text-[11px] font-bold text-slate-600 pt-2 px-2">
          <span>الأستاذ(ة): {currentUser.firstName} {currentUser.lastName}</span>
          <span>الموسم الدراسي: {ACADEMIC_YEAR_LABEL}</span>
        </div>
      </div>

      {/* Header & Main Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
              المرجع البيداغوجي الرسمي ({ACADEMIC_YEAR_LABEL})
            </span>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg">
              منهاج الابتدائي المعتمد
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            <span>المخطط السنوي لبناء التعلمات</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            وثيقة التخطيط البيداغوجي الرسمية — لا تتضمن تواريخ تنفيذ الحصص (انظر التوزيع السنوي لبرمجة التواريخ)
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          {canEdit && (
            isEditing ? (
              <button
                onClick={async () => {
                  await saveOverrides();
                  setIsEditing(false);
                }}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>حفظ التخصيصات</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-2xl shadow-xs transition-all cursor-pointer"
              >
                <Pencil className="w-4 h-4 text-blue-600" />
                <span>تعديل مركبات/موارد/مؤشرات الكفاءة</span>
              </button>
            )
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>طباعة المخطط السنوي</span>
          </button>
        </div>
      </div>

      {/* Identification Bar: Academic Year / School / Teacher / Grade */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs print:hidden">
        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
          <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
          <div>
            <span className="block text-slate-500 font-bold">السنة الدراسية</span>
            <span className="block font-extrabold text-slate-900">{ACADEMIC_YEAR_LABEL}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
          <School className="w-4 h-4 text-blue-600 shrink-0" />
          <div>
            <span className="block text-slate-500 font-bold">المدرسة</span>
            <span className="block font-extrabold text-slate-900 truncate">{currentUser.schoolName || 'غير محددة'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
          <UserIcon className="w-4 h-4 text-blue-600 shrink-0" />
          <div>
            <span className="block text-slate-500 font-bold">الأستاذ(ة)</span>
            <span className="block font-extrabold text-slate-900 truncate">{currentUser.firstName} {currentUser.lastName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
          <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
          <div>
            <span className="block text-slate-500 font-bold">المستوى الدراسي</span>
            <span className="block font-extrabold text-slate-900">{selectedLevel.name}</span>
          </div>
        </div>
      </div>

      {/* Inspector Proposal Status Banner */}
      {componentsRecord && componentsRecord.status !== 'draft' && (
        <div
          className={`rounded-2xl p-4 border flex items-center gap-3 text-xs font-bold print:hidden ${
            componentsRecord.status === 'approved'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <span>
            {componentsRecord.status === 'approved'
              ? 'تم اعتماد التخصيصات المقترحة من مفتش المقاطعة، وهي المعتمدة حالياً في هذا المخطط.'
              : 'يوجد اقتراح من مفتش المقاطعة بانتظار اعتماده.'}
          </span>
        </div>
      )}

      {/* Direct Pedagogical Link Banner to Schedule */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 text-white rounded-3xl p-5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-teal-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 shrink-0">
            <CalendarCheck className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-amber-300 block">الترابط البيداغوجي بين المخطط والتوزيع</span>
            <h3 className="text-sm sm:text-base font-extrabold text-white">
              برمجة تواريخ تنفيذ الحصص تكون حصرياً من التوزيع السنوي
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              هذا المخطط وثيقة بيداغوجية فقط؛ التواريخ والتأجيل والتفادي الآلي للعطل يُدار من وحدة التوزيع السنوي
            </p>
          </div>
        </div>

        {onNavigateToAnnualSchedule && (
          <button
            onClick={onNavigateToAnnualSchedule}
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-2 shrink-0 self-start md:self-auto"
          >
            <span>عرض التوزيع السنوي للحصص</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Level Selector Tabs */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden">
        <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>اختر المستوى الدراسي (الصف) لعرض المخطط السنوي:</span>
        </span>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {PE_LEVELS.map((lvl) => {
            const isSelected = lvl.id === selectedLevelId;
            return (
              <button
                key={lvl.id}
                onClick={() => { setSelectedLevelId(lvl.id); setIsEditing(false); }}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-md font-extrabold'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {lvl.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Overall Competency Banner (Grade → Overall Competency) */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-3xl shadow-md border border-blue-800 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold text-amber-300 bg-white/10 px-3 py-1 rounded-full border border-white/10 self-start">
            المستوى: {levelCurriculum.levelName}
          </span>
          <span className="text-xs font-bold text-slate-200">
            الحجم الساعي الإجمالي: {levelCurriculum.totalSessions} حصة
          </span>
        </div>
        <span className="text-[11px] font-bold text-blue-200 bg-white/10 px-2.5 py-1 rounded-lg inline-block">
          الكفاءة الشاملة للمستوى (Overall Competency)
        </span>
        <h3 className="text-base font-extrabold text-white leading-relaxed">« {overallCompetency} »</h3>
      </div>

      {/* 3 Final Competencies / Domains (each with exactly one Learning Section) */}
      <div className="space-y-6">
        {Object.entries(levelCurriculum.fields).map(([fieldKey, field]) => {
          const ov = fieldOverrides[field.fieldId];
          const hasOverride = Boolean(ov && (ov.components?.length || ov.resources?.length || ov.indicators?.length));

          return (
            <div
              key={fieldKey}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4"
            >
              {/* Domain / Learning Section Title Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">الميدان (Domain)</span>
                    <h3 className="text-base font-black text-slate-900">{field.fieldName}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    الحجم الساعي المرصود: {getFieldAllocatedHours(field)} حصة
                  </span>
                  {onOpenLearningSection && (
                    <button
                      onClick={() => onOpenLearningSection(selectedLevelId, field.fieldId)}
                      className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>فتح المقطع التعليمي</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Final Competency */}
              <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 space-y-2">
                <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                  الكفاءة الختامية للميدان (غير قابلة للتعديل)
                </span>
                <p className="text-xs sm:text-sm font-extrabold text-slate-900 leading-relaxed pt-1">
                  « {field.finalCompetency} »
                </p>
              </div>

              {/* Editable: Components / Resources / Indicators */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Competency Components */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                      مركبات الكفاءة
                    </span>
                    {ov?.components?.length ? (
                      <button
                        onClick={() => restoreField(field.fieldId)}
                        title="استرجاع الصياغة الرسمية"
                        className="text-[10px] font-bold text-slate-500 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" /> استرجاع
                      </button>
                    ) : null}
                  </div>
                  <EditableList
                    officialValues={field.criteria}
                    overrideValues={ov?.components}
                    isEditing={isEditing}
                    accentClass="bg-emerald-600"
                    onChange={(next) => setFieldOverride(field.fieldId, { components: next })}
                  />
                </div>

                {/* Learning Resources */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-md">
                      الموارد التعلمية
                    </span>
                    {ov?.resources?.length ? (
                      <button
                        onClick={() => restoreField(field.fieldId)}
                        title="استرجاع الصياغة الرسمية"
                        className="text-[10px] font-bold text-slate-500 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" /> استرجاع
                      </button>
                    ) : null}
                  </div>
                  <EditableList
                    officialValues={field.suggestedTools || []}
                    overrideValues={ov?.resources}
                    isEditing={isEditing}
                    accentClass="bg-teal-600"
                    onChange={(next) => setFieldOverride(field.fieldId, { resources: next })}
                  />
                </div>

                {/* Performance Indicators */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md">
                      مؤشرات الأداء
                    </span>
                    {ov?.indicators?.length ? (
                      <button
                        onClick={() => restoreField(field.fieldId)}
                        title="استرجاع الصياغة الرسمية"
                        className="text-[10px] font-bold text-slate-500 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" /> استرجاع
                      </button>
                    ) : null}
                  </div>
                  <EditableList
                    officialValues={field.indicators}
                    overrideValues={ov?.indicators}
                    isEditing={isEditing}
                    accentClass="bg-indigo-600"
                    onChange={(next) => setFieldOverride(field.fieldId, { indicators: next })}
                  />
                </div>
              </div>

              {hasOverride && (
                <p className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 inline-flex items-center gap-1.5">
                  <Pencil className="w-3 h-3" /> تحتوي هذه الخانة على صياغة معدَّلة من الأستاذ
                </p>
              )}

              {/* Learning Section link (objectives + lesson sequence live there — no dates here) */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  الأهداف التعلمية وسيرورة الحصص ({field.sessionsCount} حصص) متوفرة في المقاطع التعليمية
                </span>
                {onOpenLearningSection && (
                  <button
                    onClick={() => onOpenLearningSection(selectedLevelId, field.fieldId)}
                    className="text-blue-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Target className="w-3.5 h-3.5" />
                    عرض المقطع التعليمي التفصيلي
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Print Footer / Signatures - Visible in Print Only */}
      <div className="hidden print:grid grid-cols-2 gap-8 text-xs font-bold text-slate-800 pt-8 border-t border-slate-300 mt-6">
        <div className="text-center space-y-12">
          <p>توقيع وختم أستاذ التربية البدنية والرياضية</p>
          <p className="text-slate-400">......................................................</p>
        </div>
        <div className="text-center space-y-12">
          <p>توقيع وختم مفتش التربية البدنية والرياضية</p>
          <p className="text-slate-400">......................................................</p>
        </div>
      </div>
    </div>
  );
};
