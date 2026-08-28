import React, { useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getAcademicCalendar,
  type AcademicCalendarEvent,
  type AcademicCalendarEventType,
} from '../../data/academicCalendars';

export interface AcademicCalendarSlide {
  id: 'vacations' | 'national' | 'religious' | 'chronology';
  title: string;
  events: AcademicCalendarEvent[];
}

export function buildAcademicCalendarSlides(academicYearId: string): AcademicCalendarSlide[] {
  const events = getAcademicCalendar(academicYearId).events;
  return [
    {
      id: 'vacations',
      title: 'العطل المدرسية',
      events: events.filter((event) => event.type === 'SCHOOL_VACATION'),
    },
    {
      id: 'national',
      title: 'الأعياد الوطنية والمدنية',
      events: events.filter((event) => event.type === 'NATIONAL_HOLIDAY'),
    },
    {
      id: 'religious',
      title: 'الأعياد والمناسبات الدينية',
      events: events.filter(
        (event) => event.type === 'RELIGIOUS_HOLIDAY' || event.type === 'RELIGIOUS_OBSERVANCE'
      ),
    },
    {
      id: 'chronology',
      title: 'الرزنامة الزمنية',
      events: [...events].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    },
  ];
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ar-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function weekday(value: string): string {
  return new Intl.DateTimeFormat('ar-DZ', { weekday: 'long' }).format(
    new Date(`${value}T00:00:00`)
  );
}

function dateRange(event: AcademicCalendarEvent): string {
  return event.startDate === event.endDate
    ? formatDate(event.startDate)
    : `${formatDate(event.startDate)} → ${formatDate(event.endDate)}`;
}

function categoryLabel(type: AcademicCalendarEventType): string {
  if (type === 'SCHOOL_VACATION') return 'عطلة مدرسية';
  if (type === 'NATIONAL_HOLIDAY') return 'عيد وطني';
  if (type === 'RELIGIOUS_HOLIDAY') return 'عيد ديني';
  if (type === 'RELIGIOUS_OBSERVANCE') return 'مناسبة دينية';
  return 'دخول مدرسي';
}

function eventTone(type: AcademicCalendarEventType): string {
  if (type === 'SCHOOL_VACATION') return 'border-amber-200 bg-amber-50/70';
  if (type === 'NATIONAL_HOLIDAY') return 'border-emerald-200 bg-emerald-50/70';
  if (type === 'RELIGIOUS_HOLIDAY') return 'border-indigo-200 bg-indigo-50/70';
  return 'border-slate-200 bg-slate-50';
}

function statusLabel(event: AcademicCalendarEvent): string {
  return event.status === 'PROVISIONAL' ? 'مرتقب' : 'مؤكد';
}

function statusTone(event: AcademicCalendarEvent): string {
  return event.status === 'PROVISIONAL'
    ? 'bg-amber-100 text-amber-800'
    : 'bg-emerald-100 text-emerald-800';
}

function CalendarTable({ slide }: { slide: AcademicCalendarSlide }) {
  const chronology = slide.id === 'chronology';
  const national = slide.id === 'national';
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-[620px] text-right text-sm">
        <thead className="bg-slate-900 text-white">
          <tr>
            <th className="p-3">
              {national ? 'المناسبة' : chronology ? 'التاريخ / الفترة' : 'العطلة / المناسبة'}
            </th>
            <th className="p-3">{national ? 'التاريخ' : chronology ? 'المناسبة' : 'من'}</th>
            {!national && !chronology && <th className="p-3">إلى</th>}
            {national && <th className="p-3">اليوم</th>}
            {chronology && <th className="p-3">التصنيف</th>}
            <th className="p-3">الحالة</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {slide.events.map((event) => (
            <tr
              key={`${slide.id}-${event.name}-${event.startDate}`}
              className={eventTone(event.type)}
            >
              <td className="p-3 font-extrabold text-slate-900">
                {chronology ? dateRange(event) : event.name}
                {event.type === 'RELIGIOUS_OBSERVANCE' && (
                  <span className="mr-2 rounded-full bg-slate-200 px-2 py-1 text-xs font-bold text-slate-700">
                    مناسبة
                  </span>
                )}
              </td>
              {national ? (
                <td className="p-3 font-semibold text-slate-700">{formatDate(event.startDate)}</td>
              ) : chronology ? (
                <td className="p-3 font-semibold text-slate-700">{event.name}</td>
              ) : (
                <>
                  <td className="p-3 font-semibold text-slate-700">
                    {formatDate(event.startDate)}
                  </td>
                  <td className="p-3 font-semibold text-slate-700">{formatDate(event.endDate)}</td>
                </>
              )}
              {national && (
                <td className="p-3 font-semibold text-slate-700">{weekday(event.startDate)}</td>
              )}
              {chronology && (
                <td className="p-3 font-semibold text-slate-700">{categoryLabel(event.type)}</td>
              )}
              <td className="p-3">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-extrabold ${statusTone(event)}`}
                >
                  {statusLabel(event)}
                </span>
                {event.blocksTeaching === false && (
                  <span className="mr-2 text-xs font-semibold text-slate-500">لا توقف التدريس</span>
                )}
              </td>
            </tr>
          ))}
          {slide.id === 'vacations' && (
            <tr className="border-t border-slate-100 bg-slate-50">
              <td className="p-3 font-extrabold text-slate-700">عطلة الصيف</td>
              <td colSpan={2} className="p-3 font-semibold text-slate-500">
                لم يحدد تاريخها بعد
              </td>
              <td className="p-3">—</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

interface AcademicCalendarViewProps {
  academicYearId: string;
  onNavigateToDistribution: () => void;
}

export const AcademicCalendarView: React.FC<AcademicCalendarViewProps> = ({
  academicYearId,
  onNavigateToDistribution,
}) => {
  const slides = useMemo(() => buildAcademicCalendarSlides(academicYearId), [academicYearId]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const calendar = getAcademicCalendar(academicYearId);

  const move = (direction: number) => {
    const next = Math.min(Math.max(activeSlide + direction, 0), slides.length - 1);
    setActiveSlide(next);
    scrollerRef.current?.children[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <section className="space-y-4" dir="rtl">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold text-blue-600">فضاء الأستاذ · التخطيط البيداغوجي</p>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-extrabold text-slate-900">
              <CalendarDays className="h-6 w-6 text-blue-600" /> رزنامة العطل والأعياد
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              العطل المدرسية والأعياد القانونية المعتمدة في تنظيم التوزيع السنوي
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              تُستثنى الأيام غير الدراسية تلقائياً عند إنشاء التوزيع السنوي
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-extrabold text-blue-800">
              السنة الدراسية {academicYearId}
            </span>
            <button
              type="button"
              onClick={onNavigateToDistribution}
              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"
            >
              الانتقال إلى التوزيع السنوي
            </button>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm font-bold text-blue-900">
          الدخول المدرسي للتلاميذ: {formatDate(calendar.schoolStart)}
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="الشريحة السابقة"
            onClick={() => move(-1)}
            disabled={activeSlide === 0}
            className="rounded-xl border border-slate-200 p-2 text-slate-700 disabled:opacity-40"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div
            className="flex flex-1 gap-2 overflow-x-auto px-1"
            role="tablist"
            aria-label="شرائح الرزنامة"
          >
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={activeSlide === index}
                onClick={() => {
                  setActiveSlide(index);
                  scrollerRef.current?.children[index]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                  });
                }}
                className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-extrabold ${activeSlide === index ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600'}`}
              >
                {slide.title}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="الشريحة التالية"
            onClick={() => move(1)}
            disabled={activeSlide === slides.length - 1}
            className="rounded-xl border border-slate-200 p-2 text-slate-700 disabled:opacity-40"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
          onScroll={(event) => {
            const element = event.currentTarget;
            const index = Math.round(element.scrollLeft / Math.max(element.clientWidth, 1));
            const rtlIndex = Math.min(Math.max(Math.abs(index), 0), slides.length - 1);
            if (rtlIndex !== activeSlide) setActiveSlide(rtlIndex);
          }}
        >
          {slides.map((slide) => (
            <article key={slide.id} className="w-full shrink-0 snap-center">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-slate-900">{slide.title}</h3>
                <span className="text-xs font-bold text-slate-400">
                  {slide.events.length} عناصر
                </span>
              </div>
              <CalendarTable slide={slide} />
            </article>
          ))}
        </div>
      </section>
    </section>
  );
};
