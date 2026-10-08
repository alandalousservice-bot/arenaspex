import React from 'react';
import type { User, DirectChatMessage } from '../../../types/spex';

interface InspectorDirectChatProps {
  inspector: User;
  selectedTeacher: User;
  chatMessages: DirectChatMessage[];
  onSendMessage: (text: string) => void;
  teacherId?: string;
}

// The legacy Inspector callback never persisted a message. Shared messaging
// APIs remain untouched; this obsolete composer must not claim delivery.
export const InspectorDirectChat: React.FC<InspectorDirectChatProps> = () => (
  <section dir="rtl" className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700">
    <h2 className="font-bold">المحادثة القديمة غير متاحة حاليًا</h2>
    <p className="mt-2 text-sm">الإرسال من هذه الواجهة معطّل. لا يتم إرسال أو حفظ رسائل عبرها.</p>
  </section>
);