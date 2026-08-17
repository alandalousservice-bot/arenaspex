import React, { useState } from 'react';
import { Send, UserCheck, CheckCheck } from 'lucide-react';
import { User, DirectChatMessage } from '../../../types/spex';

interface InspectorDirectChatProps {
  inspector: User;
  selectedTeacher: User;
  chatMessages: DirectChatMessage[];
  onSendMessage: (text: string) => void;
}

export const InspectorDirectChat: React.FC<InspectorDirectChatProps> = ({
  inspector,
  selectedTeacher,
  chatMessages,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const filteredChat = chatMessages.filter((msg) => {
    if (msg.receiverId) {
      return (
        (msg.senderId === inspector.id && msg.receiverId === selectedTeacher.id) ||
        (msg.senderId === selectedTeacher.id && msg.receiverId === inspector.id)
      );
    }
    return true;
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col h-[650px]">
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-md">
            {selectedTeacher.firstName?.[0]}
            {selectedTeacher.lastName?.[0]}
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-white flex items-center gap-1.5">
              <span>المحادثة المباشرة والتوجيه الفوري مع الأستاذ:</span>
              <strong className="text-emerald-400">
                {selectedTeacher.firstName} {selectedTeacher.lastName}
              </strong>
            </h3>
            <span className="text-[10px] text-slate-400">
              المؤسسة: {selectedTeacher.schoolName || 'المدرسة الابتدائية بالعين أزال'} • قناة مشفرة رسمية
            </span>
          </div>
        </div>

        <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/30">
          ● متصل بيداغوجياً
        </span>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
        {filteredChat.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <UserCheck className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-xs font-bold">لا توجد رسائل سابقة مع الأستاذ {selectedTeacher.lastName}.</p>
            <p className="text-[10px] text-slate-400 mt-1">ابدأ بكتابة توجيه أو استفسار بيداغوجي الآن.</p>
          </div>
        ) : (
          filteredChat.map((msg) => {
            const isMe = msg.senderId === inspector.id || msg.senderRole === 'inspector';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`max-w-[80%] p-3.5 rounded-2xl text-xs space-y-1 ${
                    isMe
                      ? 'bg-slate-900 text-white rounded-tr-xs shadow-xs'
                      : 'bg-emerald-600 text-white rounded-tl-xs shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-[10px] opacity-80 border-b border-white/10 pb-1 mb-1">
                    <span className="font-bold">{msg.senderName}</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <p className="leading-relaxed font-medium">{msg.content}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`اكتب توجيهاً أو استفساراً للأستاذ ${selectedTeacher.firstName}...`}
          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Send className="w-4 h-4" />
          <span>إرسال</span>
        </button>
      </form>
    </div>
  );
};
