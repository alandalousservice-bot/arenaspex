/**
 * SPEX - Geo Hierarchy Public Router (PART A - A5)
 * عام — قبل حارس الجلسة في server.ts بسطر app.use('/api/geo', geoRouter)
 * لا يتطلب مصادقة، يقدّم المديريات/المقاطعات/البلديات/المدارس الوطنية
 */
import { Router } from 'express';
import { prisma } from './prismaClient.js';

export const geoRouter = Router();

// GET /api/geo/directorates ← orderBy wilayaCode+name
geoRouter.get('/directorates', async (_req, res) => {
  try {
    const directorates = await prisma.directorate.findMany({
      orderBy: [{ wilayaCode: 'asc' }, { name: 'asc' }]
    });
    res.json({ success: true, directorates });
  } catch (err) {
    console.error('geo directorates error:', err);
    res.status(500).json({ success: false, error: 'تعذر جلب المديريات.' });
  }
});

// GET /api/geo/directorates/:id/districts ← مقاطعاتها فقط
geoRouter.get('/directorates/:id/districts', async (req, res) => {
  try {
    const { id } = req.params;
    const directorate = await prisma.directorate.findUnique({ where: { id } });
    if (!directorate) {
      return res.status(404).json({ success: false, error: 'المديرية غير موجودة.' });
    }
    const districts = await prisma.inspectionDistrict.findMany({
      where: { directorateId: id },
      orderBy: [{ districtNumber: 'asc' }, { name: 'asc' }]
    });
    res.json({ success: true, districts });
  } catch (err) {
    console.error('geo districts error:', err);
    res.status(500).json({ success: false, error: 'تعذر جلب المقاطعات.' });
  }
});

// GET /api/geo/directorates/:id/municipalities ← بلدياتها فقط
geoRouter.get('/directorates/:id/municipalities', async (req, res) => {
  try {
    const { id } = req.params;
    const directorate = await prisma.directorate.findUnique({ where: { id } });
    if (!directorate) {
      return res.status(404).json({ success: false, error: 'المديرية غير موجودة.' });
    }
    const municipalities = await prisma.municipality.findMany({
      where: { directorateId: id },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, municipalities });
  } catch (err) {
    console.error('geo municipalities error:', err);
    res.status(500).json({ success: false, error: 'تعذر جلب البلديات.' });
  }
});

// GET /api/geo/schools?municipalityId=|&districtId=|&commune= ← مدارسها فقط (take 500) بدون أي تسريب
geoRouter.get('/schools', async (req, res) => {
  try {
    const { municipalityId, districtId, commune } = req.query as {
      municipalityId?: string;
      districtId?: string;
      commune?: string;
    };

    const where: any = {};

    if (municipalityId) {
      where.municipalityId = String(municipalityId);
    }
    if (districtId) {
      where.inspectionDistrictId = String(districtId);
    }

    // commune param: نبحث في البلديات التي اسمها يحتوي على النص ثم نرجع مدارسها
    if (commune && !municipalityId) {
      const search = String(commune).trim();
      if (search) {
        const matchingMunicipalities = await prisma.municipality.findMany({
          where: { name: { contains: search, mode: 'insensitive' } },
          select: { id: true }
        });
        const ids = matchingMunicipalities.map((m) => m.id);
        if (ids.length === 0) {
          return res.json({ success: true, schools: [] });
        }
        where.municipalityId = { in: ids };
      }
    }

    // إذا لم يُحدد أي فلتر، نُرجع مدارس محدودة (take 500) كإجراء أمان لمنع التسريب الكامل
    // يُفضل أن يُحدد العميل بلدية أو مقاطعة
    const schools = await prisma.school.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      take: 500,
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, schools });
  } catch (err) {
    console.error('geo schools error:', err);
    res.status(500).json({ success: false, error: 'تعذر جلب المدارس.' });
  }
});

// GET /api/geo/districts/:id/communes للبلديات الكائنة بها
geoRouter.get('/districts/:id/communes', async (req, res) => {
  try {
    const { id } = req.params;
    const district = await prisma.inspectionDistrict.findUnique({ where: { id } });
    if (!district) {
      return res.status(404).json({ success: false, error: 'المقاطعة غير موجودة.' });
    }

    // المنطق: المقاطعة تنتمي لمديرية، فنرجع بلديات تلك المديرية
    // + أيضاً بلديات لديها مدارس مرتبطة بهذه المقاطعة (إن وُجدت)
    const directorateId = district.directorateId;

    // مدارس مرتبطة مباشرة بالمقاطعة (إن وُجد توزيع مستقبلي)
    const schoolsInDistrict = await prisma.school.findMany({
      where: { inspectionDistrictId: id },
      select: { municipalityId: true }
    });
    const municipalityIdsFromSchools = Array.from(new Set(schoolsInDistrict.map((s) => s.municipalityId)));

    let municipalities;
    if (municipalityIdsFromSchools.length > 0) {
      municipalities = await prisma.municipality.findMany({
        where: {
          OR: [{ directorateId }, { id: { in: municipalityIdsFromSchools } }]
        },
        orderBy: { name: 'asc' }
      });
      // deduplicate by id
      const seen = new Set<string>();
      municipalities = municipalities.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
    } else {
      municipalities = await prisma.municipality.findMany({
        where: { directorateId },
        orderBy: { name: 'asc' }
      });
    }

    res.json({ success: true, municipalities, communes: municipalities });
  } catch (err) {
    console.error('geo districts communes error:', err);
    res.status(500).json({ success: false, error: 'تعذر جلب البلديات للمقاطعة.' });
  }
});
