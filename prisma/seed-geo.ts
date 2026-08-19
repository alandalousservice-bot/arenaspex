/**
 * SPEX — Geo Hierarchy National Seed (PART A - A3)
 * يبذر المديريات (69 ولاية + تقسيم الجزائر 16 إلى 3)، البلديات (1541)، والمدارس الابتدائية (من ecoles)
 *
 * المواصفة:
 * ① المديريات: 69 ولاية من geo.wilayas (id de_XX مبطن) + ولاية 16 = 3 مديريات (شرق/وسط/غرب) وإبقاء setif_de لـ19
 * ② البلديات: كل geo.communes الـ1541 — الاسم العربي أولاً؛ موزعة لمديرية ولايتها (16 ترسل إلى de_16_center)؛
 *    id: muni_{NN}_{norm}؛ تنظيف التكرار بـ(مديرية+اسم NFKD مطبع)؛ createMany مجمعة بـ skipDuplicates chunk=500
 * ③ المدارس الابتدائية حصرياً: ecoles().filter(cycle==='primaire') — وربطها ببلديتها عبر سلسلة المطابقة:
 *    e.commune (فرنسي) ← geoalgeria.name_fr داخل نفس الولاية ← name_ar ← Municipality المعنية؛
 *    id=e.id؛ من بلا مطابقة ⇒ بلدية احتياطية مركبة 'muni_unlinked'. inspectionDistrictId=null
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
// geoalgeria is CommonJS
const geo: any = require('geoalgeria');

// ecoles is ESM
import { ecoles } from '@geoalgeria/ecoles';

const prisma = new PrismaClient();

function pad2(n: number | string): string {
  const num = typeof n === 'string' ? parseInt(n, 10) : n;
  if (Number.isNaN(num)) return String(n).padStart(2, '0');
  return String(num).padStart(2, '0');
}

function normalizeKey(str: string): string {
  return str
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function slugifyFrench(str: string): string {
  return str
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 60) || 'commune';
}

function slugifyArabic(ar: string, fr: string): string {
  let base = ar
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w\u0600-\u06FF-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 60);
  if (!base || base.length < 2 || /^_+$/.test(base)) {
    base = slugifyFrench(fr);
  }
  if (!base) base = 'commune';
  return base;
}

function getDirectorateIdForMunicipality(wilayaCode: number): string {
  if (wilayaCode === 19) return 'setif_de';
  if (wilayaCode === 16) return 'de_16_center';
  return `de_${pad2(wilayaCode)}`;
}

async function seedDirectorates() {
  const wilayas: Array<{ code: number; name_ar: string; name_fr: string }> = geo.wilayas;
  console.log(`📚 geoalgeria wilayas count: ${wilayas.length}`);

  const directoratesToUpsert: Array<{ id: string; name: string; wilayaCode: string }> = [];

  for (const w of wilayas) {
    const code = w.code;
    const nameAr = w.name_ar;
    const wilayaCodeStr = pad2(code);

    if (code === 19) {
      // إبقاء setif_de كما هو لـ19
      directoratesToUpsert.push({
        id: 'setif_de',
        name: `مديرية التربية لولاية ${nameAr}`,
        wilayaCode: '19'
      });
    } else if (code === 16) {
      // الجزائر 16 → 3 مديريات: شرق/وسط/غرب
      directoratesToUpsert.push(
        {
          id: 'de_16_east',
          name: `مديرية التربية لولاية ${nameAr} شرق`,
          wilayaCode: '16'
        },
        {
          id: 'de_16_center',
          name: `مديرية التربية لولاية ${nameAr} وسط`,
          wilayaCode: '16'
        },
        {
          id: 'de_16_west',
          name: `مديرية التربية لولاية ${nameAr} غرب`,
          wilayaCode: '16'
        }
      );
    } else {
      directoratesToUpsert.push({
        id: `de_${wilayaCodeStr}`,
        name: `مديرية التربية لولاية ${nameAr}`,
        wilayaCode: wilayaCodeStr
      });
    }
  }

  console.log(`🏛️ Seeding ${directoratesToUpsert.length} directorates...`);
  for (const d of directoratesToUpsert) {
    await prisma.directorate.upsert({
      where: { id: d.id },
      create: { id: d.id, name: d.name, wilayaCode: d.wilayaCode },
      update: { name: d.name, wilayaCode: d.wilayaCode }
    });
  }
  console.log(`✅ Directorates seeded: ${directoratesToUpsert.length}`);
  return directoratesToUpsert;
}

async function seedMunicipalities() {
  const communes: Array<{ name_fr: string; name_ar: string; wilaya_code: number }> = geo.communes;
  console.log(`🏘️ geo.communes total: ${communes.length}`);

  // إنشاء بلدية احتياطية مركبة مسبقاً (مطلوبة للمدارس غير المطابقة)
  const unlinkedDirId = 'setif_de';
  await prisma.directorate.upsert({
    where: { id: unlinkedDirId },
    create: { id: unlinkedDirId, name: 'مديرية التربية لولاية سطيف', wilayaCode: '19' },
    update: {}
  });

  await prisma.municipality.upsert({
    where: { id: 'muni_unlinked' },
    create: {
      id: 'muni_unlinked',
      name: 'بلدية غير مرتبطة (احتياطية)',
      directorateId: unlinkedDirId
    },
    update: {}
  });

  // تنظيف التكرار بـ (مديرية+اسم NFKD مطبع)
  const dedupMap = new Map<string, { id: string; name: string; directorateId: string }>();
  const communeToMuniKey = new Map<number, string[]>(); // for later mapping? we will use dedupMap for building list

  const municipalitiesForInsert: Array<{ id: string; name: string; directorateId: string }> = [];

  for (const c of communes) {
    const wilayaCode = c.wilaya_code;
    const directorateId = getDirectorateIdForMunicipality(wilayaCode);
    const nameAr = c.name_ar?.trim() || c.name_fr?.trim() || 'بلدية';
    const key = `${directorateId}::${normalizeKey(nameAr)}`;
    if (dedupMap.has(key)) {
      continue; // duplicate cleaned
    }

    const nn = pad2(wilayaCode);
    const slug = slugifyArabic(nameAr, c.name_fr);
    let id = `muni_${nn}_${slug}`;

    // ensure id uniqueness within this batch (if slug collision across different Arabic names that produce same slug)
    let suffix = 1;
    let baseId = id;
    while (municipalitiesForInsert.some((m) => m.id === id) || dedupMapHasId(dedupMap, id)) {
      id = `${baseId}_${suffix}`;
      suffix++;
      if (suffix > 100) break; // safety
    }

    dedupMap.set(key, { id, name: nameAr, directorateId });
    municipalitiesForInsert.push({ id, name: nameAr, directorateId });
  }

  function dedupMapHasId(map: Map<string, { id: string }>, id: string): boolean {
    for (const v of map.values()) {
      if (v.id === id) return true;
    }
    return false;
  }

  console.log(`🏘️ Unique municipalities after dedup (directorate+name): ${municipalitiesForInsert.length} (from ${communes.length})`);

  // كتابة createMany مجمعة بـ skipDuplicates:true chunk=500
  const chunkSize = 500;
  let insertedTotal = 0;
  for (let i = 0; i < municipalitiesForInsert.length; i += chunkSize) {
    const chunk = municipalitiesForInsert.slice(i, i + chunkSize);
    try {
      const result = await prisma.municipality.createMany({
        data: chunk,
        skipDuplicates: true
      });
      insertedTotal += result.count;
      console.log(`  → municipalities chunk ${i / chunkSize + 1}: inserted ${result.count} (total ${insertedTotal})`);
    } catch (err) {
      console.error(`  ❌ municipalities chunk ${i / chunkSize + 1} failed:`, (err as Error).message);
      // fallback to upsert one by one for this chunk
      for (const m of chunk) {
        try {
          await prisma.municipality.upsert({
            where: { id: m.id },
            create: m,
            update: {}
          });
          insertedTotal++;
        } catch (e) {
          // try by unique (directorateId, name)
          try {
            await prisma.municipality.upsert({
              where: { directorateId_name: { directorateId: m.directorateId, name: m.name } },
              create: m,
              update: {}
            });
          } catch (ee) {
            // ignore
          }
        }
      }
    }
  }

  console.log(`✅ Municipalities seeded: attempted ${municipalitiesForInsert.length}, inserted ${insertedTotal} (plus existing)`);
  return dedupMap;
}

async function seedSchools() {
  const allEcoles: Array<{
    id: string;
    name: string;
    name_ar: string;
    name_fr: string;
    wilaya_code: string;
    commune_code: string;
    commune: string;
    lat: number | null;
    lng: number | null;
    cycle: string;
  }> = ecoles();

  const primaire = allEcoles.filter((e) => e.cycle === 'primaire');
  console.log(`🏫 ecoles total: ${allEcoles.length}, primaire: ${primaire.length}`);

  // Build geo communes index by wilaya for matching
  const communes: Array<{ name_fr: string; name_ar: string; wilaya_code: number }> = geo.communes;
  const communesByWilaya = new Map<number, typeof communes>();
  for (const c of communes) {
    const code = c.wilaya_code;
    if (!communesByWilaya.has(code)) communesByWilaya.set(code, []);
    communesByWilaya.get(code)!.push(c);
  }

  // Fetch all municipalities from DB for lookup (including previously seeded)
  const dbMunicipalities = await prisma.municipality.findMany();
  const muniLookup = new Map<string, string>(); // key: directorateId::normalizedName -> id
  for (const m of dbMunicipalities) {
    const key = `${m.directorateId}::${normalizeKey(m.name)}`;
    if (!muniLookup.has(key)) {
      muniLookup.set(key, m.id);
    }
  }
  console.log(`  → DB municipalities for lookup: ${dbMunicipalities.length}`);

  // Also ensure muni_unlinked exists in lookup
  if (!muniLookup.has(`${'setif_de'}::${normalizeKey('بلدية غير مرتبطة (احتياطية)')}`)) {
    // fallback direct id
    muniLookup.set('unlinked', 'muni_unlinked');
  }

  const schoolsForInsert: Array<{ id: string; name: string; municipalityId: string; wilayaCode: string; inspectionDistrictId: string | null }> = [];
  let matchedCount = 0;
  let unlinkedCount = 0;

  for (const s of primaire) {
    const wilayaNum = parseInt(s.wilaya_code, 10);
    const wilayaPadded = s.wilaya_code.padStart(2, '0');
    const directorateId = getDirectorateIdForMunicipality(wilayaNum);

    const communeFr = (s.commune || '').trim();
    let matchedMuniId: string | null = null;

    if (communeFr) {
      const geoList = communesByWilaya.get(wilayaNum) || [];
      // 1) exact French match within wilaya
      let geoMatch = geoList.find((gc) => gc.name_fr.trim().toLowerCase() === communeFr.toLowerCase());
      // 2) includes fallback
      if (!geoMatch) {
        const lowerCommune = communeFr.toLowerCase();
        geoMatch = geoList.find((gc) => {
          const gcLower = gc.name_fr.toLowerCase();
          return gcLower.includes(lowerCommune) || lowerCommune.includes(gcLower);
        });
      }
      // 3) if geoMatch found, map via its Arabic name to municipality
      if (geoMatch) {
        const key = `${directorateId}::${normalizeKey(geoMatch.name_ar)}`;
        matchedMuniId = muniLookup.get(key) || null;
        // also try direct French normalized -> Arabic? but we already have mapping via dedup
        if (!matchedMuniId) {
          // fallback: search municipalities in same directorate whose name normalized equals geoMatch.name_ar normalized (already attempted) OR whose French slug matches?
          // we already attempted, so try any municipality in directorate with same normalized French? not stored
          // attempt to find by Arabic name_ar from geoMatch directly in dbMunicipalities list for that directorate
          const candidate = dbMunicipalities.find((m) => m.directorateId === directorateId && normalizeKey(m.name) === normalizeKey(geoMatch!.name_ar));
          if (candidate) matchedMuniId = candidate.id;
        }
      }

      // 4) If still not matched, try direct municipality name matching with communeFr (maybe French commune name equals Arabic municipality name after normalization? unlikely, but try)
      if (!matchedMuniId) {
        // try to find municipality in directorate where normalized name equals normalized communeFr (French vs Arabic mismatch likely fails)
        // we will also try to find municipality whose French slug equals communeFr slug
        const slugFr = slugifyFrench(communeFr);
        // search for municipality id that ends with slugFr and same wilaya NN
        const possible = dbMunicipalities.filter((m) => m.directorateId === directorateId && m.id.includes(slugFr));
        if (possible.length === 1) matchedMuniId = possible[0].id;
      }
    }

    if (!matchedMuniId) {
      matchedMuniId = 'muni_unlinked';
      unlinkedCount++;
    } else {
      matchedCount++;
    }

    const schoolName = (s.name_ar || s.name || s.name_fr || 'مدرسة ابتدائية').trim().substring(0, 200);

    schoolsForInsert.push({
      id: s.id,
      name: schoolName,
      municipalityId: matchedMuniId,
      wilayaCode: wilayaPadded,
      inspectionDistrictId: null // يظل null دائماً حسب المواصفة — توزيع المدارس على المقاطعات غير موثق رسمياً
    });
  }

  console.log(`🏫 Schools matching: matched=${matchedCount}, unlinked=${unlinkedCount}, total=${schoolsForInsert.length}`);

  // Chunk insert 500
  const chunkSize = 500;
  let inserted = 0;
  for (let i = 0; i < schoolsForInsert.length; i += chunkSize) {
    const chunk = schoolsForInsert.slice(i, i + chunkSize);
    try {
      const result = await prisma.school.createMany({
        data: chunk,
        skipDuplicates: true
      });
      inserted += result.count;
      console.log(`  → schools chunk ${i / chunkSize + 1}: inserted ${result.count} (total ${inserted})`);
    } catch (err) {
      console.error(`  ❌ schools chunk ${i / chunkSize + 1} failed:`, (err as Error).message);
      // fallback upsert one by one
      for (const sch of chunk) {
        try {
          await prisma.school.upsert({
            where: { id: sch.id },
            create: {
              id: sch.id,
              name: sch.name,
              municipalityId: sch.municipalityId,
              wilayaCode: sch.wilayaCode,
              inspectionDistrictId: sch.inspectionDistrictId
            },
            update: {
              name: sch.name,
              municipalityId: sch.municipalityId,
              wilayaCode: sch.wilayaCode
            }
          });
          inserted++;
        } catch (e) {
          // try by municipalityId+name unique
          try {
            await prisma.school.upsert({
              where: { municipalityId_name: { municipalityId: sch.municipalityId, name: sch.name } },
              create: {
                id: sch.id,
                name: sch.name,
                municipalityId: sch.municipalityId,
                wilayaCode: sch.wilayaCode,
                inspectionDistrictId: sch.inspectionDistrictId
              },
              update: {}
            });
          } catch (ee) {
            // ignore duplicate names
          }
        }
      }
    }
  }

  console.log(`✅ Schools seeded: ${inserted} inserted (attempted ${schoolsForInsert.length})`);
}

async function main() {
  console.log('🌍 Starting geo hierarchy seed...');

  await seedDirectorates();
  await seedMunicipalities();
  await seedSchools();

  console.log('🎉 Geo hierarchy seed completed successfully');
}

main()
  .catch((err) => {
    console.error('❌ Geo seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch {}
  });
