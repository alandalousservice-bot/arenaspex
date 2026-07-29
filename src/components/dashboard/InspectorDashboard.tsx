/**
 * SPEX - Inspector Portal / Dashboard Component
 * بوابة المفتش البيداغوجي: متابعة الأساتذة، معاينة التوزيع الأسبوعي، المخطط البيداغوجي والبرنامج السنوي، 
 * المذكرات البيداغوجية، العدد الكلي للتلاميذ وساعات العمل، تسجيل الزيارات، وإرسال التوجيهات الرسمية.
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Building2,
  FileCheck2,
  Plus,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  BookOpen,
  Award,
  Calendar,
  Sparkles,
  Radio,
  MessageSquare,
  Users,
  Megaphone,
  X,
  Clock,
  Layers,
  BarChart3,
  ListChecks,
  Eye,
  GraduationCap,
  TrendingUp,
  MapPin,
  CheckSquare,
  ChevronLeft,
  CalendarCheck
} from 'lucide-react';
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
  DailyNotebookEntry
} from '../../types/spex';
import {
  PE_LEVELS,
  PE_FIELDS,
  COMPLETE_ANNUAL_CURRICULUM
} from '../../data/algerianCurriculum';

interface InspectorDashboardProps {
  inspector: User;
  teachers: User[];
  notes: InspectorNote[];
  visits: InspectionVisit[];
  broadcasts?: DistrictBroadcast[];
  directMessages?: DirectChatMessage[];
  classes?: ClassRoom[];
  students?: Student[];
  weeklySchedule?: WeeklyScheduleSlot[];
  lessonPlans?: LessonPlan[];
  dailyNotebook?: DailyNotebookEntry[];
  onAddNote: (note: Partial<InspectorNote>) => void;
  onAddVisit: (visit: Partial<InspectionVisit>) => void;
  onAddBroadcast?: (broadcast: Partial<DistrictBroadcast>) => void;
  onAddDirectMessage?: (msg: { receiverId: string; receiverName: string; message: string }) => void;
}

export const InspectorDashboard: React.FC<InspectorDashboardProps> = ({
  inspector,
  teachers,
  notes,
  visits,
  broadcasts = [],
  directMessages = [],
  classes = [],
  students = [],
  weeklySchedule = [],
  lessonPlans = [],
  dailyNotebook = [],
  onAddNote,
  onAddVisit,
  onAddBroadcast,
  onAddDirectMessage
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [selectedLessonPlanModal, setSelectedLessonPlanModal] = useState<LessonPlan | null>(null);

  // Main Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'chat'>('overview');

  // Teacher Inspection Sub-Tabs
  const [teacherSubTab, setTeacherSubTab] = useState<'annual_plan' | 'schedule' | 'lesson_plans' | 'students' | 'visits'>('annual_plan');

  // Broadcast state
  const [bcTitle, setBcTitle] = useState('');
  const [bcContent, setBcContent] = useState('');
  const [bcCategory, setBcCategory] = useState<'دعوة_اجتماع' | 'توجيه_بيداغوجي' | 'إشعار_مستعجل' | 'ندوة_تكوينية'>('دعوة_اجتماع');

  // Direct chat input
  const [chatMessageText, setChatMessageText] = useState('');

  // Local message state for immediate UI feedback
  const [chatFeed, setChatFeed] = useState<DirectChatMessage[]>(directMessages);
  const [broadcastsFeed, setBroadcastsFeed] = useState<DistrictBroadcast[]>(broadcasts);

  // New Note state
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState<'general' | 'visit_alert' | 'seminar_invitation'>('general');
  const [newNotePriority, setNewNotePriority] = useState<'عادية' | 'هام' | 'مستعجل'>('هام');

  // New Visit state
  const [visitType, setVisitType] = useState<'تفتيش تثبيت' | 'توجيهية' | 'متابعة دورية' | 'تقييمية'>('متابعة دورية');
  const [lessonObserved, setLessonObserved] = useState('الألعاب الحركية والجري السريع والاستجابة للإشارة');
  const [grade, setGrade] = useState<number>(16.5);
  const [positivePts, setPositivePts] = useState('تحكم ممتاز في توجيه التلاميذ والسلامة الميدانية');
  const [areasImp, setAreasImp] = useState('استغلال أكبر للمساحات الجانبية وتنويع الأقماع');

  // Inspector Level Selection for Curriculum Progress
  const [selectedInspectorLevelId, setSelectedInspectorLevelId] = useState<string>('lvl_p1');

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId) || teachers[0];

  // Derived metrics for Selected Teacher
  const teacherClasses = classes.length > 0 ? classes : [
    { id: 'cls_1', name: '1 ابتدائي 1', studentCount: 28, levelId: 'lvl_p1' },
    { id: 'cls_2', name: '2 ابتدائي 1', studentCount: 26, levelId: 'lvl_p2' },
    { id: 'cls_3', name: '3 ابتدائي 1', studentCount: 25, levelId: 'lvl_p3' },
    { id: 'cls_4', name: '4 ابتدائي 1', studentCount: 24, levelId: 'lvl_p4' },
    { id: 'cls_5', name: '5 ابتدائي 1', studentCount: 22, levelId: 'lvl_p5' },
  ];

  // Students taught by this teacher
  const teacherStudents = students.filter((s) => teacherClasses.some((c) => c.id === s.classId)) || students;
  const totalStudentsTaught = teacherStudents.length > 0 ? teacherStudents.length : teacherClasses.reduce((acc, c) => acc + c.studentCount, 0);
  const maleCount = teacherStudents.filter((s) => s.gender === 'ذكر').length || Math.round(totalStudentsTaught * 0.52);
  const femaleCount = totalStudentsTaught - maleCount;

  // Weekly Schedule Slots for selected teacher
  const teacherScheduleSlots = weeklySchedule.length > 0 ? weeklySchedule : [
    { id: 's1', dayOfWeek: 'الأحد', timeSlot: '08:00 - 09:00', classId: 'cls_1', className: '1 ابتدائي 1', venue: 'الفناء الرياضي' },
    { id: 's2', dayOfWeek: 'الأحد', timeSlot: '09:00 - 10:00', classId: 'cls_2', className: '2 ابتدائي 1', venue: 'الملعب البلدي' },
    { id: 's3', dayOfWeek: 'الأحد', timeSlot: '10:00 - 11:00', classId: 'cls_3', className: '3 ابتدائي 1', venue: 'القاعة المغطاة' },
    { id: 's4', dayOfWeek: 'الإثنين', timeSlot: '08:00 - 09:00', classId: 'cls_4', className: '4 ابتدائي 1', venue: 'الفناء الرياضي' },
    { id: 's5', dayOfWeek: 'الإثنين', timeSlot: '09:00 - 10:00', classId: 'cls_5', className: '5 ابتدائي 1', venue: 'الملعب البلدي' },
    { id: 's6', dayOfWeek: 'الإثنين', timeSlot: '13:00 - 14:00', classId: 'cls_1', className: '1 ابتدائي 1', venue: 'الفناء الرياضي' },
    { id: 's7', dayOfWeek: 'الثلاثاء', timeSlot: '08:00 - 09:00', classId: 'cls_2', className: '2 ابتدائي 1', venue: 'الملعب البلدي' },
    { id: 's8', dayOfWeek: 'الثلاثاء', timeSlot: '09:00 - 10:00', classId: 'cls_3', className: '3 ابتدائي 1', venue: 'القاعة المغطاة' },
    { id: 's9', dayOfWeek: 'الأربعاء', timeSlot: '08:00 - 09:00', classId: 'cls_4', className: '4 ابتدائي 1', venue: 'الفناء الرياضي' },
    { id: 's10', dayOfWeek: 'الأربعاء', timeSlot: '09:00 - 10:00', classId: 'cls_5', className: '5 ابتدائي 1', venue: 'الملعب البلدي' },
    { id: 's11', dayOfWeek: 'الأربعاء', timeSlot: '10:00 - 11:00', classId: 'cls_1', className: '1 ابتدائي 1', venue: 'الفناء الرياضي' },
    { id: 's12', dayOfWeek: 'الخميس', timeSlot: '08:00 - 09:00', classId: 'cls_2', className: '2 ابتدائي 1', venue: 'الملعب البلدي' },
    { id: 's13', dayOfWeek: 'الخميس', timeSlot: '09:00 - 10:00', classId: 'cls_3', className: '3 ابتدائي 1', venue: 'القاعة المغطاة' },
    { id: 's14', dayOfWeek: 'الخميس', timeSlot: '10:00 - 11:00', classId: 'cls_4', className: '4 ابتدائي 1', venue: 'الفناء الرياضي' },
    { id: 's15', dayOfWeek: 'الخميس', timeSlot: '11:00 - 12:00', classId: 'cls_5', className: '5 ابتدائي 1', venue: 'الملعب البلدي' },
    { id: 's16', dayOfWeek: 'الإثنين', timeSlot: '14:00 - 15:00', classId: 'cls_2', className: '2 ابتدائي 1', venue: 'الملعب البلدي' },
    { id: 's17', dayOfWeek: 'الثلاثاء', timeSlot: '10:00 - 11:00', classId: 'cls_4', className: '4 ابتدائي 1', venue: 'الفناء الرياضي' },
    { id: 's18', dayOfWeek: 'الأربعاء', timeSlot: '13:00 - 14:00', classId: 'cls_3', className: '3 ابتدائي 1', venue: 'القاعة المغطاة' },
  ];

  // Total weekly working hours calculated from schedule
  const weeklyHoursCount = teacherScheduleSlots.length || 18;

  // Lesson Plans prepared specifically by selected teacher
  const filteredTeacherPlans = (lessonPlans || []).filter((lp) => {
    if (!lp) return false;
    if (lp.teacherId) return lp.teacherId === selectedTeacher?.id;
    if (lp.teacherName && selectedTeacher?.lastName) return lp.teacherName.includes(selectedTeacher.lastName);
    if (!lp.teacherId && selectedTeacher?.id === teachers[0]?.id) return true;
    return false;
  });

  const defaultDemoPlans: LessonPlan[] = [
    {
      id: 'lp_1',
      teacherId: selectedTeacher?.id || 'usr_teacher_1',
      institutionName: selectedTeacher?.schoolName || 'المدرسة الابتدائية',
      teacherName: `${selectedTeacher?.firstName || ''} ${selectedTeacher?.lastName || ''}`,
      levelName: 'السنة الأولى ابتدائي',
      className: '1 ابتدائي 1',
      fieldName: 'الميدان الأول: الوضعيات والتنقلات',
      competencyTitle: 'التحكم في وضعيات الجسم والتوازن في الفضاء',
      segmentTitle: 'المقطع الأول: الوضعيات والتوازن',
      sessionTitle: 'مذكرة حصة: الألعاب الحركية والتوافق العصبي الحركي',
      sessionType: 'تعلمية',
      date: '2026-07-25',
      durationMinutes: 45,
      equipmentNeeded: ['أقماع', 'حواف لينة', 'صفارة'],
      generalObjective: 'تنمية التوافق الحركي والتوازن أثناء الجري السريع وتغيير الاتجاه.',
      proceduralObjectives: {
        motor: 'يجري ويقفز مع تغيير الاتجاه بثبات',
        cognitive: 'يتعرف على الإشارات الصوتية والرمزية'
      },
      warmupPhase: {
        duration: '10 دقائق',
        generalWarmup: 'جري خفيف حول الفناء (5 د)',
        specificWarmup: 'تمارين إطالة ديناميكية وتسخين المفاصل (5 د)',
        organization: 'انتظام الأقسام في الميدان'
      },
      mainPhase: {
        duration: '25 دقيقة',
        problemSituation: 'الجري المتناسق في المسارات المحددة',
        learningSituation1: {
          title: 'السباق الزجزاجي',
          description: 'الجري بين الأقماع بطريقة زجزاجية',
          dosing: '3 تكرارات لكل فريق',
          criteria: 'تفادي الاصطدام بالأقماع'
        },
        learningSituation2: {
          title: 'القفز والاستجابة',
          description: 'القفز فوق الحواجز المنخفضة مع الاستجابة للإشارة',
          dosing: '2 تكرار',
          criteria: 'السرعة والتوازن'
        },
        guidedApplication: {
          title: 'لعبة المواجهة المصغرة',
          description: 'تطبيق موجه في الميدان',
          rules: 'احترام الأدوار والسلامة'
        }
      },
      coolDownPhase: {
        duration: '10 دقائق',
        activities: 'مشي خفيف واسترجاع الأنفاس وتمارين استرخاء',
        assessmentAndDialogue: 'تقييم الأداء والملاحظات الختامية والحوار البيداغوجي'
      },
      safetyRules: ['التأكد من خلو الفناء من العوائق', 'ارتداء الألبسة والرياضية'],
      aiGenerated: true,
      version: 1,
      createdAt: '2026-07-25T10:00:00Z'
    }
  ];

  const teacherLessonPlans = filteredTeacherPlans.length > 0 ? filteredTeacherPlans : (selectedTeacher?.id === teachers[0]?.id ? defaultDemoPlans : []);

  // Filter Daily Notebook Entries logged by the selected teacher
  const teacherNotebook = (dailyNotebook || []).filter((entry) => {
    if (!entry) return false;
    if (entry.teacherId) return entry.teacherId === selectedTeacher?.id;
    if (!entry.teacherId && selectedTeacher?.id === teachers[0]?.id) return true;
    return false;
  });

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bcTitle || !bcContent) return;

    const newBc: DistrictBroadcast = {
      id: `bc_${Date.now()}`,
      inspectorId: inspector.id,
      inspectorName: `${inspector.firstName} ${inspector.lastName}`,
      districtId: inspector.districtId || 'dist_setif_7',
      title: bcTitle,
      content: bcContent,
      category: bcCategory,
      createdAt: new Date().toISOString()
    };

    setBroadcastsFeed((prev) => [newBc, ...prev]);
    if (onAddBroadcast) {
      onAddBroadcast(newBc);
    }

    setBcTitle('');
    setBcContent('');
    setShowBroadcastModal(false);
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessageText.trim() || !selectedTeacher) return;

    const newMsg: DirectChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: inspector.id,
      senderName: `${inspector.firstName} ${inspector.lastName}`,
      senderRole: 'inspector',
      receiverId: selectedTeacher.id,
      receiverName: `${selectedTeacher.firstName} ${selectedTeacher.lastName}`,
      districtId: inspector.districtId || 'dist_setif_7',
      message: chatMessageText.trim(),
      createdAt: new Date().toISOString(),
      read: true
    };

    setChatFeed((prev) => [...prev, newMsg]);
    if (onAddDirectMessage) {
      onAddDirectMessage({
        receiverId: selectedTeacher.id,
        receiverName: `${selectedTeacher.firstName} ${selectedTeacher.lastName}`,
        message: chatMessageText.trim()
      });
    }

    setChatMessageText('');
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle || !newNoteContent) return;

    onAddNote({
      inspectorId: inspector.id,
      inspectorName: `${inspector.firstName} ${inspector.lastName}`,
      teacherId: selectedTeacher.id,
      teacherName: `${selectedTeacher.firstName} ${selectedTeacher.lastName}`,
      moduleRef: newNoteType,
      title: newNoteTitle,
      content: newNoteContent,
      priority: newNotePriority,
      status: 'جديدة',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    setNewNoteTitle('');
    setNewNoteContent('');
    setShowNoteModal(false);
  };

  const handleCreateVisit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddVisit({
      inspectorId: inspector.id,
      teacherId: selectedTeacher.id,
      institutionId: selectedTeacher.institutionId || 'inst_1',
      visitDate: new Date().toISOString().split('T')[0],
      visitType: visitType,
      lessonObservedTitle: lessonObserved,
      pedagogicalGrade: Number(grade),
      positivePoints: positivePts.split('\n').filter(Boolean),
      areasForImprovement: areasImp.split('\n').filter(Boolean),
      recommendations: ['مواصلة التوثيق الرقمي عبر منصة SPEX'],
      officialReportGenerated: true
    });
    setShowVisitModal(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      {/* Inspector Portal Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg shadow-emerald-900/15">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold text-emerald-100 border border-white/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {inspector.directorateId === 'setif_de' ? 'مديرية التربية لولاية سطيف' : inspector.directorateId || 'مديرية التربية والتعليم'} - {inspector.districtId === 'dist_setif_7' ? 'المقاطعة 07 (عين أزال)' : inspector.districtId || 'المقاطعة التفتيشية'} (المفتش: {inspector.firstName} {inspector.lastName})
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              بوابة المفتش البيداغوجي: {inspector.firstName} {inspector.lastName}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
              الإشراف البيداغوجي الشامل: الاطلاع على التوزيع الأسبوعي، التوزيع السنوي والمخطط البيداغوجي، المذكرات والتحضير، والعدد الكلي للتلاميذ وساعات العمل.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold rounded-2xl text-xs shadow-md transition-all cursor-pointer"
            >
              <Megaphone className="w-4 h-4 text-slate-950" />
              <span>📢 بث رسالة جماعية للمقاطعة</span>
            </button>
            <button
              onClick={() => setActiveTab(activeTab === 'chat' ? 'overview' : 'chat')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-xs shadow-md transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-blue-200" />
              <span>{activeTab === 'chat' ? '📋 العودة لبطاقات المتابعة' : '💬 المحادثة المباشرة مع الأستاذ'}</span>
            </button>
            <button
              onClick={() => setShowVisitModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-emerald-800 hover:bg-emerald-50 font-bold rounded-2xl text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل زيارة تفقدية</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Top Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">أساتذة المقاطعة</span>
            <div className="text-xl font-extrabold text-slate-900">{teachers.length} أساتذة</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">إجمالي تلاميذ الأستاذ</span>
            <div className="text-xl font-extrabold text-blue-900">{totalStudentsTaught} تلميذاً</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">ساعات العمل الأسبوعية</span>
            <div className="text-xl font-extrabold text-purple-900">{weeklyHoursCount} ساعة/أسبوعياً</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">تقدم البرنامج السنوي</span>
            <div className="text-xl font-extrabold text-amber-900">88% منجز</div>
          </div>
        </div>
      </div>

      {/* DIRECT CHAT TAB */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-lg shadow-md">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  الدردشة النصية المباشرة مع الأستاذ: {selectedTeacher.firstName} {selectedTeacher.lastName}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedTeacher.schoolName || 'مدرسة بالخيري عبد القادر الابتدائية'} • المقاطعة 07 (عين أزال)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600">اختر الأستاذ:</label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="p-2 rounded-xl border border-slate-200 font-extrabold text-xs bg-slate-50 outline-none"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    أ. {t.firstName} {t.lastName} ({t.schoolName || 'مدرسة ابتدائية'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chat Feed */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/70 p-4 h-80 overflow-y-auto space-y-3">
            {chatFeed.filter(
              (m) =>
                (m.senderId === inspector.id && m.receiverId === selectedTeacher.id) ||
                (m.senderId === selectedTeacher.id && m.receiverId === inspector.id)
            ).length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                💬 لا توجد رسائل سابقة مع الأستاذ {selectedTeacher.firstName}. يمكنك بدء المحادثة المباشرة الآن.
              </div>
            ) : (
              chatFeed
                .filter(
                  (m) =>
                    (m.senderId === inspector.id && m.receiverId === selectedTeacher.id) ||
                    (m.senderId === selectedTeacher.id && m.receiverId === inspector.id)
                )
                .map((msg) => {
                  const isMe = msg.senderId === inspector.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                      <div
                        className={`max-w-md p-3.5 rounded-2xl text-xs space-y-1 shadow-xs ${
                          isMe
                            ? 'bg-emerald-700 text-white rounded-br-none'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 text-[10px] opacity-80 border-b border-white/20 pb-1">
                          <span className="font-bold">{msg.senderName}</span>
                          <span>{msg.createdAt.slice(11, 16)}</span>
                        </div>
                        <p className="leading-relaxed font-medium">{msg.message}</p>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Send Chat Form */}
          <form onSubmit={handleSendChatMessage} className="flex gap-2">
            <input
              type="text"
              value={chatMessageText}
              onChange={(e) => setChatMessageText(e.target.value)}
              placeholder={`اكتب توجيهاً أو رسالة نصية مباشرة للأستاذ ${selectedTeacher.firstName}...`}
              className="flex-1 p-3 text-xs rounded-2xl border border-slate-200 outline-none focus:border-blue-500 bg-white"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>إرسال</span>
            </button>
          </form>
        </div>
      )}

      {/* OVERVIEW TAB: TEACHER INSPECTION & PEDAGOGICAL MONITORING */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: List of Supervised Teachers */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>قائمة أساتذة المقاطعة التفتيشية ({teachers.length})</span>
            </h3>

            <div className="space-y-2">
              {teachers.map((t) => {
                const isSelected = t.id === selectedTeacherId;
                const institutionName = t.schoolName || 'مدرسة الأمير عبد القادر الابتدائية';
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTeacherId(t.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-sm shadow-xs">
                        {t.firstName[0]}
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">
                          أ. {t.firstName} {t.lastName}
                        </h4>
                        <p className="text-[11px] text-slate-500">{institutionName}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg">
                      معاين
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Pedagogical Monitoring Panel */}
          <div className="lg:col-span-2 space-y-5">
            {/* Selected Teacher Identity Banner */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-extrabold text-xl flex items-center justify-center shadow-md">
                    {selectedTeacher.firstName[0]}
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-100">
                      <BookOpen className="w-3 h-3" />
                      <span>الملف البيداغوجي للأستاذ</span>
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                      أستاذ: {selectedTeacher.firstName} {selectedTeacher.lastName}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedTeacher.schoolName || 'مدرسة الأمير عبد القادر الابتدائية'} • خبرة {selectedTeacher.yearsExperience || 8} سنوات
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowVisitModal(true)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>زيارة تفقدية</span>
                  </button>
                  <button
                    onClick={() => setShowNoteModal(true)}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                    <span>إرسال توجيه رسمي</span>
                  </button>
                </div>
              </div>

              {/* Quick Teacher Specs Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">العدد الكلي للتلاميذ</span>
                  <span className="font-black text-blue-900 text-sm">{totalStudentsTaught} تلميذاً</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">ساعات العمل الأسبوعية</span>
                  <span className="font-black text-purple-900 text-sm">{weeklyHoursCount} ساعة / أسبوعياً</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">عدد الأقسام المسندة</span>
                  <span className="font-black text-slate-800 text-sm">{teacherClasses.length} أقسام</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">نسبة تنفيذ البرنامج</span>
                  <span className="font-black text-emerald-700 text-sm">88% مكتمل</span>
                </div>
              </div>

              {/* Sub-Navigation Tabs for Inspector Capabilities */}
              <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl overflow-x-auto">
                <button
                  onClick={() => setTeacherSubTab('annual_plan')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    teacherSubTab === 'annual_plan'
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-slate-600 hover:bg-white/50'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>المخطط والتوزيع السنوي</span>
                </button>

                <button
                  onClick={() => setTeacherSubTab('schedule')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    teacherSubTab === 'schedule'
                      ? 'bg-white text-purple-800 shadow-sm'
                      : 'text-slate-600 hover:bg-white/50'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <span>التوزيع الأسبوعي وساعات العمل</span>
                </button>

                <button
                  onClick={() => setTeacherSubTab('lesson_plans')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    teacherSubTab === 'lesson_plans'
                      ? 'bg-white text-blue-800 shadow-sm'
                      : 'text-slate-600 hover:bg-white/50'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>المذكرات البيداغوجية والتحضير</span>
                </button>

                <button
                  onClick={() => setTeacherSubTab('students')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    teacherSubTab === 'students'
                      ? 'bg-white text-amber-800 shadow-sm'
                      : 'text-slate-600 hover:bg-white/50'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-amber-600" />
                  <span>إجمالي التلاميذ والأقسام</span>
                </button>

                <button
                  onClick={() => setTeacherSubTab('visits')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    teacherSubTab === 'visits'
                      ? 'bg-white text-rose-800 shadow-sm'
                      : 'text-slate-600 hover:bg-white/50'
                  }`}
                >
                  <Award className="w-3.5 h-3.5 text-rose-600" />
                  <span>الزيارات والتوجيهات</span>
                </button>
              </div>

              {/* SUB-VIEW 1: ANNUAL PEDAGOGICAL PLAN & PROGRESS (المخطط البيداغوجي والتوزيع السنوي ومدى التقدم) */}
              {teacherSubTab === 'annual_plan' && (() => {
                const levelData = COMPLETE_ANNUAL_CURRICULUM[selectedInspectorLevelId] || COMPLETE_ANNUAL_CURRICULUM['lvl_p1'];
                const levelObj = PE_LEVELS.find((l) => l.id === selectedInspectorLevelId) || PE_LEVELS[0];

                // Filter teacher's actual plans & notebook entries for the selected level
                const selectedLevelPlans = teacherLessonPlans.filter((lp) => {
                  if (!lp.levelName) return true;
                  return lp.levelName.includes(levelObj.name) || lp.levelName.includes(selectedInspectorLevelId) || levelObj.name.includes(lp.levelName);
                });

                const selectedLevelNotebook = teacherNotebook.filter((entry) => {
                  return entry.status === 'منجزة';
                });

                // Domain keyword matchers
                const matchesDomain1 = (item: any) => {
                  const text = `${item.fieldName || ''} ${item.competencyTitle || ''} ${item.segmentTitle || ''} ${item.sessionTitle || ''} ${item.note || ''} ${item.domain || ''}`.toLowerCase();
                  return text.includes('وضعيات') || text.includes('تنقل') || text.includes('توازن') || text.includes('locomotion') || text.includes('الأول') || text.includes('1');
                };

                const matchesDomain2 = (item: any) => {
                  const text = `${item.fieldName || ''} ${item.competencyTitle || ''} ${item.segmentTitle || ''} ${item.sessionTitle || ''} ${item.note || ''} ${item.domain || ''}`.toLowerCase();
                  return text.includes('قاعدية') || text.includes('جري') || text.includes('قفز') || text.includes('رمي') || text.includes('fundamentals') || text.includes('الثاني') || text.includes('2');
                };

                const matchesDomain3 = (item: any) => {
                  const text = `${item.fieldName || ''} ${item.competencyTitle || ''} ${item.segmentTitle || ''} ${item.sessionTitle || ''} ${item.note || ''} ${item.domain || ''}`.toLowerCase();
                  return text.includes('هيكلة') || text.includes('بناء') || text.includes('جماعي') || text.includes('تعاون') || text.includes('انضباط') || text.includes('structuring') || text.includes('الثالث') || text.includes('3');
                };

                let count1 = selectedLevelPlans.filter(matchesDomain1).length + selectedLevelNotebook.filter(matchesDomain1).length;
                let count2 = selectedLevelPlans.filter(matchesDomain2).length + selectedLevelNotebook.filter(matchesDomain2).length;
                let count3 = selectedLevelPlans.filter(matchesDomain3).length + selectedLevelNotebook.filter(matchesDomain3).length;

                // Any unclassified plans contribute to current active count
                const unclassifiedCount = selectedLevelPlans.filter(p => !matchesDomain1(p) && !matchesDomain2(p) && !matchesDomain3(p)).length;
                if (unclassifiedCount > 0) {
                  if (count1 < 10) count1 += unclassifiedCount;
                  else if (count2 < 10) count2 += unclassifiedCount;
                  else count3 += unclassifiedCount;
                }

                // Strictly actual completed session counts out of 10 for each domain (30 total per year)
                const locCompleted = Math.min(10, count1);
                const fundCompleted = Math.min(10, count2);
                const structCompleted = Math.min(10, count3);

                const totalCompleted = locCompleted + fundCompleted + structCompleted;
                const totalRequired = 30;
                const overallPercentage = Math.round((totalCompleted / totalRequired) * 100);

                return (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    {/* Level Selector Header Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-2xl shadow-md">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block">المستوى الدراسي والمخطط المعتمد:</label>
                          <select
                            value={selectedInspectorLevelId}
                            onChange={(e) => setSelectedInspectorLevelId(e.target.value)}
                            className="bg-slate-800 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl border border-slate-700 outline-none focus:border-emerald-500 cursor-pointer"
                          >
                            {PE_LEVELS.map((lvl) => (
                              <option key={lvl.id} value={lvl.id}>
                                {lvl.name} ({lvl.cycle})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-right">
                          <span className="text-slate-400 text-[10px] block">إجمالي الحصص البيداغوجية</span>
                          <span className="font-extrabold text-amber-400">30 حصة (10 حصص لكل ميدان)</span>
                        </div>
                        <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>
                        <div className="text-right">
                          <span className="text-slate-400 text-[10px] block">الحصص المنجزة فعلياً</span>
                          <span className="font-extrabold text-emerald-400">{totalCompleted} من أصل 30 حصة</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Overall Card */}
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                          <span>نسبة تقدم الأستاذ الفعلية في {levelObj.name} (وفق الميادين الثلاثة الرسمية)</span>
                        </h4>
                        <p className="text-xs text-emerald-800/80 mt-1">
                          إجمالي الحصص المنجزة والموثقة فعلياً: <strong className="text-emerald-900">{totalCompleted} حصة</strong> من أصل <strong className="text-emerald-900">30 حصة رسمية</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] font-extrabold text-emerald-700 block">نسبة الإنجاز الكلية</span>
                          <span className="text-2xl font-black text-emerald-900">{overallPercentage}%</span>
                        </div>
                        <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                          {overallPercentage}%
                        </div>
                      </div>
                    </div>

                    {/* Term Breakdown Cards for 3 Official Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Field 1: Term 1 */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-black text-slate-900">الفصل 1: الميدان 1 (10 حصص)</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${locCompleted === 10 ? 'bg-emerald-100 text-emerald-800' : locCompleted > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                            {Math.round((locCompleted / 10) * 100)}% {locCompleted === 10 ? 'مكتمل' : locCompleted > 0 ? 'منجز' : 'غير مبدوء'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium">الوضعيات والتنقلات: التحكم في وضعيات الجسم والتوازن في الفضاء.</p>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div className="bg-emerald-600 h-2 rounded-full transition-all duration-300" style={{ width: `${(locCompleted / 10) * 100}%` }}></div>
                        </div>
                      </div>

                      {/* Field 2: Term 2 */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-black text-slate-900">الفصل 2: الميدان 2 (10 حصص)</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${fundCompleted === 10 ? 'bg-emerald-100 text-emerald-800' : fundCompleted > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                            {Math.round((fundCompleted / 10) * 100)}% {fundCompleted === 10 ? 'مكتمل' : fundCompleted > 0 ? 'منجز' : 'غير مبدوء'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium">الحركات القاعدية: اكتساب وتوظيف المشي والجري والقفز والرمي.</p>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${(fundCompleted / 10) * 100}%` }}></div>
                        </div>
                      </div>

                      {/* Field 3: Term 3 */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-black text-slate-900">الفصل 3: الميدان 3 (10 حصص)</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${structCompleted === 10 ? 'bg-emerald-100 text-emerald-800' : structCompleted > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                            {Math.round((structCompleted / 10) * 100)}% {structCompleted === 10 ? 'مكتمل' : structCompleted > 0 ? 'جاري' : 'غير مبدوء'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium">الهيكلة والبناء: الأنشطة الجماعية، احترام القواعد والتعاون.</p>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div className="bg-amber-500 h-2 rounded-full transition-all duration-300" style={{ width: `${(structCompleted / 10) * 100}%` }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Official Curriculum Domains Table */}
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="bg-slate-900 text-white font-bold">
                            <th className="p-3">الميدان البيداغوجي المعتمد</th>
                            <th className="p-3">الكفاءة الختامية للمقطع</th>
                            <th className="p-3 text-center">عدد الحصص المقررة</th>
                            <th className="p-3 text-center">حالة التنفيذ الإنجاز الميداني</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {/* Domain 1 */}
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold text-slate-900">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span>{levelData.fields.f_locomotion?.fieldName || 'الميدان الأول: الوضعيات والتنقلات'}</span>
                              </div>
                            </td>
                            <td className="p-3 text-slate-700 leading-relaxed max-w-xs">
                              {levelData.fields.f_locomotion?.finalCompetency}
                            </td>
                            <td className="p-3 text-center font-extrabold text-slate-800">10 حصص</td>
                            <td className="p-3 text-center">
                              <span className={`font-bold px-2.5 py-1 rounded-xl text-[10px] inline-flex items-center gap-1 ${locCompleted === 10 ? 'bg-emerald-100 text-emerald-800' : locCompleted > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                                <span>{locCompleted === 10 ? '✔️ مكتمل' : locCompleted > 0 ? '⏳ جاري التنفيذ' : '⚪ لم يوثق بعد'}</span>
                                <span>({locCompleted}/10 حصص)</span>
                              </span>
                            </td>
                          </tr>

                          {/* Domain 2 */}
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold text-slate-900">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                <span>{levelData.fields.f_fundamentals?.fieldName || 'الميدان الثاني: الحركات القاعدية'}</span>
                              </div>
                            </td>
                            <td className="p-3 text-slate-700 leading-relaxed max-w-xs">
                              {levelData.fields.f_fundamentals?.finalCompetency}
                            </td>
                            <td className="p-3 text-center font-extrabold text-slate-800">10 حصص</td>
                            <td className="p-3 text-center">
                              <span className={`font-bold px-2.5 py-1 rounded-xl text-[10px] inline-flex items-center gap-1 ${fundCompleted === 10 ? 'bg-emerald-100 text-emerald-800' : fundCompleted > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                                <span>{fundCompleted === 10 ? '✔️ مكتمل' : fundCompleted > 0 ? '⏳ جاري التنفيذ' : '⚪ لم يوثق بعد'}</span>
                                <span>({fundCompleted}/10 حصص)</span>
                              </span>
                            </td>
                          </tr>

                          {/* Domain 3 */}
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold text-slate-900">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                <span>{levelData.fields.f_structuring?.fieldName || 'الميدان الثالث: الهيكلة والبناء'}</span>
                              </div>
                            </td>
                            <td className="p-3 text-slate-700 leading-relaxed max-w-xs">
                              {levelData.fields.f_structuring?.finalCompetency}
                            </td>
                            <td className="p-3 text-center font-extrabold text-slate-800">10 حصص</td>
                            <td className="p-3 text-center">
                              <span className={`font-bold px-2.5 py-1 rounded-xl text-[10px] inline-flex items-center gap-1 ${structCompleted === 10 ? 'bg-emerald-100 text-emerald-800' : structCompleted > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                                <span>{structCompleted === 10 ? '✔️ مكتمل' : structCompleted > 0 ? '⏳ جاري التوثيق' : '⚪ لم يوثق بعد'}</span>
                                <span>({structCompleted}/10 حصص)</span>
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* SUB-VIEW 2: WEEKLY SCHEDULE & WORKING HOURS (التوزيع الأسبوعي وساعات العمل) */}
              {teacherSubTab === 'schedule' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-5 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-purple-100 mb-1">
                        <Clock className="w-3 h-3" />
                        <span>الحجم الساعي المعتمد رسمياً</span>
                      </div>
                      <h4 className="text-lg font-black text-white">
                        عدد ساعات عمل الأستاذ أسبوعياً: {weeklyHoursCount} ساعة / أسبوعياً
                      </h4>
                      <p className="text-xs text-purple-200 mt-1">
                        موزعة على {teacherClasses.length} أقسام مسندة بالطور الابتدائي ({teacherClasses.map((c) => c.name).join(' • ')})
                      </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 text-center min-w-32">
                      <span className="text-[10px] text-purple-200 font-bold block">إجمالي الحصص</span>
                      <span className="text-2xl font-black text-amber-300">{weeklyHoursCount} حصص</span>
                    </div>
                  </div>

                  {/* Weekly Timetable Grid Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold">
                          <th className="p-3 text-center w-28">التوقيت / اليوم</th>
                          <th className="p-3 text-center">الأحد</th>
                          <th className="p-3 text-center">الإثنين</th>
                          <th className="p-3 text-center">الثلاثاء</th>
                          <th className="p-3 text-center">الأربعاء</th>
                          <th className="p-3 text-center">الخميس</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {['08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '13:00 - 14:00', '14:00 - 15:00'].map((slotTime) => (
                          <tr key={slotTime} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-center font-bold text-slate-500 bg-slate-50 dir-ltr text-[11px]">
                              {slotTime}
                            </td>
                            {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'].map((day) => {
                              const matchingSlot = teacherScheduleSlots.find(
                                (s) => s.dayOfWeek === day && s.timeSlot === slotTime
                              );

                              return (
                                <td key={day} className="p-2 text-center align-middle border-r border-slate-100">
                                  {matchingSlot ? (
                                    <div className="bg-purple-50 text-purple-900 border border-purple-200 p-2 rounded-xl text-center space-y-0.5 shadow-2xs">
                                      <span className="font-extrabold text-xs block text-purple-950">
                                        {matchingSlot.className}
                                      </span>
                                      <span className="text-[10px] text-purple-700 block font-semibold">
                                        {matchingSlot.venue || 'الفناء الرياضي'}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 text-[10px] font-medium">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-VIEW 3: LESSON PLANS & PREPARATION (المذكرات البيداغوجية والتحضير) */}
              {teacherSubTab === 'lesson_plans' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>المذكرات البيداغوجية المحضرة من قبل الأستاذ ({teacherLessonPlans.length} مذكرات)</span>
                    </h4>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                      ✔️ مصادق عليها ومطابقة للتدرج الوزاري
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {teacherLessonPlans.map((lp) => (
                      <div
                        key={lp.id}
                        className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 transition-all shadow-xs space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-black text-slate-900 leading-snug">{lp.sessionTitle}</span>
                          <span className="text-[10px] bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded-md whitespace-nowrap">
                            {lp.levelName || (lp as any).level || 'السنة الأولى ابتدائي'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2">
                          <strong>الهدف التعلمي:</strong> {lp.generalObjective || (lp as any).learningGoal || 'تنمية المهارات الحركية والتنقل بالتوازن'}
                        </p>

                        <div className="flex items-center justify-between text-[10px] pt-2 border-t border-slate-100">
                          <span className="text-slate-500 font-bold">الحجم: {lp.duration || '45 دقيقة'}</span>
                          <button
                            onClick={() => setSelectedLessonPlanModal(lp)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>معاينة تفاصيل المذكرة</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-VIEW 4: TOTAL STUDENTS & ASSIGNED CLASSES (إجمالي التلاميذ والأقسام) */}
              {teacherSubTab === 'students' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-5 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-blue-100 mb-1">
                        <Users className="w-3 h-3" />
                        <span>إحصائيات التلاميذ الكلية</span>
                      </div>
                      <h4 className="text-lg font-black text-white">
                        العدد الكلي للتلاميذ الذين يدرسهم الأستاذ: {totalStudentsTaught} تلميذاً
                      </h4>
                      <p className="text-xs text-blue-200 mt-1">
                        موزعين على {teacherClasses.length} أقسام مسندة بـ {selectedTeacher.schoolName || 'المدرسة الابتدائية'}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <div className="bg-white/10 p-3 rounded-2xl border border-white/20 text-center min-w-24">
                        <span className="text-[10px] text-blue-200 font-bold block">ذكور</span>
                        <span className="text-lg font-black text-cyan-300">{maleCount}</span>
                      </div>
                      <div className="bg-white/10 p-3 rounded-2xl border border-white/20 text-center min-w-24">
                        <span className="text-[10px] text-blue-200 font-bold block">إناث</span>
                        <span className="text-lg font-black text-pink-300">{femaleCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Class Rosters Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {teacherClasses.map((cls) => {
                      const count = cls.studentCount || 25;
                      return (
                        <div key={cls.id} className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-900">{cls.name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-800 rounded-full border border-blue-100">
                              {count} تلميذاً
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 space-y-1">
                            <div>الذكور: <strong>{Math.round(count * 0.52)}</strong> | الإناث: <strong>{Math.round(count * 0.48)}</strong></div>
                            <div>النوادي: نادي أ ({Math.round(count / 2)}) • نادي ب ({count - Math.round(count / 2)})</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SUB-VIEW 5: INSPECTION VISITS & REPORTS ARCHIVE (الزيارات والتوجيهات) */}
              {teacherSubTab === 'visits' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-600" />
                      <span>أرشيف الزيارات والتقييمات البيداغوجية للأستاذ:</span>
                    </h4>
                    <span className="text-[11px] font-bold text-slate-500">
                      {visits.filter((v) => v.teacherId === selectedTeacher.id).length} زيارات معتمدة
                    </span>
                  </div>

                  {visits.filter((v) => v.teacherId === selectedTeacher.id).length === 0 ? (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-2xl text-center">
                      لا توجد زيارات تفتيشية مؤرشفة لهذا الأستاذ حالياً. يمكنك إضافة زيارة جديدة عبر الزر أعلاه.
                    </p>
                  ) : (
                    visits
                      .filter((v) => v.teacherId === selectedTeacher.id)
                      .map((v) => (
                        <div key={v.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800">
                                {v.visitType}
                              </span>
                              <span className="text-xs text-slate-500">{v.visitDate}</span>
                            </div>
                            {v.pedagogicalGrade && (
                              <div className="text-xs font-extrabold text-slate-900 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-xl">
                                النقطة التربوية: {v.pedagogicalGrade} / 20
                              </div>
                            )}
                          </div>

                          <p className="text-xs font-bold text-slate-800">الحصة الملاحظة: {v.lessonObservedTitle}</p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 text-[11px]">
                            <div className="bg-emerald-50/80 p-2.5 rounded-xl text-emerald-900 border border-emerald-100">
                              <span className="font-bold block text-emerald-800 mb-1">نقاط القوة والإيجابيات:</span>
                              <ul className="list-disc list-inside space-y-0.5">
                                {v.positivePoints.map((pt, i) => (
                                  <li key={i}>{pt}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="bg-amber-50/80 p-2.5 rounded-xl text-amber-900 border border-amber-100">
                              <span className="font-bold block text-amber-800 mb-1">توجيهات للتحسين:</span>
                              <ul className="list-disc list-inside space-y-0.5">
                                {v.areasForImprovement.map((pt, i) => (
                                  <li key={i}>{pt}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))
                  )}

                  {/* Notes & Directives */}
                  <div className="pt-2 space-y-3">
                    <h5 className="text-xs font-bold text-slate-900">التوجيهات والتنبيهات المباشرة:</h5>
                    {notes.filter((n) => n.teacherId === selectedTeacher.id).length === 0 ? (
                      <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl text-center">
                        لا توجد تنبيهات سابقة.
                      </p>
                    ) : (
                      notes
                        .filter((n) => n.teacherId === selectedTeacher.id)
                        .map((n) => (
                          <div key={n.id} className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-emerald-400">{n.title}</span>
                              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-300">{n.priority}</span>
                            </div>
                            <p className="text-slate-200 leading-relaxed">{n.content}</p>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Lesson Plan Full Detail Viewer for Inspector */}
      {selectedLessonPlanModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  {selectedLessonPlanModal.level}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  {selectedLessonPlanModal.sessionTitle}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLessonPlanModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-2 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-500 block text-[10px]">الهدف التعلمي للحصة:</span>
                <p className="font-bold text-slate-900">{selectedLessonPlanModal.learningGoal}</p>
              </div>

              <div className="space-y-2">
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
                  <span className="font-extrabold text-amber-900 block mb-1">1. المرحلة التمهيدية / الإحماء (10 دقائق):</span>
                  <p className="text-slate-800 leading-relaxed">{selectedLessonPlanModal.warmupPhase}</p>
                </div>

                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200">
                  <span className="font-extrabold text-blue-900 block mb-1">2. المرحلة الرئيسية / التعلم والتطبيق (25 دقيقة):</span>
                  <p className="text-slate-800 leading-relaxed">{selectedLessonPlanModal.mainPhase}</p>
                </div>

                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <span className="font-extrabold text-emerald-900 block mb-1">3. المرحلة الختامية / التهدئة والتقويم (10 دقائق):</span>
                  <p className="text-slate-800 leading-relaxed">{selectedLessonPlanModal.coolDownPhase}</p>
                </div>
              </div>

              {selectedLessonPlanModal.evaluation && (
                <div className="p-3 bg-slate-900 text-white rounded-2xl">
                  <span className="font-bold text-emerald-400 block mb-1">معايير التقييم والملاحظة البيداغوجية:</span>
                  <p className="text-slate-200">{selectedLessonPlanModal.evaluation}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setSelectedLessonPlanModal(null);
                  setShowNoteModal(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                إرسال ملاحظة بيداغوجية على هذه المذكرة
              </button>
              <button
                onClick={() => setSelectedLessonPlanModal(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Note */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">إرسال توجيه وملاحظة بيداغوجية</h3>
              <button onClick={() => setShowNoteModal(false)} className="text-slate-400 hover:text-slate-700 text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">الأستاذ المستهدف</label>
                <div className="text-xs font-bold text-slate-900 p-2.5 bg-slate-100 rounded-xl">
                  أ. {selectedTeacher.firstName} {selectedTeacher.lastName} ({selectedTeacher.email})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">نوع المراسلة / الرسالة</label>
                  <select
                    value={newNoteType}
                    onChange={(e: any) => setNewNoteType(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none font-bold"
                  >
                    <option value="general">📝 توجيه وملاحظة بيداغوجية</option>
                    <option value="visit_alert">🔔 تنبيه بزيارة تفقدية</option>
                    <option value="seminar_invitation">🎓 دعوة لندوة تربوية / يوم تكويني</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">درجة الأهمية</label>
                  <select
                    value={newNotePriority}
                    onChange={(e: any) => setNewNotePriority(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                  >
                    <option value="عادية">عادية</option>
                    <option value="هام">هام</option>
                    <option value="مستعجل">مستعجل</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">عنوان المراسلة أو الموضوع</label>
                <input
                  type="text"
                  required
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="مثال: دعوة لحضور الندوة التربوية المقررة يوم الخميس"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">مضمون الرسالة أو التوجيه الرسمي</label>
                <textarea
                  required
                  rows={4}
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="اكتب التوجيهات أو تفاصيل الدعوة..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700"
                >
                  إرسال التوجيه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Inspection Visit */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">تسجيل زيارة تفتيشية بيداغوجية</h3>
              <button onClick={() => setShowVisitModal(false)} className="text-slate-400 hover:text-slate-700 text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVisit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">نوع الزيارة</label>
                  <select
                    value={visitType}
                    onChange={(e: any) => setVisitType(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                  >
                    <option value="متابعة دورية">متابعة دورية</option>
                    <option value="تفتيش تثبيت">تفتيش تثبيت</option>
                    <option value="توجيهية">توجيهية</option>
                    <option value="تقييمية">تقييمية</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">النقطة التربوية / 20</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="20"
                    value={grade}
                    onChange={(e) => setGrade(parseFloat(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">عنوان الحصة الملاحظة</label>
                <input
                  type="text"
                  required
                  value={lessonObserved}
                  onChange={(e) => setLessonObserved(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">نقاط القوة والإيجابيات (سطر لكل نقطة)</label>
                <textarea
                  rows={2}
                  value={positivePts}
                  onChange={(e) => setPositivePts(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">مجالات التحسين والتوصيات</label>
                <textarea
                  rows={2}
                  value={areasImp}
                  onChange={(e) => setAreasImp(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVisitModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700"
                >
                  حفظ الزيارة التفتيشية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Broadcast Message / Invitation to All District Teachers */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-500" />
                <span>إرسال دعوة / بث رسالة جماعية لأساتذة المقاطعة</span>
              </h3>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">نوع المراسلة الجماعية</label>
                <select
                  value={bcCategory}
                  onChange={(e: any) => setBcCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold outline-none focus:border-amber-500"
                >
                  <option value="دعوة_اجتماع">📅 دعوة اجتماع بيداغوجي / ندوة</option>
                  <option value="توجيه_بيداغوجي">📘 توجيه بيداغوجي وتأكيدات تفتيشية</option>
                  <option value="إشعار_مستعجل">🚨 إشعار مستعجل للمقاطعة</option>
                  <option value="ندوة_تكوينية">🎓 ندوة تكوينية وأيام دراسية</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">عنوان المراسلة أو الدعوة</label>
                <input
                  type="text"
                  required
                  value={bcTitle}
                  onChange={(e) => setBcTitle(e.target.value)}
                  placeholder="مثال: دعوة لحضور الندوة التربوية البيداغوجية بالمقاطعة 07 - عين أزال"
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">نص الرسالة أو جدول أعمال اللقاء</label>
                <textarea
                  required
                  rows={4}
                  value={bcContent}
                  onChange={(e) => setBcContent(e.target.value)}
                  placeholder="يشرفني دعوة كافة أساتذة التربية البدنية بالمقاطعة لحضور الندوة المقررة..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/60 text-[11px] text-amber-900">
                📢 <strong>ملاحظة:</strong> سيتم إرسال هذا الإشعار تلقائياً في شاشات الإشعارات الخاصة بجميع أساتذة المقاطعة 07 (عين أزال).
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl shadow-md cursor-pointer"
                >
                  بث الدعوة للجميع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
