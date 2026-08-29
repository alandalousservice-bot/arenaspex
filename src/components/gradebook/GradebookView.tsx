/**
 * دفتر التنقيط — the canonical assessment workspace.
 * Roster, import, and medical-exemption administration live in StudentsBookView.
 */
import React, { useMemo, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { AssessmentNotebookView } from '../assessment/AssessmentNotebookView';
import { ClassRoom, Student, User } from '../../types/spex';

export interface GradebookViewProps {
  classes?: ClassRoom[];
  students?: Student[];
  currentUser?: User;
}

export const GradebookView: React.FC<GradebookViewProps> = ({
  classes = [],
  students = [],
  currentUser,
}) => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [selectedClassId, setSelectedClassId] = useState(
    params.get('classId') || classes[0]?.id || ''
  );

  React.useEffect(() => {
    if (classes.length && !classes.some((item) => item.id === selectedClassId)) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-7 w-7 text-blue-600" />
          <div>
            <h2 className="text-xl font-black text-slate-900">دفتر التنقيط</h2>
            <p className="mt-1 text-xs text-slate-500">التقييم والكفاءات والتنقيط والنتائج</p>
          </div>
        </div>
      </div>
      {currentUser ? (
        <AssessmentNotebookView
          currentUser={currentUser}
          teacherClasses={classes}
          students={students}
          selectedClassId={selectedClassId}
          onSelectedClassIdChange={setSelectedClassId}
          visibleSections={['competency', 'marks', 'results', 'reports']}
        />
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          تعذر تحميل دفتر التنقيط.
        </div>
      )}
    </div>
  );
};
