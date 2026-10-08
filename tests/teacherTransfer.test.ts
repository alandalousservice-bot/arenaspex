import 'express-async-errors';
import express from 'express';
import cookieParser from 'cookie-parser';
import type { Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Isolated transactional mock. No PrismaClient constructor, .env, persistent
// UAT or remote DB is used. The real services, routes and guards run below.
const memory = vi.hoisted(() => {
  type Row = Record<string, any>;
  const tables: Record<string, Map<string, Row>> = {};
  let sequence = 0;
  let queue = Promise.resolve();
  let failUserWrite = false;
  let retryNext = 0;
  function matches(row: Row, where: Row = {}): boolean {
    return Object.entries(where).every(([key, value]) => {
      if (key === 'OR') return value.some((clause: Row) => matches(row, clause));
      if (key === 'AND') return value.every((clause: Row) => matches(row, clause));
      if (value instanceof Date) return row[key]?.getTime() === value.getTime();
      if (value && typeof value === 'object') {
        if ('in' in value) return value.in.includes(row[key]);
        if ('not' in value) return row[key] !== value.not;
        if ('path' in value)
          return (
            value.path.reduce((obj: Row, part: string) => obj?.[part], row[key]) === value.equals
          );
      }
      return row[key] === value;
    });
  }
  const model = (tableName: string) => {
    tables[tableName] ||= new Map();
    const rows = () => tables[tableName];
    const find = (where: Row) => [...rows().values()].find((row) => matches(row, where));
    const write = (row: Row, data: Row) => {
      if (tableName === 'user' && failUserWrite) {
        failUserWrite = false;
        throw new Error('Injected DB failure');
      }
      for (const [key, value] of Object.entries(data)) if (value !== undefined) row[key] = value;
      if ('updatedAt' in row) row.updatedAt = new Date(Date.now() + ++sequence);
      return structuredClone(row);
    };
    const create = ({ data }: Row) => {
      if (data.id && rows().has(data.id))
        throw Object.assign(new Error('Unique ID'), { code: 'P2002' });
      if (tableName === 'inspectorAssignment' && find({ teacherId: data.teacherId }))
        throw Object.assign(new Error('Unique Teacher'), { code: 'P2002' });
      if (
        tableName === 'inspectorAssignmentTransfer' &&
        data.pendingTeacherId &&
        find({ pendingTeacherId: data.pendingTeacherId })
      )
        throw Object.assign(new Error('Unique pending Teacher'), { code: 'P2002' });
      const row = {
        id: `${tableName}-${++sequence}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...(tableName === 'inspectorAssignmentTransfer'
          ? { status: 'Pending', requestedAt: new Date(), decidedAt: null, effectiveAt: null }
          : {}),
        ...structuredClone(data),
      };
      rows().set(row.id, row);
      return structuredClone(row);
    };
    return {
      findUnique: vi.fn(async ({ where }: Row) => structuredClone(find(where) || null)),
      findFirst: vi.fn(async ({ where }: Row) => structuredClone(find(where) || null)),
      findMany: vi.fn(async ({ where }: Row = {}) =>
        [...rows().values()].filter((row) => matches(row, where)).map((row) => structuredClone(row))
      ),
      count: vi.fn(
        async ({ where }: Row = {}) =>
          [...rows().values()].filter((row) => matches(row, where)).length
      ),
      create: vi.fn(async (args: Row) => create(args)),
      update: vi.fn(async ({ where, data }: Row) => {
        const row = find(where);
        if (!row) throw new Error('Missing fixture');
        return write(row, data);
      }),
      updateMany: vi.fn(async ({ where, data }: Row) => {
        const selected = [...rows().values()].filter((row) => matches(row, where));
        selected.forEach((row) => write(row, data));
        return { count: selected.length };
      }),
      upsert: vi.fn(async ({ where, create: input, update }: Row) => {
        const row = find(where);
        return row ? write(row, update) : create({ data: input });
      }),
      delete: vi.fn(async ({ where }: Row) => {
        const row = find(where);
        if (!row) throw new Error('Missing fixture');
        rows().delete(row.id);
        return structuredClone(row);
      }),
      deleteMany: vi.fn(async ({ where }: Row) => {
        const selected = [...rows().values()].filter((row) => matches(row, where));
        selected.forEach((row) => rows().delete(row.id));
        return { count: selected.length };
      }),
    };
  };
  const models: Row = {};
  // The in-memory transaction queue already serializes transactions. Real SQL
  // row locking is validated separately by the disposable PostgreSQL gate.
  models.$queryRaw = vi.fn(async () => []);
  const prisma: Row = new Proxy(models, {
    get(target, key: string) {
      return (target[key] ||= model(key));
    },
  });
  models.$transaction = vi.fn(async (work: (db: any) => unknown, options: Row) => {
      if (options?.isolationLevel !== 'Serializable') throw new Error('Expected Serializable assignment transaction');
      const previous = queue;
    let release: () => void;
    queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    const backup = structuredClone(tables);
    try {
      if (retryNext) {
        retryNext--;
        throw Object.assign(new Error('Serialization retry'), { code: 'P2034' });
      }
      return await work(prisma);
    } catch (error) {
      for (const name of Object.keys(tables)) {
        tables[name].clear();
        for (const [id, row] of backup[name] || []) tables[name].set(id, row);
      }
      throw error;
    } finally {
      release!();
    }
  });
  return {
    tables,
    prisma,
    model,
    failUserWrite: () => {
      failUserWrite = true;
    },
    retry: () => {
      retryNext = 1;
    },
  };
});
vi.mock('../src/server/prismaClient.js', () => ({ prisma: memory.prisma }));
vi.mock('../src/services/studentRosterPdfImport.service.js', () => ({
  parseStudentRosterPdf: () => {
    throw new Error('PDF outside transfer test');
  },
  StudentRosterPdfImportError: class extends Error {},
}));
const { requestTeacherTransfer, decideTeacherTransfer, updateTeacherProfile } =
  await import('../src/server/assignmentTransferService');
const { reassignTeacher, canInspectorAccessTeacher } =
  await import('../src/server/assignmentService');
const { assignmentRouter } = await import('../src/server/assignmentRouter');
const { apiRouter } = await import('../src/server/apiRouter');
const { requireAuth, requireOperationalAccount } =
  await import('../src/server/middleware/requireAuth');
const { signSession } = await import('../src/server/auth');

let server: Server;
let url: string;
const get = (table: string, id: string) => memory.tables[table]?.get(id);
const current = () => get('inspectorAssignment', 'current-1')!;
const records = (table: string) => [...(memory.tables[table]?.values() || [])];
async function request(actor: string, path: string, body?: unknown, method?: string) {
  const role = get('user', actor)!.role;
  const r = await fetch(url + path, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: {
      'Content-Type': 'application/json',
      Cookie: `spex_session=${signSession({ userId: actor, role })}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, data: await r.json() };
}
const initiate = () =>
  requestTeacherTransfer({
    teacherId: 't1',
    destinationInspectorId: 'B',
    requestedById: 'admin',
    destinationInstitutionId: 'school-b',
  });

beforeAll(async () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api', apiRouter);
  app.use('/api', requireAuth, requireOperationalAccount, assignmentRouter);
  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) =>
    res.status(error.code === 'P2002' ? 409 : 500).json({ error: error.message })
  );
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Not loopback');
  url = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
beforeEach(() => {
  vi.clearAllMocks();
  for (const rows of Object.values(memory.tables)) rows.clear();
  const put = (table: string, row: Record<string, unknown>) => {
    memory.model(table);
    memory.tables[table].set(row.id as string, row);
  };
  for (const [id, role, districtId, directorateId] of [
    ['t1', 'teacher', 'district-a', 'dir-a'],
    ['A', 'inspector', 'district-a', 'dir-a'],
    ['B', 'inspector', 'district-b', 'dir-b'],
    ['C', 'inspector', 'district-c', 'dir-c'],
    ['admin', 'admin', '', ''],
  ]) {
    put('user', {
      id,
      role,
      firstName: id,
      lastName: 'Local',
      username: id,
      email: `${id}@example.test`,
      status: 'active',
      isApprovedByAdmin: true,
      isPlatformOwner: false,
      directorateId,
      districtId,
      eduDirectorateId: directorateId,
      eduDistrictId: districtId,
      institutionId: id === 't1' ? 'school-a' : null,
      eduSchoolId: id === 't1' ? 'school-a' : null,
      schoolName: id === 't1' ? 'المدرسة أ' : null,
      accessExpiresAt: new Date('2099-07-31'),
      createdAt: new Date('2026-09-01'),
      updatedAt: new Date('2026-10-01'),
    });
  }
  for (const suffix of ['a', 'b', 'c']) {
    put('directorate', { id: `dir-${suffix}`, name: `مديرية ${suffix}` });
    put('inspectionDistrict', {
      id: `district-${suffix}`,
      directorateId: `dir-${suffix}`,
      name: `مقاطعة ${suffix}`,
    });
    put('municipality', {
      id: `mun-${suffix}`,
      directorateId: `dir-${suffix}`,
      name: `بلدية ${suffix}`,
    });
    put('school', {
      id: `school-${suffix}`,
      municipalityId: `mun-${suffix}`,
      inspectionDistrictId: `district-${suffix}`,
      name: `المدرسة ${suffix}`,
      municipality: {
        id: `mun-${suffix}`,
        directorateId: `dir-${suffix}`,
        name: `بلدية ${suffix}`,
      },
    });
  }
  put('inspectorAssignment', {
    id: 'current-1',
    teacherId: 't1',
    inspectorId: 'A',
    status: 'Active',
    assignedAt: new Date('2026-09-01'),
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-10-01'),
  });
  put('inspectionVisitRecord', {
    id: 'visit-a',
    inspectorId: 'A',
    teacherId: 't1',
    institutionId: 'school-a',
    createdAt: new Date('2026-10-01'),
    data: {
      id: 'visit-a',
      inspectorId: 'A',
      teacherId: 't1',
      officialReportGenerated: true,
      recommendations: ['تقرير تاريخي'],
    },
  });
  put('inspectorNote', {
    id: 'note-a',
    authorId: 'A',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
    data: { id: 'note-a', teacherId: 't1', content: 'توجيه تاريخي' },
  });
  put('lessonPlan', {
    id: 'memo-t1',
    ownerId: 't1',
    data: { id: 'memo-t1', content: 'Teacher memo' },
  });
  put('notebookEntry', {
    id: 'notebook-t1',
    ownerId: 't1',
    data: { id: 'notebook-t1', content: 'Teacher notebook' },
  });
});

describe(
  'PO-INS-02 controlled transfer (real routes and transactional mock)',
  { timeout: 15000 },
  () => {
    it('keeps A current and B outside the dossier before explicit acceptance', async () => {
      const created = await request('admin', '/api/admin/assignments', {
        teacherId: 't1',
        inspectorId: 'B',
        sourceInspectorId: 'C',
        status: 'Active',
      });
      expect(created.status).toBe(200);
      expect(created.data.transfer.sourceInspectorId).toBe('A');
      expect(current()).toMatchObject({ inspectorId: 'A', status: 'Active' });
      expect(get('user', 't1')!.districtId).toBe('district-a');
      expect(await canInspectorAccessTeacher('A', 't1')).toBe(true);
      expect(await canInspectorAccessTeacher('B', 't1')).toBe(false);
      expect((await request('B', '/api/inspector/teachers/t1/follow-up')).status).toBe(404);
      expect((await request('B', '/api/inspector/transfers')).data.transfers).toHaveLength(1);
      expect((await request('C', '/api/inspector/transfers')).data.transfers).toHaveLength(0);
    });
    it('atomically switches current ownership, geography, roster and access while retaining source history', async () => {
      const t = await initiate();
      const decision = await request('B', `/api/inspector/transfers/${t.id}/accept`, {
        teacherId: 'another',
        sourceInspectorId: 'C',
      });
      expect(decision.status).toBe(200);
      expect(current()).toMatchObject({ inspectorId: 'B', status: 'Changed' });
      expect(records('inspectorAssignment')).toHaveLength(1);
      expect(get('user', 't1')).toMatchObject({
        directorateId: 'dir-b',
        eduDirectorateId: 'dir-b',
        districtId: 'district-b',
        eduDistrictId: 'district-b',
        institutionId: 'school-b',
        eduSchoolId: 'school-b',
      });
      expect(get('inspectorAssignmentTransfer', t.id)).toMatchObject({
        status: 'Accepted',
        pendingTeacherId: null,
        sourceInspectorId: 'A',
        sourceDistrictId: 'district-a',
        destinationInspectorId: 'B',
        decidedById: 'B',
        requestedById: 'admin',
      });
      expect(get('inspectorAssignmentTransfer', t.id)!.effectiveAt).toBeInstanceOf(Date);
      expect((await request('A', '/api/inspector/teachers')).data.teachers).toHaveLength(0);
      expect(
        (await request('B', '/api/inspector/teachers')).data.teachers.map((u: any) => u.id)
      ).toEqual(['t1']);
      expect(await canInspectorAccessTeacher('A', 't1')).toBe(false);
      expect(await canInspectorAccessTeacher('B', 't1')).toBe(true);
      expect(memory.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: 'Serializable',
      });
    });
    it('records rejection and reason without changing current Teacher/assignment', async () => {
      const beforeTeacher = structuredClone(get('user', 't1'));
      const beforeAssignment = structuredClone(current());
      const t = await initiate();
      expect(
        (await request('B', `/api/inspector/transfers/${t.id}/reject`, { reason: 'سبب الرفض' }))
          .status
      ).toBe(200);
      expect(current()).toEqual(beforeAssignment);
      expect(get('user', 't1')).toEqual(beforeTeacher);
      expect(get('inspectorAssignmentTransfer', t.id)).toMatchObject({
        status: 'Rejected',
        rejectionReason: 'سبب الرفض',
        decidedById: 'B',
        effectiveAt: null,
      });
      expect(await canInspectorAccessTeacher('B', 't1')).toBe(false);
    });
    it('retains A authored visit/report/note in entity-specific archive without reading current Teacher profile', async () => {
      const t = await initiate();
      await decideTeacherTransfer(t.id, 'B', 'Accepted');
      get('user', 't1')!.schoolName = 'Future private profile';
      memory.prisma.user.findUnique.mockClear();
      const archived = await request('A', '/api/inspector/archive?teacherId=other');
      expect(archived.status).toBe(200);
      expect(archived.data.visits[0]).toMatchObject({ id: 'visit-a', inspectorId: 'A' });
      expect(archived.data.notes[0]).toMatchObject({ id: 'note-a', authorId: 'A' });
      expect(JSON.stringify(archived.data)).not.toContain('Future private profile');
      expect(memory.prisma.user.findUnique).not.toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 't1' } })
      );
      expect((await request('C', '/api/inspector/archive')).data.visits).toHaveLength(0);
    });
    it('revokes A access to current/future profiles, timetables, memos, notebook and new visits', async () => {
      const t = await initiate();
      await decideTeacherTransfer(t.id, 'B', 'Accepted');
      expect((await request('A', '/api/inspector/teachers/t1/follow-up')).status).toBe(404);
      expect(
        (await request('A', '/api/inspector/teachers/t1/weekly-timetable?academicYearId=2026-2027'))
          .status
      ).toBe(403);
      expect((await request('A', '/api/db/users')).data.users.some((u: any) => u.id === 't1')).toBe(
        false
      );
      expect((await request('A', '/api/db/lesson-plans')).data.lessonPlans).toHaveLength(0);
      expect((await request('A', '/api/db/notebook')).data.dailyNotebook).toHaveLength(0);
      expect(
        (await request('A', '/api/inspection-visits', { teacherId: 't1', id: 'future-a' })).status
      ).toBe(403);
      expect((await request('B', '/api/db/lesson-plans')).data.lessonPlans).toHaveLength(1);
      expect(
        (await request('B', '/api/inspection-visits', { teacherId: 't1', id: 'future-b' })).status
      ).toBe(201);
      expect(
        (await request('A', '/api/inspector/archive')).data.visits.map((v: any) => v.id)
      ).toEqual(['visit-a']);
    });
    it('never grants B write/authorship over A historical notes or visit report', async () => {
      const t = await initiate();
      await decideTeacherTransfer(t.id, 'B', 'Accepted');
      const before = structuredClone(get('inspectionVisitRecord', 'visit-a'));
      expect(
        (
          await request('B', '/api/db/inspector-notes', {
            note: { id: 'note-a', teacherId: 't1', authorId: 'B', content: 'forged' },
          })
        ).status
      ).toBe(403);
      expect(
        (
          await request('B', '/api/inspection-visits', {
            id: 'visit-a',
            teacherId: 't1',
            inspectorId: 'B',
            recommendations: ['forged'],
          })
        ).status
      ).toBe(409);
      expect(get('inspectionVisitRecord', 'visit-a')).toEqual(before);
      expect(get('inspectorNote', 'note-a')!.authorId).toBe('A');
    });
    it('rejects Inspector C IDOR for both accept and reject', async () => {
      const t = await initiate();
      for (const decision of ['accept', 'reject'])
        expect(
          (
            await request('C', `/api/inspector/transfers/${t.id}/${decision}`, {
              destinationInspectorId: 'C',
            })
          ).status
        ).toBe(403);
      expect(current().inspectorId).toBe('A');
      expect(get('inspectorAssignmentTransfer', t.id)!.status).toBe('Pending');
    });
    it('rejects stale source revisions and second decisions', async () => {
      const t = await initiate();
      current().updatedAt = new Date('2090-01-01');
      await expect(decideTeacherTransfer(t.id, 'B', 'Accepted')).rejects.toMatchObject({
        code: 'CONFLICT',
      });
      expect(current().inspectorId).toBe('A');
      current().updatedAt = t.sourceAssignmentUpdatedAt;
      await decideTeacherTransfer(t.id, 'B', 'Accepted');
      await expect(decideTeacherTransfer(t.id, 'B', 'Accepted')).rejects.toMatchObject({
        code: 'CONFLICT',
      });
      await expect(decideTeacherTransfer(t.id, 'B', 'Rejected')).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });
    it('permits only one concurrent acceptance and one current assignment', async () => {
      const t = await initiate();
      const results = await Promise.allSettled([
        decideTeacherTransfer(t.id, 'B', 'Accepted'),
        decideTeacherTransfer(t.id, 'B', 'Accepted'),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
      expect(records('inspectorAssignment')).toHaveLength(1);
      expect(current().inspectorId).toBe('B');
      expect(
        records('inspectorAssignmentTransfer').filter((t) => t.status === 'Accepted')
      ).toHaveLength(1);
    });
    it('rolls back an injected failure after assignment switch; no orphan or partial geography', async () => {
      const t = await initiate();
      const old = structuredClone(current());
      memory.failUserWrite();
      await expect(decideTeacherTransfer(t.id, 'B', 'Accepted')).rejects.toThrow(
        'Injected DB failure'
      );
      expect(current()).toEqual(old);
      expect(get('user', 't1')!.districtId).toBe('district-a');
      expect(get('inspectorAssignmentTransfer', t.id)!.status).toBe('Pending');
    });
    it('does not delete Teacher, historical records or pedagogical data', async () => {
      const snapshots = [
        'inspectionVisitRecord',
        'inspectorNote',
        'lessonPlan',
        'notebookEntry',
      ].map((table) => [table, structuredClone(records(table))] as const);
      const t = await initiate();
      await decideTeacherTransfer(t.id, 'B', 'Accepted');
      expect(get('user', 't1')).toBeTruthy();
      for (const [table, snapshot] of snapshots) expect(records(table)).toEqual(snapshot);
      expect(memory.prisma.user.delete).not.toHaveBeenCalled();
    });
    it('preserves current Inspector when institution changes within the same district', async () => {
      const updated = await updateTeacherProfile('t1', {
        schoolName: 'Institution change',
        districtId: 'district-a',
        directorateId: 'dir-a',
      });
      expect(updated.schoolName).toBe('Institution change');
      expect((await reassignTeacher('t1'))!.inspectorId).toBe('A');
      expect(records('inspectorAssignmentTransfer')).toHaveLength(0);
      current().status = 'Changed';
      expect((await reassignTeacher('t1'))!.status).toBe('Changed');
    });
    it('preserves normal first assignment creation and destination Inspector acceptance', async () => {
      memory.tables.inspectorAssignment.clear();
      const created = await request('admin', '/api/admin/assignments', {
        teacherId: 't1',
        inspectorId: 'A',
      });
      expect(created.status).toBe(200);
      expect(created.data.assignment.status).toBe('Pending');
      const decision = await request('A', '/api/inspector/assignments/t1/accept', {});
      expect(decision.status).toBe(200);
      expect(decision.data.assignment.status).toBe('Active');
      expect(records('inspectorAssignmentTransfer')).toHaveLength(0);
    });
    it('reuses Teacher professional-data as explicit request without updating source district early', async () => {
      const result = await request(
        't1',
        '/api/teacher/professional-data',
        {
          directorateId: 'dir-b',
          districtId: 'district-b',
          municipalityId: 'mun-b',
          institutionId: 'school-b',
        },
        'PUT'
      );
      expect(result.status).toBe(200);
      expect(result.data.transfer.requestedById).toBe('t1');
      expect(get('user', 't1')!.districtId).toBe('district-a');
      expect(current().inspectorId).toBe('A');
      expect((await request('t1', '/api/teacher/assignment')).data.transfer.status).toBe('Pending');
    });
    it('blocks generic profile and batch bypasses for a current Teacher', async () => {
      expect(
        (
          await request('t1', '/api/db/users', {
            user: { id: 't1', districtId: 'district-b', directorateId: 'dir-b' },
          })
        ).status
      ).toBe(409);
      const batch = await request('admin', '/api/db/users/batch', {
        users: [{ id: 't1', districtId: 'district-b', directorateId: 'dir-b' }],
      });
      expect(batch.data.failed).toBe(1);
      expect(get('user', 't1')!.districtId).toBe('district-a');
    });
    it('revalidates destination district/approval and optional institution at acceptance', async () => {
      const t = await initiate();
      get('user', 'B')!.isApprovedByAdmin = false;
      await expect(decideTeacherTransfer(t.id, 'B', 'Accepted')).rejects.toMatchObject({
        code: 'INVALID',
      });
      get('user', 'B')!.isApprovedByAdmin = true;
      get('user', 'B')!.districtId = 'district-c';
      await expect(decideTeacherTransfer(t.id, 'B', 'Accepted')).rejects.toMatchObject({
        code: 'INVALID',
      });
      expect(current().inspectorId).toBe('A');
    });
    it('does not revoke current ownership while a transfer is pending', async () => {
      await initiate();
      expect((await request('admin', '/api/admin/assignments/t1/remove', {})).status).toBe(409);
      expect(current()).toMatchObject({ inspectorId: 'A', status: 'Active' });
      expect(
        (await request('B', '/api/inspector/summary')).data.summary.pendingAssignmentsCount
      ).toBe(1);
      expect(
        (
          await request(
            't1',
            '/api/teacher/professional-data',
            {
              directorateId: 'dir-a',
              districtId: '',
              municipalityId: 'mun-a',
              institutionId: 'school-a',
            },
            'PUT'
          )
        ).status
      ).toBe(409);
      expect(current().inspectorId).toBe('A');
    });
    it('rejects competing pending requests and retries serialization conflicts safely', async () => {
      const t = await initiate();
      await expect(initiate()).rejects.toMatchObject({ code: 'CONFLICT' });
      memory.retry();
      await decideTeacherTransfer(t.id, 'B', 'Accepted');
      expect(current().inspectorId).toBe('B');
      expect(
        readFileSync(
          'prisma/migrations/20261006220000_inspector_assignment_transfers/migration.sql',
          'utf8'
        )
      ).toContain('CREATE UNIQUE INDEX "InspectorAssignmentTransfer_pendingTeacherId_key"');
    });
  }
);
