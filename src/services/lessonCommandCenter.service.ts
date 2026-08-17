/**
 * SPEX - Lesson Command Center Service
 * المنطق الخاص بصفارة الصوت، توليد الفرق، وإدارة المراحل والتقارير
 */
import { Student, LessonSession } from '../types/spex';

export function playWhistleSound(
  type: 'short' | 'double' | 'long' | 'chime' = 'short',
  soundEnabled = true
) {
  if (!soundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'short') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + 0.05);
      osc.frequency.exponentialRampToValueAtTime(2700, ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'double') {
      [0, 0.18].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2900, ctx.currentTime + delay);
        osc.frequency.exponentialRampToValueAtTime(3300, ctx.currentTime + delay + 0.04);
        osc.frequency.exponentialRampToValueAtTime(2800, ctx.currentTime + delay + 0.12);

        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.14);
      });
    } else if (type === 'long') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2850, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(3150, ctx.currentTime + 0.2);
      osc.frequency.setValueAtTime(3000, ctx.currentTime + 0.6);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    console.error('Audio play error:', e);
  }
}

export function triggerVibration(vibrationEnabled = true) {
  if (vibrationEnabled && 'vibrate' in navigator) {
    try {
      navigator.vibrate([150, 80, 150]);
    } catch {
      // Ignore vibration unsupported errors
    }
  }
}

// إعلان صوتي بالعربية عند تغيير المراحل (Web Speech API)
export function announcePhaseInArabic(
  phase: LessonSession['currentPhase'],
  enabled = true
) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;

    const phaseNames: Record<LessonSession['currentPhase'], string> = {
      preparation: 'المرحلة التحضيرية، إحماء وتجهيز الصف',
      situation1: 'الوضعية التعلمية الأولى، بناء التعلمات',
      situation2: 'الوضعية التعلمية الثانية، التنافس والتطبيق',
      final: 'المرحلة الختامية، التهدئة والتقويم',
    };

    const utterance = new SpeechSynthesisUtterance(phaseNames[phase]);
    utterance.lang = 'ar-SA';
    utterance.rate = 1;
    utterance.pitch = 1;
    const voices = synth.getVoices();
    const arabicVoice = voices.find((v) => v.lang.toLowerCase().startsWith('ar'));
    if (arabicVoice) utterance.voice = arabicVoice;
    synth.cancel();
    synth.speak(utterance);
  } catch {
    // تجاهل أخطاء التحويل الصوتي
  }
}

export interface PhasePacing {
  phase: LessonSession['currentPhase'];
  plannedSecs: number;
  spentSecs: number;
  remainingSecs: number;
  status: 'pending' | 'current' | 'done' | 'overrun';
}

// تحليل إيقاع كل مرحلة: المخطط مقابل الفعلي
export function computePhasePacing(session: LessonSession): PhasePacing[] {
  const order: LessonSession['currentPhase'][] = ['preparation', 'situation1', 'situation2', 'final'];
  const currentIdx = order.indexOf(session.currentPhase);

  return order.map((phase, idx) => {
    const plannedSecs = session.phaseDurations?.[phase] || 0;
    const spentSecs = session.actualPhaseSpent?.[phase] || 0;
    const isCurrent = idx === currentIdx;
    const remainingSecs = isCurrent ? session.phaseRemainingSeconds : plannedSecs - spentSecs;

    let status: PhasePacing['status'];
    if (isCurrent) {
      status = session.phaseRemainingSeconds < 0 ? 'overrun' : 'current';
    } else if (idx < currentIdx) {
      status = spentSecs > plannedSecs && plannedSecs > 0 ? 'overrun' : 'done';
    } else {
      status = 'pending';
    }
    return { phase, plannedSecs, spentSecs, remainingSecs, status };
  });
}

// نبني ملخص تنفيذ ذكي مكتوب (تحليل إيقاع + حضور + تجاوزات)
export function buildSmartExecutionReport(
  session: LessonSession,
  attendance?: { total: number; present: number; absent: number; exempt: number },
  overruns?: Array<{ phase: string; minutes: number }>
): string {
  const pacing = computePhasePacing(session);
  const parts: string[] = [];

  const totalPlanned = session.phaseDurations
    ? session.phaseDurations.preparation + session.phaseDurations.situation1 + session.phaseDurations.situation2 + session.phaseDurations.final
    : 0;
  const totalSpent = session.actualPhaseSpent
    ? session.actualPhaseSpent.preparation + session.actualPhaseSpent.situation1 + session.actualPhaseSpent.situation2 + session.actualPhaseSpent.final
    : session.totalElapsedSeconds || 0;

  const spentMins = Math.round(totalSpent / 60);
  const plannedMins = Math.round(totalPlanned / 60);

  const overrunPhases = pacing.filter((p) => p.status === 'overrun');
  const overrunTotal = overruns?.reduce((sum, o) => sum + o.minutes, 0) || 0;

  parts.push(
    `⏱️ إجمالي الزمن المخطط ${plannedMins} دقيقة، والزمن الفعلي المنقضي ${spentMins} دقيقة` +
      (spentMins > plannedMins ? ` (تجاوز +${spentMins - plannedMins} دقيقة)` : ' (ضمن المخطط)')
  );

  const overrunDetails = overruns && overruns.length > 0
    ? overruns.map((o) => `${o.phase}: +${o.minutes} دقيقة`).join('، ')
    : overrunPhases.length > 0
    ? pacing.filter((p) => p.status === 'overrun').map((p) => `${p.phase}: ${Math.round((p.spentSecs - p.plannedSecs) / 60)} دقيقة`).join('، ')
    : 'لا توجد تجاوزات زمنية';
  parts.push(`⚠️ التجاوزات الزمنية: ${overrunDetails}${overrunTotal > 0 ? ` (إجمالي ${overrunTotal} دقيقة)` : ''}`);

  if (attendance && attendance.total > 0) {
    const rate = Math.round((attendance.present / attendance.total) * 100);
    parts.push(`📋 نسبة الحضور ${rate}% (${attendance.present} حاضر من أصل ${attendance.total}، غائب ${attendance.absent || 0}، معفى ${attendance.exempt || 0}).`);
  }

  const completedPhases = pacing.filter((p) => p.status === 'done' || p.status === 'overrun').length;
  parts.push(
    completedPhases >= 4
      ? '✅ الحصة منجزة وفق المراحل الأربع المعتمدة بنجاح.'
      : `🚦 اكتمل ${completedPhases} من 4 مراحل حتى الآن.`
  );

  return parts.join('\n');
}

export function divideStudentsIntoBalancedTeams(
  studentsList: Student[],
  teamCount: number
): Record<string, Student[]> {
  const shuffled = [...studentsList].sort(() => Math.random() - 0.5);
  const result: Record<string, Student[]> = {};

  const teamNames = ['الفريق (أ) - الصقور', 'الفريق (ب) - الأبطال', 'الفريق (ج) - الفرسان', 'الفريق (د) - النجوم'];

  for (let i = 0; i < teamCount; i++) {
    result[teamNames[i] || `الفريق ${i + 1}`] = [];
  }

  shuffled.forEach((student, index) => {
    const teamKey = teamNames[index % teamCount] || `الفريق ${(index % teamCount) + 1}`;
    result[teamKey].push(student);
  });

  return result;
}
