/**
 * SPEX - School Director Portal / Dashboard Component
 * لوحة تحكم مدير المدرسة الابتدائية: متابعة أساتذة التربية البدنية، الانضباط، المخطط السنوي، والتقارير
 */

import React, { useState } from 'react';
import {
  Building2,
  Users,
  Calendar,
  FileCheck2,
  CheckCircle2,
  BarChart3,
  Clock,
  Shield,
  Eye,
  FileText,
  Search,
  Award
} from 'lucide-react';
import { User, DailyNotebookEntry, ClassRoom } from '../../types/spex';
import { PE_LEVELS } from '../../data/algerianCurriculum';

interface DirectorDashboardProps {
  director: User;
  teachers: User[];
  classes: ClassRoom[];
  notebookEntries: DailyNotebookEntry[];
}

export const DirectorDashboard: React.FC<DirectorDashboardProps> = ({
  director,
  teachers,
  classes,
  notebookEntries
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'curriculum' | 'reports'>('overview');

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId) || teachers[0];
  const teacherEntries = notebookEntries.filter((e) => e.teacherId === selectedTeacherId);

  const completedSessions = teacherEntries.filter((e) => e.status === 'منجزة').length;
  const totalSessions = teacherEntries.length || 1;
  const executionRate = Math.round((completedSessions / totalSessions) * 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-emerald-300">
              <Building2 className="w-9 h-9" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  لوحة مدير المدرسة الابتدائية
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> وضع الاطلاع فقط
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">
                {director.firstName} {director.lastName}
              </h2>
              <p className="text-xs sm:text-sm text-teal-100 mt-1">
                مدرسة الأمير عبد القادر الابتدائية - متابعة أداء مادة التربية البدنية والرياضية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10">
            <Users className="w-5 h-5 text-emerald-300" />
            <div className="text-right">
              <div className="text-xs text-teal-200">عدد أساتذة التربية البدنية</div>
              <div className="text-lg font-bold">{teachers.length} أساتذة</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> نظرة عامة والإحصائيات
        </button>
        <button
          onClick={() => setActiveTab('teachers')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'teachers'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" /> أساتذة المادة بالمدرسة ({teachers.length})
        </button>
        <button
          onClick={() => setActiveTab('curriculum')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'curriculum'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calendar className="w-4 h-4" /> المخطط السنوي والكراس اليومي
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'reports'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" /> التقارير والحضور
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">الأقسام المبرمجة</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{classes.length} أقسام</div>
              <div className="text-xs text-slate-500 mt-1">1 إلى 5 ابتدائي</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">نسبة تنفيذ الكراس اليومي</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-600">{executionRate}%</div>
              <div className="text-xs text-slate-500 mt-1">{completedSessions} حصص منجزة</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">إجمالي التلاميذ</span>
                <Award className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                {classes.reduce((acc, c) => acc + c.studentCount, 0)} تلميذ
              </div>
              <div className="text-xs text-slate-500 mt-1">موزعين على الأقسام</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">الحالة الإدارية للتربية البدنية</span>
                <Shield className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-lg font-black text-emerald-700">مطابقة للمنهاج الرسمية</div>
              <div className="text-xs text-slate-500 mt-1">مطابقة لمعايير التربية الوطنية</div>
            </div>
          </div>

          {/* Teacher Selector & Daily Notebook Overview */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-600" />
                <span>متابعة الكراس اليومي لأساتذة الابتدائي بالمدرسة</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">اختر الأستاذ:</span>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="p-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName} ({t.specialization})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedTeacher && (
              <div className="space-y-4">
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-4">
                  <img
                    src={selectedTeacher.avatar}
                    alt={selectedTeacher.firstName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-emerald-600"
                  />
                  <div>
                    <h4 className="font-bold text-slate-900">
                      الأستاذ: {selectedTeacher.firstName} {selectedTeacher.lastName}
                    </h4>
                    <p className="text-xs text-slate-600">
                      خبرة: {selectedTeacher.yearsExperience} سنوات | البريد: {selectedTeacher.email}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <th className="p-3 font-bold">التاريخ والتوقيت</th>
                        <th className="p-3 font-bold">القسم</th>
                        <th className="p-3 font-bold">الحصة التعلمية</th>
                        <th className="p-3 font-bold">الحالة</th>
                        <th className="p-3 font-bold">ملاحظة الأستاذ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {teacherEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/60">
                          <td className="p-3 font-medium text-slate-900">
                            {entry.executionDate} <span className="text-slate-400">({entry.timeSlot})</span>
                          </td>
                          <td className="p-3 font-bold text-slate-800">{entry.className}</td>
                          <td className="p-3 font-medium text-slate-700">{entry.sessionId}</td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-1 rounded-full font-bold ${
                                entry.status === 'منجزة'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : entry.status === 'مؤجلة'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {entry.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 max-w-xs truncate">{entry.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'teachers' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <span>قائمة أساتذة التربية البدنية المسجلين بالمدرسة</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teachers.map((t) => (
              <div key={t.id} className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all flex items-start gap-4">
                <img src={t.avatar} alt={t.firstName} className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500" />
                <div className="flex-1 space-y-1">
                  <h4 className="font-bold text-slate-900">{t.firstName} {t.lastName}</h4>
                  <p className="text-xs text-slate-600">{t.specialization}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> خبرة {t.yearsExperience} سنوات</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">نشط</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'curriculum' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <span>استطلاع المخطط السنوي الوزاري للطور الابتدائي</span>
            </h3>
            <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> وضع الاطلاع غير القابل للتعديل
            </span>
          </div>
          <p className="text-xs text-slate-600">
            يمكن لمدير المدرسة الاطلاع الكامل على التوزيع السنوي للحصص البيداغوجية لمادة التربية البدنية الخاصة بالأقسام الابتدائية (1 إلى 5 ابتدائي) دون صلاحية تعديل الوثائق.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {PE_LEVELS.map((lvl) => (
              <div key={lvl.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="font-bold text-slate-900 text-sm">{lvl.name}</div>
                <div className="text-xs text-slate-500">18 حصة مقسمة وفق المنهاج الرسمي</div>
                <span className="inline-block text-[11px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded-md">
                  مطابق للتسلسل الإجباري
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span>تقارير الحضور والنسب العامة للمدرسة</span>
          </h3>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="text-sm font-bold text-slate-800">تقرير الانضباط الحركي والبدني</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              تسجل مدرسة الأمير عبد القادر الابتدائية نسبة التزام عالية بحصص التربية البدنية والرياضية. تم إنجاز معظم الحصص المبرمجة بالساحة الرئيسية ومراعاة قواعد الأمان والحماية للأطفال.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
