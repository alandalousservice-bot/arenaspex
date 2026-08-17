import React from 'react';
import { Activity, AlertTriangle, FileText, Send, Award, Clock, Megaphone } from 'lucide-react';
import { User } from '../../../types/spex';
import { ActivityFeedItem } from '../../../services/inspectorDashboard.service';

interface InspectorActivityFeedProps {
  recentActivities: ActivityFeedItem[];
  lateReportTeachers: Array<{ teacher: User; daysSince: number | null }>;
  inactiveTeachers: User[];
  onSelectTeacher: (teacher: User) => void;
  onOpenNoteModalForTeacher: (teacher: User) => void;
}

export const InspectorActivityFeed: React.FC<InspectorActivityFeedProps> = ({
  recentActivities,
  lateReportTeachers,
  inactiveTeachers,
  onSelectTeacher,
  onOpenNoteModalForTeacher,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* 1. Activity Feed */}
      <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">سجل نشاطات المقاطعة المباشرة</h3>
              <p className="text-[10px] text-slate-500 font-bold">الأنشطة الصادرة المباشرة من المفتش البيداغوجي</p>
            </div>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-full">
            {recentActivities.length} نشاطات الصادرة
          </span>
        </div>

        {recentActivities.length > 0 ? (
          <div className="space-y-2.5">
            {recentActivities.map((act) => (
              <div
                key={act.id}
                className="p-3 bg-slate-50/80 hover:bg-slate-100/80 rounded-2xl transition-colors border border-slate-100 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white shadow-2xs text-emerald-600 border border-slate-100">
                    {act.icon === 'note' && <Send className="w-3.5 h-3.5 text-blue-600" />}
                    {act.icon === 'visit' && <Award className="w-3.5 h-3.5 text-emerald-600" />}
                    {act.icon === 'broadcast' && <Megaphone className="w-3.5 h-3.5 text-amber-600" />}
                    {act.icon === 'lesson_plan' && <FileText className="w-3.5 h-3.5 text-purple-600" />}
                    {act.icon === 'notebook' && <Clock className="w-3.5 h-3.5 text-slate-600" />}
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-900 block">{act.title}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{act.subtitle}</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap dir-ltr">
                  {act.date ? new Date(act.date).toLocaleDateString('ar-DZ') : ''}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-4 space-y-1.5">
            <Activity className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">سجل نشاطات المقاطعة المباشرة فارغ حالياً</p>
            <p className="text-[10px] text-slate-500 max-w-sm mx-auto">
              تظهر الأنشطة هنا حواً وبشكل مباشر فور إرسال المفتش البيداغوجي لملاحظة، تسجيل زيارة تفقدية، أو نشر منشور توجيهي.
            </p>
          </div>
        )}
      </div>

      {/* 2. Alerts & Late Reports */}
      <div className="space-y-4">
        {/* Late Reports Warning Box */}
        <div className="bg-amber-50/80 border border-amber-200/80 p-4 rounded-3xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-black text-amber-950">تنبيهات التقرير الأسبوعي</h4>
            </div>
            <span className="text-[10px] font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
              {lateReportTeachers.length} متأخرين
            </span>
          </div>

          <div className="space-y-2">
            {lateReportTeachers.slice(0, 3).map(({ teacher, daysSince }) => (
              <div
                key={teacher.id}
                className="bg-white p-3 rounded-2xl border border-amber-200/60 shadow-2xs flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-extrabold text-slate-900 block">
                    {teacher.firstName} {teacher.lastName}
                  </span>
                  <span className="text-[10px] text-rose-600 font-bold">
                    لم يوثق دفتر اليوميات منذ {daysSince ?? 'عدة'} أيام
                  </span>
                </div>
                <button
                  onClick={() => {
                    onSelectTeacher(teacher);
                    onOpenNoteModalForTeacher(teacher);
                  }}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] rounded-xl cursor-pointer"
                >
                  توجيه
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Inactive Teachers Box */}
        {inactiveTeachers.length > 0 && (
          <div className="bg-rose-50/80 border border-rose-200/80 p-4 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-rose-950">أساتذة غير نشطين</h4>
              <span className="text-[10px] font-black bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full">
                {inactiveTeachers.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {inactiveTeachers.map((t) => (
                <div key={t.id} className="text-xs font-bold text-rose-900 flex justify-between">
                  <span>
                    {t.firstName} {t.lastName}
                  </span>
                  <span className="text-[10px] text-rose-600 font-normal">{t.schoolName}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
