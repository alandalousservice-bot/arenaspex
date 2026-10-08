import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { buildRecordedInspectionVisit, isExplicitInspectionMark, inspectionMarkLabel, sumExplicitVisitParts } from '../src/services/inspectionVisitIntegrity';
import { InspectorCurriculumAuditView } from '../src/components/dashboard/inspector/InspectorCurriculumAuditView';
import { InspectorDirectChat } from '../src/components/dashboard/inspector/InspectorDirectChat';
import { InspectorBroadcastsView } from '../src/components/dashboard/inspector/InspectorBroadcastsView';
import { InspectorReportsView } from '../src/components/dashboard/inspector/InspectorReportsView';
import { InspectorDashboard } from '../src/components/dashboard/InspectorDashboard';
import { ROLE_TABS, resolveTabForRole } from '../src/lib/routes';
import { Sidebar } from '../src/components/layout/Sidebar';
import type { User } from '../src/types/spex';

const inspector = { id: 'A', role: 'inspector', firstName: 'Synthetic', lastName: 'Inspector' } as User;
const teacher = { id: 'T', role: 'teacher', firstName: 'Synthetic', lastName: 'Teacher' } as User;
describe('Inspector integrity: honest marks, recorded visits and unavailable legacy controls', () => {
  it('constructs a new visit with no mark or final report; zero requires explicit input', () => {
    expect(buildRecordedInspectionVisit('A', { teacherId: 'T' })).toMatchObject({ pedagogicalGrade: null, officialReportGenerated: false });
    expect(inspectionMarkLabel(undefined)).toBe('غير مدخلة');
    expect(inspectionMarkLabel(null)).toBe('غير مدخلة');
    expect(buildRecordedInspectionVisit('A', { pedagogicalGrade: 0 })).toMatchObject({ pedagogicalGrade: 0 });
    expect(inspectionMarkLabel(0)).toBe('0 / 20');
  });
  it('preserves explicit marks and leaves historical input unchanged', () => {
    const historical = { id: 'old', teacherId: 'T', pedagogicalGrade: 16.5, officialReportGenerated: true };
    const copy = structuredClone(historical);
    expect(buildRecordedInspectionVisit('A', historical)).toMatchObject({ pedagogicalGrade: 16.5, officialReportGenerated: false });
    expect(historical).toEqual(copy);
    expect(inspectionMarkLabel(historical.pedagogicalGrade)).toBe('16.5 / 20');
  });
  it('does not fabricate missing submarks; rejects invalid numbers and accepts a fully entered rubric', () => {
    for (const parts of [['', '', ''], ['4', '', ''], ['0', '0', ''], ['9', '4', '2']] as const) expect(sumExplicitVisitParts(parts)).toBeNull();
    expect(sumExplicitVisitParts(['4', '8', '4'])).toBe(16);
    expect(sumExplicitVisitParts(['0', '0', '0'])).toBe(0);
    for (const value of [undefined, null, '', '16', NaN, Infinity, -1, 21]) expect(isExplicitInspectionMark(value)).toBe(false);
  });
  it('neutralizes audit results and excludes the retired audit from allowed Inspector navigation', () => {
    const send = vi.fn();
    const html = renderToStaticMarkup(<InspectorCurriculumAuditView teachers={[teacher]} lessonPlans={[]} onSendNoteToTeacher={send} />);
    expect(html).toContain('غير متاح'); expect(html).not.toContain('%'); expect(html).not.toContain('تأخر'); expect(html).not.toContain('<button');
    expect(send).not.toHaveBeenCalled();
    expect(ROLE_TABS.inspector).not.toContain('inspector_curriculum');
    expect(resolveTabForRole('inspector_curriculum', 'inspector')).toBe('inspector_portal');
    expect(readFileSync('src/components/layout/Sidebar.tsx', 'utf8')).not.toContain("label: 'تدقيق المنهاج'");
    const sidebar = renderToStaticMarkup(<Sidebar currentTab="inspector_portal" onSelectTab={vi.fn()} userRole="inspector" collapsed={false} onToggleCollapse={vi.fn()} />);
    expect(sidebar).not.toContain('100%'); expect(sidebar).not.toContain('تدقيق المنهاج');
  });
  it('removes legacy chat and broadcast composers without claiming encryption, connection or delivery', () => {
    const chat = vi.fn(); const broadcast = vi.fn();
    const html = renderToStaticMarkup(<><InspectorDirectChat inspector={inspector} selectedTeacher={teacher} chatMessages={[]} onSendMessage={chat} /><InspectorBroadcastsView inspector={inspector} broadcasts={[]} onAddBroadcast={broadcast} /></>);
    expect(html).toContain('معطّل'); expect(html).not.toContain('<form'); expect(html).not.toContain('<input'); expect(html).not.toContain('تم الإرسال'); expect(html).not.toContain('مشفر'); expect(html).not.toContain('متصل');
    expect(chat).not.toHaveBeenCalled(); expect(broadcast).not.toHaveBeenCalled();
    const store = readFileSync('src/hooks/usePlatformStore.ts', 'utf8');
    const legacyHandlers = store.slice(store.indexOf('const handleAddBroadcast'), store.indexOf('  useEffect', store.indexOf('const handleAddBroadcast')));
    expect(legacyHandlers).toContain('=> false'); expect(legacyHandlers).not.toContain('setDirectMessages'); expect(legacyHandlers).not.toContain('setBroadcasts');
  });
  it('keeps genuinely persisted teacher-specific InspectorNote guidance available', () => {
    const html = renderToStaticMarkup(<InspectorBroadcastsView inspector={inspector} broadcasts={[]} teacherContext={teacher} onAddBroadcast={vi.fn()} onAddNote={vi.fn()} />);
    expect(html).toContain('حفظ التوجيه'); expect(html).toContain('<form');
    expect(html).not.toContain('البث الجماعي غير متاح');
  });
  it('renders missing marks honestly, retains historical report reading, and labels new records as visits', () => {
    const visits = [buildRecordedInspectionVisit('A', { id: 'new', teacherId: 'T' }), { ...buildRecordedInspectionVisit('A', { teacherId: 'T', pedagogicalGrade: 17 }), id: 'old', officialReportGenerated: true }];
    const html = renderToStaticMarkup(<InspectorReportsView inspector={inspector} teachers={[teacher]} visits={visits} onAddVisit={vi.fn()} />);
    expect(html).toContain('غير مدخلة'); expect(html).toContain('17 / 20'); expect(html).toContain('طباعة سجل الزيارة'); expect(html).toContain('طباعة التقرير المحفوظ');
    expect(html).not.toContain('16 / 20'); expect(html).not.toContain('انضباط ممتاز');
    const form = readFileSync('src/components/dashboard/inspector/InspectorReportsView.tsx', 'utf8');
    expect(form).not.toContain('officialReportGenerated: true');
    expect(form).toContain("setAdminGrade(''); setPedagogicalGrade(''); setSafetyGrade('');");
    const legacy = readFileSync('src/components/dashboard/inspector/InspectorModals.tsx', 'utf8');
    expect(legacy).not.toContain("useState('16.5')"); expect(legacy).not.toContain('|| 16');
  });
  it('does not present unavailable summary counts as real zero metrics', () => {
    const html = renderToStaticMarkup(<InspectorDashboard inspector={inspector} />);
    expect(html).toContain('غير متوفر'); expect(html).not.toContain('>0<');
  });
});
