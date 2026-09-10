import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const router = readFileSync('src/server/assignmentRouter.ts', 'utf8');
const settings = readFileSync('src/components/settings/SettingsView.tsx', 'utf8');

describe('inspector missing-district creation', () => {
  it('uses an Inspector/Admin-only server endpoint with geographic validation', () => {
    expect(router).toContain("'/inspector/districts'");
    expect(router).toContain("requireRole('inspector', 'admin')");
    expect(router).toContain('لا يمكنك إنشاء مقاطعة خارج مديريتك.');
    expect(router).toContain('tx.inspectionDistrict.create({');
    expect(router).toContain('data: { name, directorateId, districtNumber },');
    expect(router).toContain('eduDistrictId: created.id');
    expect(router).toContain('districtId: created.id');
    expect(router).toContain('districtNumber');
    expect(router).toContain('res.status(201).json({ success: true, district })');
  });

  it('keeps creation in the Inspector settings flow and does not use Setif fallback', () => {
    expect(settings).toContain('createInspectorDistrict');
    expect(settings).toContain('إضافة معلومات المقاطعة التفتيشية');
    expect(settings).toContain('رقم المقاطعة (اختياري)');
    expect(router).not.toContain("directorateId: 'setif_de'");
    expect(router).not.toContain("districtId: 'dist_setif_7'");
  });
});
