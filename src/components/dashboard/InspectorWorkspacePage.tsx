import React, { useState } from 'react';
import { Calendar, FileSpreadsheet, MessageSquare, ShieldCheck, Users } from 'lucide-react';
import { User, InspectorNote, InspectionVisit, DistrictBroadcast, DirectChatMessage, ClassRoom, Student, WeeklyScheduleSlot, LessonPlan, DailyNotebookEntry, CommunityResource } from '../../types/spex';
import { InspectorPendingAssignments } from './inspector/InspectorPendingAssignments';
import { InspectorTeacherList } from './inspector/InspectorTeacherList';
import { InspectorResourceValidationView } from './inspector/InspectorResourceValidationView';
import { InspectorReportsView } from './inspector/InspectorReportsView';
import { InspectorCurriculumAuditView } from './inspector/InspectorCurriculumAuditView';
import { InspectorBroadcastsView } from './inspector/InspectorBroadcastsView';
import { InspectorDirectChat } from './inspector/InspectorDirectChat';
import { InspectorPedagogicalProfile } from './inspector/InspectorPedagogicalProfile';
import { useTeacher } from '../../hooks/useTeacher';
import { useLessonPlans } from '../../hooks/useLessonPlans';
import { useReports } from '../../hooks/useReports';
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
  onAddNote: (note: Partial<InspectorNote>) => void;
  onAddVisit: (visit: Partial<InspectionVisit>) => void;
  onAddBroadcast: (broadcast: Partial<DistrictBroadcast>) => void;
  onAddDirectMessage: (msg: { receiverId: string; receiverName: string; message: string }) => void;
  onToggleApproveResource: (id: string) => void;
}

export const InspectorWorkspacePage: React.FC<Props> = (props) => {
  const { module, inspector, teachers, notes, visits, broadcasts, directMessages, classes, students, weeklySchedule, lessonPlans, dailyNotebook } = props;
  const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const selectedTeacher = teachers.find((teacher) => teacher.id === selectedTeacherId);
  const { teacherClasses, totalStudentsTaught, maleCount, femaleCount, weeklyHoursCount } = useTeacher(teachers, selectedTeacherId, classes, students, weeklySchedule);
  const { filteredTeacherPlans } = useLessonPlans(lessonPlans, selectedTeacher, teachers);
  const { teacherVisits, teacherNotes } = useReports(visits, notes);

  if (!inspector) return <div className="rounded-3xl bg-amber-50 p-8 text-center font-bold text-amber-900">بيانات حساب المفتش غير مكتملة.</div>;

  if (module === 'inspector_teachers') {
    return <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs"><h1 className="text-lg font-black text-slate-900 flex items-center gap-2"><Users className="text-emerald-600" />متابعة الأساتذة بالمقاطعة</h1><p className="text-xs text-slate-500 mt-1">المصدر: الإسنادات المقبولة المحفوظة في PostgreSQL.</p></section>
      <InspectorPendingAssignments onAccepted={props.onRefreshTeachers} />
      <InspectorTeacherList teachers={teachers} selectedTeacher={selectedTeacher} searchTerm={searchTerm} onSearchChange={setSearchTerm} onSelectTeacher={(teacher) => setSelectedTeacherId(teacher.id)} />
      {teachers.length === 0 && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">لا يوجد أساتذة مسندون إليك حالياً.</div>}
      {selectedTeacher && <InspectorPedagogicalProfile inspector={inspector} selectedTeacher={selectedTeacher} teacherClasses={teacherClasses} totalStudentsTaught={totalStudentsTaught} maleCount={maleCount} femaleCount={femaleCount} weeklyHoursCount={weeklyHoursCount} teacherSubTab="annual_plan" onSetTeacherSubTab={() => undefined} selectedInspectorLevelId="" onSetSelectedInspectorLevelId={() => undefined} teacherLessonPlans={filteredTeacherPlans} teacherNotebook={dailyNotebook.filter((item) => item.teacherId === selectedTeacher.id)} teacherScheduleSlots={weeklySchedule.filter((item) => !item.teacherId || item.teacherId === selectedTeacher.id)} visits={teacherVisits(selectedTeacher.id)} notes={teacherNotes(selectedTeacher.id)} onOpenVisitModal={() => props.onNavigate('inspector_visits')} onOpenNoteModal={() => props.onNavigate('inspector_visits')} onSelectLessonPlanModal={() => undefined} />}
    </div>;
  }

  if (module === 'inspector_approvals') return <section className="space-y-5"><h1 className="text-lg font-black flex items-center gap-2"><ShieldCheck className="text-emerald-600" />مركز اعتمادات الموارد</h1><InspectorResourceValidationView resources={props.communityResources} teachers={teachers} onToggleApproveResource={props.onToggleApproveResource} onSendNoteToTeacher={(teacherId, teacherName, title, content) => props.onAddNote({ teacherId, teacherName, title, content, inspectorId: inspector.id, status: 'جديدة', priority: 'عادية', moduleRef: 'general' })} /></section>;
  if (module === 'inspector_visits') return <section className="space-y-5"><h1 className="text-lg font-black flex items-center gap-2"><FileSpreadsheet className="text-emerald-600" />تقارير وتوجيهات المعاينات</h1><InspectorReportsView visits={visits} teachers={teachers} inspector={inspector} onAddVisit={props.onAddVisit} /></section>;
  if (module === 'inspector_curriculum') return <section className="space-y-5"><h1 className="text-lg font-black flex items-center gap-2"><FileSpreadsheet className="text-emerald-600" />التدقيق البيداغوجي للمنهاج</h1><InspectorCurriculumAuditView teachers={teachers} lessonPlans={lessonPlans} onSendNoteToTeacher={(teacherId, teacherName, title, content) => props.onAddNote({ teacherId, teacherName, title, content, inspectorId: inspector.id, status: 'جديدة', priority: 'عادية', moduleRef: 'general' })} /></section>;
  if (module === 'inspector_guidance') return <section className="space-y-5"><h1 className="text-lg font-black flex items-center gap-2"><Calendar className="text-emerald-600" />التوجيهات والندوات التربوية</h1><InspectorBroadcastsView broadcasts={broadcasts} inspector={inspector} onAddBroadcast={props.onAddBroadcast} /></section>;
  if (module === 'inspector_communication') return <section className="space-y-5"><h1 className="text-lg font-black flex items-center gap-2"><MessageSquare className="text-emerald-600" />التواصل المباشر مع الأستاذ</h1>{selectedTeacher ? <InspectorDirectChat inspector={inspector} selectedTeacher={selectedTeacher} chatMessages={directMessages} onSendMessage={(message) => props.onAddDirectMessage({ receiverId: selectedTeacher.id, receiverName: `${selectedTeacher.firstName} ${selectedTeacher.lastName}`.trim(), message })} /> : <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">لا توجد محادثات بعد.</p>}</section>;
  return null;
};
