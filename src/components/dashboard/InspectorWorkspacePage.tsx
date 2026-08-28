import React, { useState } from 'react';
import { Calendar, FileSpreadsheet, MessageSquare, ShieldCheck, Users } from 'lucide-react';
import {
  User,
  InspectorNote,
  InspectionVisit,
  DistrictBroadcast,
  DirectChatMessage,
  ClassRoom,
  Student,
  WeeklyScheduleSlot,
  LessonPlan,
  DailyNotebookEntry,
  CommunityResource,
} from '../../types/spex';
import { InspectorPendingAssignments } from './inspector/InspectorPendingAssignments';
import { InspectorTeacherList } from './inspector/InspectorTeacherList';
import { InspectorResourceValidationView } from './inspector/InspectorResourceValidationView';
import { InspectorReportsView } from './inspector/InspectorReportsView';
import { InspectorCurriculumAuditView } from './inspector/InspectorCurriculumAuditView';
import { InspectorBroadcastsView } from './inspector/InspectorBroadcastsView';
import { InspectorDirectChat } from './inspector/InspectorDirectChat';
import { InspectorPedagogicalProfile } from './inspector/InspectorPedagogicalProfile';
import { WeeklyTimetableView } from '../schedule/WeeklyTimetableView';
import { useTeacher } from '../../hooks/useTeacher';
import { useLessonPlans } from '../../hooks/useLessonPlans';
import { useReports } from '../../hooks/useReports';
import { fetchInspectorTeacherFollowUp, fetchInspectorWeeklyTimetable } from '../../services/api';
import {
  formatAcademicYearLabel,
  getAcademicYearOptions,
  getCurrentAcademicYear,
} from '../../services/academicYear';
import type { NavTab } from '../layout/Sidebar';

export type InspectorWorkspaceModule = Exclude<NavTab, 'inspector_portal'>;

interface Props {
  module: InspectorWorkspaceModule;
  inspector: User;
  teachers: User[];
  notes: InspectorNote[];
  visits: InspectionVisit[];
  broadcasts: DistrictBroadcast[];
  directMessages: DirectChatMessage[];
  classes: ClassRoom[];
  students: Student[];
  weeklySchedule: WeeklyScheduleSlot[];
  lessonPlans: LessonPlan[];
  dailyNotebook: DailyNotebookEntry[];
  communityResources: CommunityResource[];
  onNavigate: (tab: NavTab) => void;
  onRefreshTeachers: () => void;
  onAddNote: (note: Partial<InspectorNote>) => void | Promise<boolean | void>;
  onAddVisit: (visit: Partial<InspectionVisit>) => void | Promise<boolean | void>;
  onRefreshVisits: () => Promise<void>;
  onAddBroadcast: (broadcast: Partial<DistrictBroadcast>) => void;
  onAddDirectMessage: (msg: { receiverId: string; receiverName: string; message: string }) => void;
  onToggleApproveResource: (id: string) => void;
  teacherId?: string;
  onOpenTeacher?: (teacherId: string) => void;
  onNavigateWithTeacher?: (tab: NavTab, teacherId: string) => void;
}

export const InspectorWorkspacePage: React.FC<Props> = (props) => {
  const {
    module,
    inspector,
    teachers,
    notes,
    visits,
    broadcasts,
    directMessages,
    classes,
    students,
    weeklySchedule,
    lessonPlans,
    dailyNotebook,
  } = props;
  const [selectedTeacherId, setSelectedTeacherId] = useState(
    props.teacherId || teachers[0]?.id || ''
  );
  const [detail, setDetail] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [visitFilter, setVisitFilter] = useState('all');
  const [academicYearId, setAcademicYearId] = useState(getCurrentAcademicYear());
  const [inspectorWeeklySchedule, setInspectorWeeklySchedule] = useState<
    WeeklyScheduleSlot[] | null
  >(null);
  const selectedTeacher = teachers.find((teacher) => teacher.id === selectedTeacherId);
  const rosterTeachers = teachers
    .filter(
      (teacher: any) =>
        (institutionFilter === 'all' ||
          (teacher.schoolName || 'غير محددة') === institutionFilter) &&
        (visitFilter === 'all' ||
          (visitFilter === 'visited'
            ? (teacher.visitCount || 0) > 0
            : (teacher.visitCount || 0) === 0))
    )
    .sort((a: any, b: any) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'ar')
    );
  const { teacherClasses, totalStudentsTaught, maleCount, femaleCount, weeklyHoursCount } =
    useTeacher(teachers, selectedTeacherId, classes, students, weeklySchedule);
  const { filteredTeacherPlans } = useLessonPlans(lessonPlans, selectedTeacher, teachers);
  const { teacherVisits, teacherNotes } = useReports(visits, notes);

  const refreshTeacherDetail = React.useCallback(async () => {
    if (!props.teacherId) return;
    const data = await fetchInspectorTeacherFollowUp(props.teacherId);
    setDetail(data);
  }, [props.teacherId]);

  React.useEffect(() => {
    if (module !== 'inspector_teachers' || !props.teacherId) return;
    let active = true;
    void refreshTeacherDetail().catch(() => {
      if (active) setDetail(null);
    });
    return () => {
      active = false;
    };
  }, [module, props.teacherId, refreshTeacherDetail]);

  React.useEffect(() => {
    const handler = (event: Event) => {
      const teacherId = (event as CustomEvent<{ teacherId?: string }>).detail?.teacherId;
      if (teacherId && teacherId === props.teacherId)
        void refreshTeacherDetail().catch(() => undefined);
    };
    window.addEventListener('inspector-note-saved', handler);
    return () => window.removeEventListener('inspector-note-saved', handler);
  }, [props.teacherId, refreshTeacherDetail]);

  React.useEffect(() => {
    const handler = (event: Event) => {
      const teacherId = (event as CustomEvent<{ teacherId?: string }>).detail?.teacherId;
      if (teacherId && teacherId === props.teacherId)
        void refreshTeacherDetail().catch(() => undefined);
    };
    window.addEventListener('inspector-visit-saved', handler);
    return () => window.removeEventListener('inspector-visit-saved', handler);
  }, [props.teacherId, refreshTeacherDetail]);

  React.useEffect(() => {
    if (module !== 'inspector_teachers' || !props.teacherId) return;
    let active = true;
    setInspectorWeeklySchedule(null);
    void fetchInspectorWeeklyTimetable(props.teacherId, academicYearId)
      .then((result) => {
        if (active) setInspectorWeeklySchedule(result.slots as WeeklyScheduleSlot[]);
      })
      .catch(() => {
        if (active) setInspectorWeeklySchedule([]);
      });
    return () => {
      active = false;
    };
  }, [academicYearId, module, props.teacherId]);

  if (!inspector)
    return (
      <div className="rounded-3xl bg-amber-50 p-8 text-center font-bold text-amber-900">
        بيانات حساب المفتش غير مكتملة.
      </div>
    );

  if (module === 'inspector_teachers' && props.teacherId) {
    if (!detail)
      return (
        <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
          جارٍ تحميل ملف المتابعة...
        </div>
      );
    const teacher = detail.teacher;
    return (
      <div className="space-y-5 dir-rtl">
        <button
          onClick={() => props.onNavigate('inspector_teachers')}
          className="text-xs font-bold text-emerald-700"
        >
          ← العودة إلى أساتذة المقاطعة
        </button>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
          <h1 className="text-xl font-black text-slate-900">
            ملف متابعة: {teacher?.firstName} {teacher?.lastName}
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            {teacher?.schoolName || 'غير محددة'} · {teacher?.email || 'بريد غير مضاف'} ·{' '}
            {teacher?.phone || 'غير مضاف'}
          </p>
          <p className="mt-2 text-xs font-bold text-emerald-700">
            حالة المتابعة: {detail.visits?.length ? 'متابعة مستمرة' : 'لم تتم الزيارة بعد'}
          </p>
        </section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 text-center border border-slate-200">
            <b className="block text-2xl">{detail.classes?.length || 0}</b>
            <span className="text-xs text-slate-500">الأقسام</span>
          </div>
          <div className="rounded-2xl bg-white p-4 text-center border border-slate-200">
            <b className="block text-2xl">{detail.students?.length || 0}</b>
            <span className="text-xs text-slate-500">التلاميذ</span>
          </div>
          <div className="rounded-2xl bg-white p-4 text-center border border-slate-200">
            <b className="block text-2xl">{detail.visits?.length || 0}</b>
            <span className="text-xs text-slate-500">الزيارات</span>
          </div>
          <div className="rounded-2xl bg-white p-4 text-center border border-slate-200">
            <b className="block text-2xl">{detail.guidance?.length || 0}</b>
            <span className="text-xs text-slate-500">التوجيهات</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => props.onNavigateWithTeacher?.('inspector_visits', props.teacherId!)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
          >
            إضافة زيارة
          </button>
          <button
            onClick={() => props.onNavigateWithTeacher?.('inspector_guidance', props.teacherId!)}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white"
          >
            إضافة توجيه
          </button>
          <button
            onClick={() =>
              props.onNavigateWithTeacher?.('inspector_communication', props.teacherId!)
            }
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white"
          >
            مراسلة الأستاذ
          </button>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
          <h2 className="text-sm font-extrabold text-slate-900">التوزيع الأسبوعي والنصاب</h2>
          <label className="text-xs font-bold text-slate-600">
            السنة الدراسية
            <select
              value={academicYearId}
              onChange={(event) => setAcademicYearId(event.target.value)}
              className="mr-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1"
            >
              {getAcademicYearOptions().map((option) => (
                <option key={option} value={option}>
                  {formatAcademicYearLabel(option)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <WeeklyTimetableView
          scheduleSlots={(inspectorWeeklySchedule || weeklySchedule).filter(
            (slot) => slot.teacherId === teacher?.id
          )}
          teacherClasses={(detail.classes || []) as ClassRoom[]}
          academicYearId={academicYearId}
          currentUser={teacher as User}
          teacherName={`${teacher?.firstName || ''} ${teacher?.lastName || ''}`.trim()}
          schoolName={teacher?.schoolName || 'المؤسسة غير محددة'}
          readOnly
        />
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-black">الأقسام والتلاميذ</h2>
          {detail.classes?.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {detail.classes.map((item: any) => (
                <li key={item.id} className="flex justify-between border-b border-slate-100 pb-2">
                  <span>{item.name}</span>
                  <span className="text-slate-500">
                    {detail.students?.filter((student: any) => student.classId === item.id)
                      .length || 0}{' '}
                    تلميذ
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">لا توجد أقسام مسجلة.</p>
          )}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-black">الزيارات والتوجيهات</h2>
          {detail.visits?.length ? (
            <div className="mt-3 space-y-2">
              {detail.visits.map((visit: any) => (
                <div
                  key={visit.id || `${visit.visitDate}-${visit.lessonObservedTitle}`}
                  className="rounded-xl bg-slate-50 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">
                      {visit.visitDate || visit.createdAt || 'غير محدد'} —{' '}
                      {visit.visitType || 'زيارة'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {visit.lessonObservedTitle || 'معاينة بيداغوجية'}
                    </span>
                  </div>
                  {visit.positivePoints?.length ? (
                    <p className="mt-1 text-xs text-slate-600">
                      {visit.positivePoints.join(' • ')}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">لا توجد زيارات مسجلة لهذا الأستاذ.</p>
          )}
          {detail.guidance?.length ? (
            <p className="mt-2 text-sm">
              آخر توجيه: {detail.guidance[0]?.title || 'توجيه بيداغوجي'}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">لا توجد توجيهات أو ملاحظات مسجلة.</p>
          )}
        </section>
      </div>
    );
  }
  if (props.teacherId && !selectedTeacher)
    return (
      <div className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-800">
        تعذر فتح توجيه الأستاذ أو لم يعد ضمن الأساتذة المسندين إليك.
        <button
          onClick={() => props.onNavigate('inspector_teachers')}
          className="block mt-3 text-emerald-700 underline"
        >
          العودة إلى أساتذة المقاطعة
        </button>
      </div>
    );

  if (module === 'inspector_teachers') {
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
          <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Users className="text-emerald-600" />
            متابعة الأساتذة بالمقاطعة
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            المصدر: الإسنادات المقبولة المحفوظة في PostgreSQL.
          </p>
        </section>
        <InspectorPendingAssignments onAccepted={props.onRefreshTeachers} />
        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3">
          <select
            value={institutionFilter}
            onChange={(event) => setInstitutionFilter(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
          >
            <option value="all">كل المؤسسات</option>
            {Array.from(new Set(teachers.map((teacher) => teacher.schoolName || 'غير محددة'))).map(
              (name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              )
            )}
          </select>
          <select
            value={visitFilter}
            onChange={(event) => setVisitFilter(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
          >
            <option value="all">كل حالات الزيارة</option>
            <option value="visited">تمت زيارة</option>
            <option value="unvisited">لم تتم الزيارة</option>
          </select>
        </div>
        <InspectorTeacherList
          teachers={rosterTeachers}
          selectedTeacher={selectedTeacher}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSelectTeacher={(teacher) => setSelectedTeacherId(teacher.id)}
          onOpenTeacher={(teacher) => props.onOpenTeacher?.(teacher.id)}
        />
        {teachers.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
            لا يوجد أساتذة مسندون إليك حالياً.
          </div>
        )}
        {selectedTeacher && (
          <InspectorPedagogicalProfile
            inspector={inspector}
            selectedTeacher={selectedTeacher}
            teacherClasses={teacherClasses}
            totalStudentsTaught={totalStudentsTaught}
            maleCount={maleCount}
            femaleCount={femaleCount}
            weeklyHoursCount={weeklyHoursCount}
            teacherSubTab="annual_plan"
            onSetTeacherSubTab={() => undefined}
            selectedInspectorLevelId=""
            onSetSelectedInspectorLevelId={() => undefined}
            teacherLessonPlans={filteredTeacherPlans}
            teacherNotebook={dailyNotebook.filter((item) => item.teacherId === selectedTeacher.id)}
            teacherScheduleSlots={weeklySchedule.filter(
              (item) => !item.teacherId || item.teacherId === selectedTeacher.id
            )}
            visits={teacherVisits(selectedTeacher.id)}
            notes={teacherNotes(selectedTeacher.id)}
            onOpenVisitModal={() => props.onNavigate('inspector_visits')}
            onOpenNoteModal={() => props.onNavigate('inspector_visits')}
            onSelectLessonPlanModal={() => undefined}
          />
        )}
      </div>
    );
  }

  if (module === 'inspector_approvals')
    return (
      <section className="space-y-5">
        <h1 className="text-lg font-black flex items-center gap-2">
          <ShieldCheck className="text-emerald-600" />
          مركز اعتمادات الموارد
        </h1>
        <InspectorResourceValidationView
          resources={props.communityResources}
          teachers={teachers}
          onToggleApproveResource={props.onToggleApproveResource}
          onSendNoteToTeacher={(teacherId, teacherName, title, content) =>
            props.onAddNote({
              teacherId,
              teacherName,
              title,
              content,
              inspectorId: inspector.id,
              status: 'جديدة',
              priority: 'عادية',
              moduleRef: 'general',
            })
          }
        />
      </section>
    );
  if (module === 'inspector_visits')
    return (
      <section className="space-y-5">
        <h1 className="text-lg font-black flex items-center gap-2">
          <FileSpreadsheet className="text-emerald-600" />
          تقارير وتوجيهات المعاينات
        </h1>
        <InspectorReportsView
          visits={visits}
          teachers={teachers}
          inspector={inspector}
          teacherId={props.teacherId}
          onAddVisit={props.onAddVisit}
          onVisitSaved={async (teacherId) => {
            await props.onRefreshVisits();
            await props.onRefreshTeachers();
            window.dispatchEvent(
              new CustomEvent('inspector-visit-saved', { detail: { teacherId } })
            );
          }}
          onClearTeacherContext={() => props.onNavigate('inspector_visits')}
        />
      </section>
    );
  if (module === 'inspector_curriculum')
    return (
      <section className="space-y-5">
        <h1 className="text-lg font-black flex items-center gap-2">
          <FileSpreadsheet className="text-emerald-600" />
          التدقيق البيداغوجي للمنهاج
        </h1>
        <InspectorCurriculumAuditView
          teachers={teachers}
          lessonPlans={lessonPlans}
          onSendNoteToTeacher={(teacherId, teacherName, title, content) =>
            props.onAddNote({
              teacherId,
              teacherName,
              title,
              content,
              inspectorId: inspector.id,
              status: 'جديدة',
              priority: 'عادية',
              moduleRef: 'general',
            })
          }
        />
      </section>
    );
  if (module === 'inspector_guidance')
    return (
      <section className="space-y-5">
        <h1 className="text-lg font-black flex items-center gap-2">
          <Calendar className="text-emerald-600" />
          التوجيهات والندوات التربوية
        </h1>
        <InspectorBroadcastsView
          broadcasts={broadcasts}
          inspector={inspector}
          teacherContext={selectedTeacher || null}
          onAddNote={props.onAddNote}
          onNoteSaved={async (teacherId) => {
            if (props.teacherId === teacherId) await refreshTeacherDetail();
            window.dispatchEvent(
              new CustomEvent('inspector-note-saved', { detail: { teacherId } })
            );
          }}
          onClearTeacherContext={() => props.onNavigate('inspector_guidance')}
          onAddBroadcast={props.onAddBroadcast}
        />
      </section>
    );
  if (module === 'inspector_communication')
    return (
      <section className="space-y-5">
        <h1 className="text-lg font-black flex items-center gap-2">
          <MessageSquare className="text-emerald-600" />
          التواصل المباشر مع الأستاذ
        </h1>
        {selectedTeacher ? (
          <InspectorDirectChat
            inspector={inspector}
            selectedTeacher={selectedTeacher}
            teacherId={props.teacherId}
            chatMessages={directMessages}
            onSendMessage={(message) =>
              props.onAddDirectMessage({
                receiverId: selectedTeacher.id,
                receiverName: `${selectedTeacher.firstName} ${selectedTeacher.lastName}`.trim(),
                message,
              })
            }
          />
        ) : (
          <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
            لا توجد محادثات بعد.
          </p>
        )}
      </section>
    );
  return null;
};
