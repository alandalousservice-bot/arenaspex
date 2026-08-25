import { prisma } from './prismaClient.js';

/** Returns the exemption covering the supplied session/assessment date, if any. */
export async function findActiveMedicalExemption(studentId: string, date: Date) {
  return prisma.medicalExemption.findFirst({
    where: {
      studentId,
      issuedOn: { lte: date },
      OR: [{ expiresOn: null }, { expiresOn: { gte: date } }],
    },
    orderBy: [{ issuedOn: 'desc' }, { id: 'desc' }],
  });
}

export async function isStudentMedicallyExempt(studentId: string, date: Date): Promise<boolean> {
  return Boolean(await findActiveMedicalExemption(studentId, date));
}
