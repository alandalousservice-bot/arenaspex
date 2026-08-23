import React from 'react';
import { UserCheck, Search, Award, FileText } from 'lucide-react';
import { User } from '../../../types/spex';

interface InspectorTeacherListProps {
  teachers: User[];
  selectedTeacher?: User;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onSelectTeacher: (teacher: User) => void;
}

export const InspectorTeacherList: React.FC<InspectorTeacherListProps> = ({
  teachers,
  selectedTeacher,
  searchTerm,
  onSearchChange,
  onSelectTeacher,
}) => {
  const filteredTeachers = teachers.filter((t) => {
    const fullName = `${t.firstName} ${t.lastName}`.toLowerCase();
    const school = (t.schoolName || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    return fullName.includes(q) || school.includes(q);
  });

  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">أساتذة المقاطعة ({teachers.length})</h3>
            <p className="text-[10px] text-slate-500 font-bold">الأساتذة ذوو الإسناد المقبول فقط</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="بحث باسم الأستاذ أو المدرسة..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pr-8 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredTeachers.map((t) => {
          const meta = t as User & {
            classCount?: number; visitCount?: number; noteCount?: number;
            lastVisitAt?: string | null; assignmentDate?: string | null; followUpStatus?: string;
          };
          const isSelected = t.id === selectedTeacher?.id;

          return (
            <div
              key={t.id}
              onClick={() => onSelectTeacher(t)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                isSelected
                  ? 'bg-emerald-950 text-white border-emerald-800 shadow-md ring-2 ring-emerald-500/50'
                  : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200/80 shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className={`text-xs font-black ${isSelected ? 'text-emerald-300' : 'text-slate-900'}`}>
                    الأستاذ(ة): {t.firstName} {t.lastName}
                  </h4>
                  <span className={`text-[10px] block ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {t.schoolName || 'المؤسسة غير محددة'}
                  </span>
                </div>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-emerald-800 text-emerald-100'
                      : t.status === 'inactive'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                    {t.status === 'inactive' ? 'غير نشط' : 'نشط'}
                </span>
              </div>

              <div className={`flex items-center justify-between text-[10px] pt-1 border-t ${isSelected ? 'border-emerald-800 text-slate-300' : 'border-slate-100 text-slate-500'}`}>
                  <span className="flex items-center gap-1">
                    <Award className="w-3 h-3 text-amber-400" />
                    <span>الزيارات: {meta.visitCount || 0}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-blue-400" />
                    <span>التوجيهات: {meta.noteCount || 0}</span>
                  </span>
                </div>
                <div className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  الأقسام: {meta.classCount ? meta.classCount : 'لا توجد أقسام مسجلة'} · الهاتف: {t.phone || 'غير مضاف'}
                </div>
                <div className={`text-[10px] ${isSelected ? 'text-emerald-200' : 'text-emerald-700'}`}>
                  {meta.followUpStatus || 'لم تتم الزيارة بعد'}
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
