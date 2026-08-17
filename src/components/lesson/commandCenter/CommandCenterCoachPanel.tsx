import React, { useState } from 'react';
import { Sparkles, Lightbulb, Send, Loader2, ShieldAlert } from 'lucide-react';
import {
  PHASE_TIPS,
  CONTINGENCY_TIPS,
  buildCoachPrompt,
  ContingencyMode,
} from '../../../constants/lessonCommandCenter.constants';
import { sendAIChatMessage } from '../../../services/api';

interface CommandCenterCoachPanelProps {
  currentPhase: 'preparation' | 'situation1' | 'situation2' | 'final';
  contingencyMode: string;
  sessionTitle?: string;
  educationalObjective?: string;
  planContext?: string;
}

export const CommandCenterCoachPanel: React.FC<CommandCenterCoachPanelProps> = ({
  currentPhase,
  contingencyMode,
  sessionTitle,
  educationalObjective,
  planContext,
}) => {
  const phaseName: Record<string, string> = {
    preparation: 'المرحلة التحضيرية',
    situation1: 'الوضعية التعلمية الأولى',
    situation2: 'الوضعية التعلمية الثانية',
    final: 'المرحلة الختامية',
  };

  const [question, setQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  const contingency = (CONTINGENCY_TIPS as Record<string, string[]>)[contingencyMode] || [];
  const phaseTips = PHASE_TIPS[currentPhase] || [];
  const isContingency = contingencyMode !== 'normal';

  const handleAskAI = async () => {
    const q = question.trim();
    if (!q || isThinking) return;
    setIsThinking(true);
    setAiAnswer(null);
    try {
      const prompt = buildCoachPrompt({
        phase: currentPhase,
        sessionTitle,
        educationalObjective,
        contingency: contingencyMode as ContingencyMode,
        planContext,
      });
      const response = await sendAIChatMessage(`${prompt}\n\nسؤالي الإضافي: ${q}`, [
        { role: 'model', text: 'أنا مستشارك البيداغوجي الميداني لدرس التربية البدنية. أساعدك بنصائح عملية فورية.' },
      ]);
      setAiAnswer(response);
    } catch {
      setAiAnswer('تعذر الوصول إلى المستشار الذكي حالياً — جرّب التوصيات الفورية أعلاه. تأكد من تفعيل مفتاح الذكاء الاصطناعي من الإعدادات.');
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="space-y-3 text-xs animate-in fade-in duration-150">
      {/* Instant tips for current phase */}
      <div className="space-y-2">
        <span className="flex items-center gap-1.5 font-black text-slate-800">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          توصيات فورية لـ {phaseName[currentPhase]}:
        </span>
        <div className="space-y-1.5">
          {phaseTips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200/70 rounded-xl">
              <span className="text-amber-500 font-black shrink-0">{i + 1}.</span>
              <p className="text-slate-700 leading-relaxed font-medium">{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contingency-aware tips */}
      {isContingency && (
        <div className="space-y-2">
          <span className="flex items-center gap-1.5 font-black text-slate-800">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            تكييف الحصة حسب الظروف المختارة:
          </span>
          <div className="space-y-1.5">
            {contingency.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 bg-rose-50 border border-rose-200/70 rounded-xl">
                <span className="text-rose-500 font-black shrink-0">•</span>
                <p className="text-slate-700 leading-relaxed font-medium">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Ask */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200/80 rounded-2xl p-3 space-y-2">
        <span className="flex items-center gap-1.5 font-black text-indigo-900">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          اسأل المستشار الذكي في الميدان:
        </span>
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAskAI();
            }}
            placeholder={`مثال: كيف أشرح ${phaseName[currentPhase]} لمجموعة صغيرة بسرعة؟`}
            className="flex-1 p-3 bg-white border border-indigo-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleAskAI}
            disabled={isThinking || !question.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-xl cursor-pointer flex items-center gap-1.5"
          >
            {isThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>اسأل</span>
          </button>
        </div>
        {aiAnswer && (
          <div className="bg-white border border-indigo-200 rounded-xl p-3 text-slate-800 leading-relaxed whitespace-pre-line">
            {aiAnswer}
          </div>
        )}
      </div>
    </div>
  );
};
