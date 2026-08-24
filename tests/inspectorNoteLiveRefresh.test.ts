import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'src');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('inspector teacher guidance live refresh', () => {
  it('waits for persisted InspectorNote save before updating local state', () => {
    const source = read('hooks/usePlatformStore.ts');
    expect(source).toContain('const result = await syncInspectorNoteToDB(note);');
    expect(source).toContain('if (!result.success) return false;');
    expect(source).toContain('prev.filter((item) => item.id !== note.id)');
  });

  it('refreshes teacher detail from PostgreSQL-backed follow-up data after a save event', () => {
    const source = read('components/dashboard/InspectorWorkspacePage.tsx');
    expect(source).toContain("window.addEventListener('inspector-note-saved'");
    expect(source).toContain('fetchInspectorTeacherFollowUp(props.teacherId)');
    expect(source).toContain('detail.guidance?.length || 0');
  });

  it('surfaces a distinct refresh failure after the note was saved', () => {
    const source = read('components/dashboard/inspector/InspectorBroadcastsView.tsx');
    expect(source).toContain('تم حفظ التوجيه، وتعذر تحديث العرض فوراً.');
    expect(source).toContain('await onNoteSaved?.(teacherContext.id)');
  });
});
