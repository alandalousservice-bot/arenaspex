import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, ChevronRight, Loader2, MessageCircle, Radio, Send, Users } from 'lucide-react';
import { User } from '../../types/spex';

interface Contact { id: string; firstName: string; lastName: string; username?: string; role: string; avatar?: string; districtId: string; }
interface DirectMessage { id: string; senderId: string; recipientId: string; text: string; createdAt: string; readAt?: string | null; }
interface Conversation { user: Contact; lastMessage: DirectMessage; unreadCount: number; }
interface DistrictMessage { id: string; authorId: string; text: string; createdAt: string; }
interface Notification { id: string; type: string; title: string; message: string; read: boolean; createdAt: string; }
interface ProfessionalHubProps { currentUser: User; [key: string]: unknown; }

const api = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`/api${url}`, { headers: { 'Content-Type': 'application/json' }, ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'تعذر الاتصال بالخادم.');
  return body as T;
};
const roleLabel: Record<string, string> = { teacher: 'أستاذ', inspector: 'مفتش', director: 'مدير', admin: 'إدارة' };
const formatDate = (value: string) => new Date(value).toLocaleString('ar-DZ', { dateStyle: 'short', timeStyle: 'short' });

export const ProfessionalHub: React.FC<ProfessionalHubProps> = ({ currentUser }) => {
  const [section, setSection] = useState<'direct' | 'district' | 'notifications'>('direct');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [districtMessages, setDistrictMessages] = useState<DistrictMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [draft, setDraft] = useState('');
  const [contactQuery, setContactQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [contactResult, conversationResult, notificationResult, districtResult] = await Promise.all([
        api<{ contacts: Contact[] }>('/communication/contacts'),
        api<{ conversations: Conversation[] }>('/communication/direct-conversations'),
        api<{ notifications: Notification[] }>('/communication/notifications'),
        api<{ messages: DistrictMessage[] }>('/communication/district-messages'),
      ]);
      setContacts(contactResult.contacts); setConversations(conversationResult.conversations);
      setNotifications(notificationResult.notifications); setDistrictMessages(districtResult.messages); setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تحميل بيانات التواصل.'); }
    finally { setLoading(false); }
  }, []);

  const loadConversation = useCallback(async (contact: Contact) => {
    setSelected(contact); setLoadingMessages(true);
    try {
      const result = await api<{ messages: DirectMessage[] }>(`/communication/direct-messages/${contact.id}`);
      setMessages(result.messages); setError('');
      await Promise.all(result.messages.filter((message) => message.recipientId === currentUser.id && !message.readAt).map((message) => api(`/communication/direct-messages/${message.id}/read`, { method: 'POST' })));
      setConversations((prev) => prev.map((item) => item.user.id === contact.id ? { ...item, unreadCount: 0 } : item));
    } catch (reason) { setMessages([]); setError(reason instanceof Error ? reason.message : 'تعذر تحميل المحادثة.'); }
    finally { setLoadingMessages(false); }
  }, [currentUser.id]);

  useEffect(() => { void loadOverview(); }, [loadOverview]);
  useEffect(() => {
    if (!selected || section !== 'direct') return;
    const interval = window.setInterval(() => { void loadConversation(selected); }, 7000);
    return () => window.clearInterval(interval);
  }, [selected, section, loadConversation]);

  const sendDirect = async () => {
    if (!selected || !draft.trim() || sending) return;
    setSending(true);
    try {
      const result = await api<{ message: DirectMessage }>('/communication/direct-messages', { method: 'POST', body: JSON.stringify({ recipientId: selected.id, text: draft.trim() }) });
      setMessages((prev) => [...prev, result.message]); setDraft('');
      const overview = await api<{ conversations: Conversation[] }>('/communication/direct-conversations');
      setConversations(overview.conversations);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر إرسال الرسالة.'); }
    finally { setSending(false); }
  };
  const sendDistrict = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      const result = await api<{ message: DistrictMessage }>('/communication/district-messages', { method: 'POST', body: JSON.stringify({ text: draft.trim() }) });
      setDistrictMessages((prev) => [...prev, result.message]); setDraft('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر إرسال رسالة المقاطعة.'); }
    finally { setSending(false); }
  };
  const markNotificationRead = async (notification: Notification) => {
    if (notification.read) return;
    try { await api(`/communication/notifications/${notification.id}/read`, { method: 'POST' }); setNotifications((prev) => prev.map((item) => item.id === notification.id ? { ...item, read: true } : item)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تحديث الإشعار.'); }
  };
  const availableContacts = useMemo(() => {
    const query = contactQuery.trim().toLowerCase();
    return contacts.filter((contact) => !query || `${contact.firstName} ${contact.lastName} ${contact.username || ''}`.toLowerCase().includes(query));
  }, [contacts, contactQuery]);
  const unreadNotifications = notifications.filter((item) => !item.read).length;
  const unreadMessages = conversations.reduce((sum, item) => sum + item.unreadCount, 0);

  if (loading) return <div className="flex min-h-[360px] items-center justify-center rounded-3xl border bg-white"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /><span className="mr-2 text-sm">جار تحميل التواصل المهني…</span></div>;

  const composer = (placeholder: string, onSend: () => void, label: string) => <div className="border-t p-3"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onSend(); } }} placeholder={placeholder} rows={2} className="w-full resize-none rounded-xl border p-3" /><button disabled={!draft.trim() || sending} onClick={onSend} className="mt-2 flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Send className="h-4 w-4" />{sending ? 'جار الإرسال…' : label}</button></div>;

  return <div className="space-y-4" dir="rtl">
    <header className="rounded-3xl bg-gradient-to-l from-emerald-700 to-cyan-700 p-6 text-white shadow-lg"><h1 className="text-2xl font-black">التواصل المهني</h1><p className="mt-1 text-sm text-emerald-100">دردشة خاصة، فضاء المقاطعة، وإشعارات موثوقة</p><nav className="mt-5 flex flex-wrap gap-2">{([['direct', 'الدردشة الخاصة', MessageCircle, unreadMessages], ['district', 'فضاء المقاطعة', Radio, 0], ['notifications', 'الإشعارات', Bell, unreadNotifications]] as const).map(([id, label, Icon, badge]) => <button key={id} onClick={() => { setSection(id); setSelected(null); }} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold ${section === id ? 'bg-white text-teal-800' : 'bg-white/15 text-white'}`}><Icon className="h-4 w-4" />{label}{badge > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] text-white">{badge}</span>}</button>)}</nav></header>
    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}<button onClick={() => { setError(''); void loadOverview(); }} className="mr-3 font-bold underline">إعادة المحاولة</button></div>}
    {section === 'direct' && <div className="grid min-h-[540px] gap-4 lg:grid-cols-[20rem_1fr]"><aside className={`rounded-2xl border bg-white p-4 ${selected ? 'hidden lg:block' : ''}`}><div className="mb-3 flex items-center gap-2 font-black"><Users className="h-5 w-5 text-teal-600" />جهات الاتصال</div><input value={contactQuery} onChange={(event) => setContactQuery(event.target.value)} placeholder="البحث في جهات الاتصال" className="mb-3 w-full rounded-xl border p-2 text-sm" /><div className="space-y-2">{availableContacts.map((contact) => { const conversation = conversations.find((item) => item.user.id === contact.id); return <button key={contact.id} onClick={() => void loadConversation(contact)} className="flex w-full items-center justify-between rounded-xl border p-3 text-right hover:bg-teal-50"><span><strong>{contact.firstName} {contact.lastName}</strong><small className="block text-xs text-slate-500">{roleLabel[contact.role] || contact.role}</small></span>{conversation?.unreadCount ? <span className="rounded-full bg-rose-500 px-2 py-1 text-xs font-bold text-white">{conversation.unreadCount}</span> : null}</button>; })}</div>{!availableContacts.length && <p className="text-sm text-slate-500">لا توجد جهات اتصال متاحة.</p>}</aside><section className={`flex flex-col rounded-2xl border bg-white ${!selected ? 'hidden lg:flex' : ''}`}>{selected ? <><div className="flex items-center gap-3 border-b p-4"><button className="lg:hidden" onClick={() => setSelected(null)}><ChevronRight /></button><div><h2 className="font-black">{selected.firstName} {selected.lastName}</h2><p className="text-xs text-slate-500">{roleLabel[selected.role] || selected.role}</p></div></div><div className="flex-1 space-y-3 overflow-y-auto p-4">{loadingMessages ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : messages.length ? messages.map((message) => <div key={message.id} className={`max-w-[80%] rounded-2xl p-3 text-sm ${message.senderId === currentUser.id ? 'mr-auto bg-teal-600 text-white' : 'ml-auto bg-slate-100 text-slate-900'}`}><p>{message.text}</p><time className="mt-1 block text-[10px] opacity-70">{formatDate(message.createdAt)}</time></div>) : <p className="text-center text-sm text-slate-500">لا توجد رسائل بعد.</p>}</div>{composer('اكتب رسالتك…', () => void sendDirect(), 'إرسال')}</> : <div className="flex flex-1 items-center justify-center text-sm text-slate-500">اختر جهة اتصال لفتح المحادثة.</div>}</section></div>}
    {section === 'district' && <section className="flex min-h-[540px] flex-col rounded-2xl border bg-white"><div className="border-b p-4"><h2 className="font-black">فضاء المقاطعة المهنية</h2><p className="text-xs text-slate-500">تظهر هنا رسائل مقاطعتك فقط.</p></div><div className="flex-1 space-y-3 overflow-y-auto p-4">{districtMessages.length ? districtMessages.map((message) => <div key={message.id} className="rounded-xl border p-3"><p>{message.text}</p><time className="mt-1 block text-[10px] text-slate-500">{formatDate(message.createdAt)}</time></div>) : <p className="text-center text-sm text-slate-500">لا توجد رسائل في المقاطعة.</p>}</div>{composer('اكتب رسالة للمقاطعة…', () => void sendDistrict(), 'إرسال إلى المقاطعة')}</section>}
    {section === 'notifications' && <section className="rounded-2xl border bg-white p-5"><h2 className="mb-4 font-black">الإشعارات</h2>{notifications.length ? <div className="space-y-2">{notifications.map((notification) => <button key={notification.id} onClick={() => void markNotificationRead(notification)} className={`block w-full rounded-xl border p-3 text-right ${notification.read ? 'bg-white' : 'bg-amber-50'}`}><strong>{notification.title}</strong><p className="text-sm">{notification.message}</p><time className="text-[10px] text-slate-500">{formatDate(notification.createdAt)}</time></button>)}</div> : <p className="text-sm text-slate-500">لا توجد إشعارات.</p>}</section>}
  </div>;
};
