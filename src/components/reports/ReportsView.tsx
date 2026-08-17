/**
 * SPEX - Reports & Document Export View Component
 * التقارير البيداغوجية والتصدير للطباعة والتوثيق الرسمي
 */

import React, { useState } from 'react';
import { FileSpreadsheet, Printer } from 'lucide-react';
import { User, LessonPlan, InspectorNote } from '../../types/spex';

interface ReportsViewProps {
  user: User;
  lessonPlans: LessonPlan[];
  inspectorNotes: InspectorNote[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ user, lessonPlans, inspectorNotes }) => {
  const [reportType, setReportType] = useState<'session' | 'annual' | 'inspection'>('session');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
            مركز التقارير والتصدير
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <span>استخراج ونشر التقارير البيداغوجية الرسمية</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            توليد المستندات الرسمية للتقديم لدى إدارة المؤسسة والمفتشية البيداغوجية
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة التقرير الشامل</span>
        </button>
      </div>

      {/* Report Type Switcher Tabs */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200/80 w-fit">
        <button
          onClick={() => setReportType('session')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            reportType === 'session' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          تقرير نشاط الحصص
        </button>
        <button
          onClick={() => setReportType('annual')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            reportType === 'annual' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          حصيلة المخطط السنوي
        </button>
        <button
          onClick={() => setReportType('inspection')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            reportType === 'inspection' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          تقرير المتابعة التفتيشية
        </button>
      </div>

      {/* Printable Report Document Card */}
      <div className="bg-white rounded-3xl p-8 border border-slate-300 shadow-md space-y-6 max-w-4xl mx-auto printable-paper text-right">
        {/* Document Header */}
        <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
          <h3 className="text-sm font-black text-slate-900">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
          <h4 className="text-xs font-bold text-slate-700">
            وزارة التربية الوطنية - {user.directorateId === 'setif_de' ? 'مديرية التربية لولاية سطيف (19)' : user.directorateId || 'مديرية التربية والتعليم'}
          </h4>
          <h5 className="text-xs font-bold text-blue-700 mt-2">
            {reportType === 'session'
              ? 'التقرير الدوري لإنجاز حصص مادة التربية البدنية والرياضية'
              : reportType === 'annual'
              ? 'تقرير حصيلة تنفيذ المخطط السنوي للتعلمات'
              : 'تقرير التوجيهات والزيارات البيداغوجية التفتيشية'}
          </h5>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold">
          <div><span className="text-slate-500">{user.role === 'inspector' ? 'المفتش المحرر:' : 'الأستاذ المحرر:'}</span> {user.firstName} {user.lastName}</div>
          <div><span className="text-slate-500">المؤسسة / المدرسة:</span> {user.schoolName || 'مدرسة بالخيري عبد القادر الابتدائية'}</div>
          <div><span className="text-slate-500">المقاطعة:</span> {user.districtId === 'dist_setif_7' ? 'المقاطعة 07 - عين أزال' : user.districtId || 'المقاطعة 07'}</div>
          <div><span className="text-slate-500">تاريخ التقرير:</span> {new Date().toLocaleDateString('ar-DZ')}</div>
        </div>

        {/* Content Section */}
        {reportType === 'session' && (
          <div className="space-y-4 text-xs">
            <h4 className="font-extrabold text-slate-900 text-sm border-r-4 border-blue-600 pr-2">
              ملخص الحصص والمذكرات المولدة:
            </h4>
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl overflow-hidden">
              {lessonPlans.map((lp) => (
                <div key={lp.id} className="p-3 bg-white space-y-1">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{lp.sessionTitle}</span>
                    <span className="text-blue-600">{lp.fieldName}</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{lp.generalObjective}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {reportType === 'annual' && (
          <div className="space-y-3 text-xs leading-relaxed">
            <h4 className="font-extrabold text-slate-900 text-sm border-r-4 border-blue-600 pr-2">
              حصيلة نسبة إنجاز الكفاءات الختامية:
            </h4>
            <p className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              تفيد الحصيلة السنوية بتحقيق نسبة 88% من الأهداف الإجرائية المسطرة لميدان الجري السريع والكرة الطائرة، مع التحكم السليم للتلاميذ في معايير الأمن والسلامة الحركية بالميدان.
            </p>
          </div>
        )}

        {reportType === 'inspection' && (
          <div className="space-y-3 text-xs">
            <h4 className="font-extrabold text-slate-900 text-sm border-r-4 border-emerald-600 pr-2">
              توجيهات المفتش البيداغوجي المعتمدة:
            </h4>
            {inspectorNotes.map((n) => (
              <div key={n.id} className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                <span className="font-bold text-emerald-900 block">{n.title}</span>
                <p className="text-emerald-800">{n.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Footer Signatures */}
        <div className="pt-8 border-t border-slate-200 flex justify-between text-xs font-bold text-slate-700">
          <div>
            <span>توقيع وختم الأستاذ:</span>
            <div className="h-12"></div>
          </div>
          <div>
            <span>ختم مدير المؤسسة:</span>
            <div className="h-12"></div>
          </div>
          <div>
            <span>تأشيرة المفتش البيداغوجي:</span>
            <div className="h-12"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
