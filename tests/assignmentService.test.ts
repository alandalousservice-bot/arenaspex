import { describe, it, expect, vi, beforeEach } from 'vitest';

// نموذج مبسّط لعميل Prisma يحاكي الاستدعاءات التي يستخدمها assignmentService فقط،
// دون الحاجة لقاعدة بيانات حقيقية أو محرك Prisma مولَّد.
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
    update: vi.fn()
  }
};

vi.mock('../src/server/prismaClient.js', () => ({ prisma: mockPrisma }));

const { reassignTeacher, reassignAllForInspector, bulkReassignAll, removeAssignment } = await import(
  '../src/server/assignmentService'
);

function makeTeacher(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 't1',
    role: 'teacher',
    directorateId: 'dir_setif',
    districtId: 'dist_7',
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
    status: 'active',
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('reassignTeacher', () => {
  it('لا يُسنِد أستاذاً لم يستكمل بياناته المهنية بعد (بلا مديرية/مقاطعة)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeTeacher({ directorateId: '', districtId: '' }));

    const result = await reassignTeacher('t1');

    expect(result).toBeNull();
    expect(mockPrisma.inspectorAssignment.upsert).not.toHaveBeenCalled();
  });

  it('يتجاهل المعرّف الذي لا يخص أستاذاً (مثلاً مفتش أو غير موجود)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeInspector());

    const result = await reassignTeacher('i1');

    expect(result).toBeNull();
  });

  it('يربط الأستاذ بأول مفتش نشط مطابق لنفس المديرية والمقاطعة بحالة Active', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeTeacher()); // teacher lookup
    mockPrisma.user.findFirst.mockResolvedValue(makeInspector()); // matching inspector lookup
    mockPrisma.inspectorAssignment.findUnique.mockResolvedValue(null); // no prior assignment
    mockPrisma.inspectorAssignment.upsert.mockImplementation(({ create }) => create);

    const result = await reassignTeacher('t1');

    expect(result).toMatchObject({ inspectorId: 'i1', status: 'Active' });
    expect(mockPrisma.inspectorAssignment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { teacherId: 't1' } })
    );
  });

  it('يضع الحالة Pending عند عدم وجود أي مفتش نشط مطابق', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeTeacher()); // teacher
    mockPrisma.user.findFirst.mockResolvedValue(null); // no matching inspector found
    mockPrisma.inspectorAssignment.findUnique.mockResolvedValue(null);
    mockPrisma.inspectorAssignment.upsert.mockImplementation(({ create }) => create);

    const result = await reassignTeacher('t1');

    expect(result).toMatchObject({ inspectorId: null, status: 'Pending', assignedAt: null });
  });

  it('يضع الحالة Changed عند تغيّر المفتش المطابق عن الإسناد السابق', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeTeacher());
    mockPrisma.user.findFirst.mockResolvedValue(makeInspector({ id: 'i2' }));
    mockPrisma.inspectorAssignment.findUnique.mockResolvedValue({
      teacherId: 't1',
      inspectorId: 'i1', // مفتش سابق مختلف
      status: 'Active'
    });
    mockPrisma.inspectorAssignment.upsert.mockImplementation(({ update }) => update);

    const result = await reassignTeacher('t1');

    expect(result).toMatchObject({ inspectorId: 'i2', status: 'Changed' });
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
    mockPrisma.inspectorAssignment.upsert.mockImplementation(({ create }) => create);

    const affectedCount = await reassignAllForInspector('i1');

    // يشمل الأستاذ القديم المرتبط سابقاً + الأستاذ الجديد المطابق لنفس المقاطعة
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
    mockPrisma.inspectorAssignment.upsert.mockImplementation(({ create }) => create);

    const affectedCount = await reassignAllForInspector('i1');

    expect(affectedCount).toBe(1);
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
  });
});

describe('bulkReassignAll', () => {
  it('يلخّص عدد الأساتذة حسب الحالة الناتجة بعد إعادة الإسناد الشامل', async () => {
    mockPrisma.user.findMany.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);
    mockPrisma.user.findUnique.mockImplementation(async ({ where: { id } }: any) => {
      if (id === 't1') return makeTeacher({ id: 't1' });
      if (id === 't2') return makeTeacher({ id: 't2', directorateId: '', districtId: '' }); // بيانات ناقصة
      return null;
    });
    mockPrisma.user.findFirst.mockResolvedValue(makeInspector());
    mockPrisma.inspectorAssignment.findUnique.mockResolvedValue(null);
    mockPrisma.inspectorAssignment.upsert.mockImplementation(({ create }) => create);

    const summary = await bulkReassignAll();

    expect(summary.total).toBe(2);
    expect(summary.active).toBe(1); // t1 فقط، لأن t2 بلا بيانات مهنية كاملة فيُتجاهل (null)
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
    mockPrisma.inspectorAssignment.update.mockImplementation(({ data }) => data);

    const result = await removeAssignment('t1');

    expect(result).toMatchObject({ status: 'Removed', inspectorId: null, assignedAt: null });
  });
});
