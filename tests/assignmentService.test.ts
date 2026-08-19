import { describe, it, expect, vi, beforeEach } from 'vitest';

// نموذج مبسّط لعميل Prisma يحاكي الاستدعاءات التي يستخدمها assignmentService فقط،
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn()
  },
  inspectorAssignment: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
};

vi.mock('../src/server/prismaClient.js', () => ({ prisma: mockPrisma }));

const { reassignTeacher, reassignAllForInspector, bulkReassignAll, removeAssignment, acceptAssignment, rejectAssignment } = await import(
  '../src/server/assignmentService'
);

function makeTeacher(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 't1',
    role: 'teacher',
    directorateId: 'dir_setif',
    districtId: 'dist_7',
    eduDirectorateId: null,
    eduDistrictId: null,
    status: 'active',
    ...overrides
  };
}

function makeInspector(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'i1',
    role: 'inspector',
    directorateId: 'dir_setif',
    districtId: 'dist_7',
    eduDirectorateId: null,
    eduDistrictId: null,
    status: 'active',
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('reassignTeacher - PART B new policy (Pending, no auto Active)', () => {
  it('لا يُسنِد أستاذاً لم يستكمل بياناته المهنية بعد (بلا مديرية/مقاطعة)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeTeacher({ directorateId: '', districtId: '', eduDirectorateId: null, eduDistrictId: null }));

    const result = await reassignTeacher('t1');

    expect(result).toBeNull();
    expect(mockPrisma.inspectorAssignment.upsert).not.toHaveBeenCalled();
  });

  it('يتجاهل المعرّف الذي لا يخص أستاذاً (مثلاً مفتش أو غير موجود)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeInspector());

    const result = await reassignTeacher('i1');

    expect(result).toBeNull();
  });

  it('أول مطابقة = Pending موجهة للمفتش المطابق (inspectorId معبأ, assignedAt=null) — عقد السياسة النهائية', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeTeacher());
    mockPrisma.user.findFirst.mockResolvedValue(makeInspector());
    mockPrisma.inspectorAssignment.findUnique.mockResolvedValue(null);
    mockPrisma.inspectorAssignment.upsert.mockImplementation(({ create }: any) => create);

    const result = await reassignTeacher('t1');

    expect(result).toMatchObject({ inspectorId: 'i1', status: 'Pending', assignedAt: null });
    expect(mockPrisma.inspectorAssignment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { teacherId: 't1' } })
    );
  });

  it('لا يُعيد إخضاع أستاذ Active بنفس المفتش بالفعل', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeTeacher());
    mockPrisma.user.findFirst.mockResolvedValue(makeInspector({ id: 'i1' }));
    mockPrisma.inspectorAssignment.findUnique.mockResolvedValue({
      teacherId: 't1',
      inspectorId: 'i1',
      status: 'Active',
      assignedAt: new Date()
    });

    const result = await reassignTeacher('t1');

    expect(result).toMatchObject({ inspectorId: 'i1', status: 'Active' });
    // يجب ألا يُستدعى upsert لأننا نحافظ على الحالة الفعالة
    expect(mockPrisma.inspectorAssignment.upsert).not.toHaveBeenCalled();
  });

  it('يضع الحالة Pending عند عدم وجود أي مفتش نشط مطابق (inspectorId null)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeTeacher());
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.inspectorAssignment.findUnique.mockResolvedValue(null);
    mockPrisma.inspectorAssignment.upsert.mockImplementation(({ create }: any) => create);

    const result = await reassignTeacher('t1');

    expect(result).toMatchObject({ inspectorId: null, status: 'Pending', assignedAt: null });
  });

  it('عند تغيّر المفتش المطابق عن الإسناد السابق، يُعاد إلى Pending بالمفتش الجديد (لا Changed تلقائياً)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeTeacher());
    mockPrisma.user.findFirst.mockResolvedValue(makeInspector({ id: 'i2' }));
    mockPrisma.inspectorAssignment.findUnique.mockResolvedValue({
      teacherId: 't1',
      inspectorId: 'i1',
      status: 'Active'
    });
    mockPrisma.inspectorAssignment.upsert.mockImplementation(({ update }: any) => update);

    const result = await reassignTeacher('t1');

    expect(result).toMatchObject({ inspectorId: 'i2', status: 'Pending', assignedAt: null });
  });
});

describe('acceptAssignment / rejectAssignment - PART B', () => {
  it('acceptAssignment يقبل فقط سجلاً Pending بنفس المفتش ويحوله لـ Active', async () => {
    mockPrisma.inspectorAssignment.findUnique.mockResolvedValue({
      teacherId: 't1',
      inspectorId: 'i1',
      status: 'Pending'
    });
    mockPrisma.inspectorAssignment.update.mockImplementation(async ({ data }: any) => ({
      teacherId: 't1',
      inspectorId: 'i1',
      ...data
    }));

    const result = await acceptAssignment('t1', 'i1');
    expect(result).toMatchObject({ status: 'Active' });
    expect(result.assignedAt).toBeInstanceOf(Date);
  });

  it('acceptAssignment يرمي NOT_FOUND إن لم يوجد سجل', async () => {
    mockPrisma.inspectorAssignment.findUnique.mockResolvedValue(null);
    await expect(acceptAssignment('t1', 'i1')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('acceptAssignment يرمي FORBIDDEN إن كان المفتش مختلفاً', async () => {
    mockPrisma.inspectorAssignment.findUnique.mockResolvedValue({
      teacherId: 't1',
      inspectorId: 'i2',
      status: 'Pending'
    });
    await expect(acceptAssignment('t1', 'i1')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('acceptAssignment يرمي ALREADY_HANDLED إن لم يكن Pending', async () => {
    mockPrisma.inspectorAssignment.findUnique.mockResolvedValue({
      teacherId: 't1',
      inspectorId: 'i1',
      status: 'Active'
    });
    await expect(acceptAssignment('t1', 'i1')).rejects.toMatchObject({ code: 'ALREADY_HANDLED' });
  });

  it('rejectAssignment يرفض فقط Pending بنفس المفتش ويحوله لـ Removed', async () => {
    mockPrisma.inspectorAssignment.findUnique.mockResolvedValue({
      teacherId: 't1',
      inspectorId: 'i1',
      status: 'Pending'
    });
    mockPrisma.inspectorAssignment.update.mockImplementation(async ({ data }: any) => ({
      teacherId: 't1',
      ...data
    }));
    const result = await rejectAssignment('t1', 'i1', 'سبب تجريبي');
    expect(result).toMatchObject({ status: 'Removed', inspectorId: null, assignedAt: null });
  });
});

describe('reassignAllForInspector', () => {
  it('يعيد احتساب كل الأساتذة المرتبطين حالياً بالمفتش وأي أستاذ جديد مطابق لمقاطعته', async () => {
    mockPrisma.user.findUnique.mockImplementation(async ({ where: { id } }: any) => {
      if (id === 'i1') return makeInspector();
      if (id === 't_old') return makeTeacher({ id: 't_old' });
      if (id === 't_new') return makeTeacher({ id: 't_new' });
      return null;
    });
    mockPrisma.inspectorAssignment.findMany.mockResolvedValue([{ teacherId: 't_old' }]);
    mockPrisma.user.findMany.mockResolvedValue([{ id: 't_new' }]);
    mockPrisma.user.findFirst.mockResolvedValue(makeInspector());
    mockPrisma.inspectorAssignment.findUnique.mockResolvedValue(null);
    mockPrisma.inspectorAssignment.upsert.mockImplementation(({ create }: any) => create);

    const affectedCount = await reassignAllForInspector('i1');

    expect(affectedCount).toBe(2);
  });

  it('لا يبحث عن أساتذة جدد إن كان المفتش غير نشط، لكنه يعيد تقييم من كان مرتبطاً به', async () => {
    mockPrisma.user.findUnique.mockImplementation(async ({ where: { id } }: any) => {
      if (id === 'i1') return makeInspector({ status: 'inactive' });
      if (id === 't_old') return makeTeacher({ id: 't_old' });
      return null;
    });
    mockPrisma.inspectorAssignment.findMany.mockResolvedValue([{ teacherId: 't_old' }]);
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.inspectorAssignment.findUnique.mockResolvedValue(null);
    mockPrisma.inspectorAssignment.upsert.mockImplementation(({ create }: any) => create);

    const affectedCount = await reassignAllForInspector('i1');

    expect(affectedCount).toBe(1);
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
  });
});

describe('bulkReassignAll', () => {
  it('يلخّص عدد الأساتذة حسب الحالة الناتجة بعد إعادة الإسناد الشامل (الآن كلها Pending)', async () => {
    mockPrisma.user.findMany.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);
    mockPrisma.user.findUnique.mockImplementation(async ({ where: { id } }: any) => {
      if (id === 't1') return makeTeacher({ id: 't1' });
      if (id === 't2') return makeTeacher({ id: 't2', directorateId: '', districtId: '', eduDirectorateId: null, eduDistrictId: null });
      return null;
    });
    mockPrisma.user.findFirst.mockResolvedValue(makeInspector());
    mockPrisma.inspectorAssignment.findUnique.mockResolvedValue(null);
    mockPrisma.inspectorAssignment.upsert.mockImplementation(({ create }: any) => create);

    const summary = await bulkReassignAll();

    expect(summary.total).toBe(2);
    expect(summary.pending).toBe(1); // t1 فقط، لأن t2 بلا بيانات مهنية كاملة فيُتجاهل
  });
});

describe('removeAssignment', () => {
  it('يعيد null إن لم يوجد سجل إسناد أصلاً لهذا الأستاذ', async () => {
    mockPrisma.inspectorAssignment.findUnique.mockResolvedValue(null);

    const result = await removeAssignment('unknown');

    expect(result).toBeNull();
    expect(mockPrisma.inspectorAssignment.update).not.toHaveBeenCalled();
  });

  it('يضبط الحالة Removed ويصفّر المفتش وتاريخ الإسناد', async () => {
    mockPrisma.inspectorAssignment.findUnique.mockResolvedValue({ teacherId: 't1', inspectorId: 'i1', status: 'Active' });
    mockPrisma.inspectorAssignment.update.mockImplementation(({ data }: any) => data);

    const result = await removeAssignment('t1');

    expect(result).toMatchObject({ status: 'Removed', inspectorId: null, assignedAt: null });
  });
});
