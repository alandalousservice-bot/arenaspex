/**
 * SPEX - AI Assistant Floating Chat Drawer Component
 * المساعد التربوي الذكي لأساتذة ومفتشي التربية البدنية والرياضية بالجزائر
 */

import React, { useState } from 'react';
import { Sparkles, Send, Bot, User, X, RefreshCw, Lightbulb, CornerDownLeft } from 'lucide-react';
import { sendAIChatMessage } from '../../services/api';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({ isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<'games' | 'goals' | 'primary' | 'evaluation'>('games');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: 'أهلاً بك أستاذي الكريم! أنا **المستشار البيداغوجي لـ SPEX**، الخبير المختص في منهاج التربية البدنية والرياضية للطور الابتدائي بالجزائر (السنوات 1 إلى 5 ابتدائي).\n\nيمكنني إفادتك في:\n- 🎯 صياغة الأهداف الإجرائية الحس-حركية والوجدانية وفق المناهج الوزارية\n- 🎮 اقتراح ألعاب تربوية إحمائية وتنافسية تناسب الفئات العمرية\n- 🏫 شرح خصائص ومؤشرات التعلم للطور الابتدائي (1، 2، 3، 4، 5)\n- 📊 إعداد شبكات التقويم ومعايير معالجة التعثرات الحركية'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const categories = [
    { id: 'games', label: '🎮 ألعاب تربوية', icon: '🎮' },
    { id: 'goals', label: '🎯 المنهاج والأهداف', icon: '🎯' },
    { id: 'primary', label: '🏫 الطور الابتدائي (1-5)', icon: '🏫' },
    { id: 'evaluation', label: '📊 التقويم والدعم', icon: '📊' }
  ] as const;

  const quickPromptsMap: Record<'games' | 'goals' | 'primary' | 'evaluation', string[]> = {
    games: [
      'اقترح 3 ألعاب تربوية إحمائية حماسية بالكرة والمطاردة للطور الابتدائي',
      'اقترح لعبة تنافسية للموقف التعليمي الأول لتنمية الجري والتوافق',
      'كيف أدير لعبة الموقف التعلمي الثاني لمنع الاحتكاك وتنمية الروح الرياضية؟',
      'اقترح ألعاباً تربوية موجهة للعودة للهدوء والتهدئة في نهاية الحصة'
    ],
    goals: [
      'صغ لي أهدافاً إجرائية (حس-حركية، معرفية، وجدانية) لميدان ألعاب القوى',
      'كيف أصيغ الكفاءة الخصوصية لميدان الألعاب الجماعية وشبه الرياضية؟',
      'كيف أدمج الهدف الوجداني والتواصلي في حصة كرة اليد المصغرة؟',
      'ما هي معايير ومؤشرات النجاح لموقف التعلم في المنهاج الوزاري؟'
    ],
    primary: [
      'ما هي الخصائص الحركية والسيكولوجية لتلاميذ الطور الأول (1 و 2 ابتدائي)؟',
      'ما الفرق بين المقطع التعليمي في السنة 1 والسنة 5 ابتدائي؟',
      'كيف ننظم التدرج في الجرعة والشدة للطفل الابتدائي تجنباً للإرهاق؟',
      'كيف أربط بين الميدان البدني الرياضي والميدان الجمالي التعبيري؟'
    ],
    evaluation: [
      'اقترح شبكة معايير ومؤشرات لتقويم الكفاءة الختامية في نهاية المقطع',
      'كيف أتعامل بيداغوجياً مع التلاميذ المعفين أو الرافضين للمشاركة حركياً؟',
      'ما هي خطوات التقويم التشخيصي في بداية السنة الدراسية للتربية البدنية؟',
      'كيف أستغل ملاحظات مركز القيادة الميداني في بطاقة التقييم المستمر؟'
    ]
  };

  const handleSend = async (textToSend?: string) => {
    const msg = textToSend || inputVal;
    if (!msg.trim() || isLoading) return;

    const newHistory: ChatMessage[] = [...messages, { role: 'user', text: msg }];
    setMessages(newHistory);
    setInputVal('');
    setIsLoading(true);

    try {
      const reply = await sendAIChatMessage(
        msg,
        messages.map((m) => ({ role: m.role, text: m.text }))
      );

      setMessages((prev) => [...prev, { role: 'model', text: reply }]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: 'عذراً، حدث خطأ أثناء التواصل مع قاعدة البيانات البيداغوجية.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-full sm:w-[450px] bg-white shadow-2xl border-r border-slate-200 flex flex-col animate-in slide-in-from-left duration-300">
      {/* Drawer Header */}
      <div className="p-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-white/15 backdrop-blur-md">
            <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white">المستشار البيداغوجي لـ SPEX (توليد من قاعدة البيانات)</h3>
            <span className="text-[10px] text-blue-200 block">محرك الاستخراج والتوليد الآلي من المنهاج الوزاري</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gradient-to-tr from-purple-600 to-blue-600 text-white'
              }`}
            >
              {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white font-medium rounded-tr-xs'
                  : 'bg-slate-100 text-slate-800 font-normal rounded-tl-xs whitespace-pre-wrap'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5 items-center text-slate-400 font-semibold italic text-[11px] p-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>جاري التفكير والتوليد التربوي...</span>
          </div>
        )}
      </div>

      {/* Categorized Quick Prompts Suggestions */}
      <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 space-y-2 dir-rtl">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>مقترحات وأسئلة المستشار البيداغوجي:</span>
          </span>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black shrink-0 transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Quick Prompts for Active Category */}
        <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
          {quickPromptsMap[activeCategory].map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(qp)}
              className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50/50 transition-all text-right cursor-pointer flex items-center justify-between gap-2 shadow-xs group"
            >
              <span className="leading-snug">{qp}</span>
              <CornerDownLeft className="w-3 h-3 text-slate-300 group-hover:text-blue-600 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Chat Input Bar */}
      <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="اكتب سؤالك أو استفسارك البيداغوجي هنا..."
          className="flex-1 text-xs p-2.5 bg-slate-100 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !inputVal.trim()}
          className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-md cursor-pointer transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
