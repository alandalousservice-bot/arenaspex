import React from 'react';
import { School } from 'lucide-react';

interface InspectorDistrictChartProps {
  chartData: Array<{ name: string; count: number }>;
}

export const InspectorDistrictChart: React.FC<InspectorDistrictChartProps> = ({ chartData }) => {
  const maxCount = Math.max(...chartData.map((d) => d.count), 1);

  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
            <School className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">توزيع أساتذة المقاطعة حسب الابتدائيات</h3>
            <p className="text-[10px] text-slate-500 font-bold">تغطية الأستاذية والتأطير التربوي للمؤسسات</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-1">
        {chartData.map((item) => {
          const percentage = Math.round((item.count / maxCount) * 100);
          return (
            <div key={item.name} className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span className="truncate max-w-[70%]">{item.name}</span>
                <span className="text-teal-700 font-extrabold">{item.count} أساتذة</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-teal-500 to-emerald-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
