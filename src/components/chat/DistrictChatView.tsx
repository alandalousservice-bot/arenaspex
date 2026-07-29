/**
 * SPEX - District Teachers Group Chat & Account Following Component
 * وحدة الدردشة الجماعية ومتابعة الحسابات بين أساتذة المقاطعة التفتيشية الواحدة
 */

import React, { useState } from 'react';
import {
  MessageSquare,
  Users,
  UserPlus,
  UserCheck,
  Send,
  ShieldCheck,
  Lock,
  Search,
  School,
  MapPin,
  Sparkles,
  Heart,
  Reply,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Clock,
  BookOpen,
  X,
  MessageCircle,
  Share2,
  Radio,
  Bell
} from 'lucide-react';
import {
  User,
  DistrictGroupMessage,
  DirectChatMessage,
  InspectionDistrict
} from '../../types/spex';
import { UserProfileModal } from './UserProfileModal';

interface DistrictChatViewProps {
  currentUser: User;
  allUsers: User[];
  districts?: InspectionDistrict[];
  groupMessages: DistrictGroupMessage[];
  directMessages: DirectChatMessage[];
  onSendGroupMessage: (msg: { message: string; replyToId?: string }) => void;
  onSendDirectMessage: (receiverId: string, receiverName: string, message: string) => void;
  onToggleFollowTeacher: (teacherId: string) => void;
}

export const DistrictChatView: React.FC<DistrictChatViewProps> = ({
  currentUser,
  allUsers,
  districts = [],
  groupMessages,
  directMessages,
  onSendGroupMessage,
  onSendDirectMessage,
  onToggleFollowTeacher
}) => {
  // Navigation sub-tabs inside chat hub
  const [activeSubTab, setActiveSubTab] = useState<'group_chat' | 'directory' | 'direct_chats'>('group_chat');

  // Directory Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showOutsideDistrict, setShowOutsideDistrict] = useState(false);
  const [restrictionWarning, setRestrictionWarning] = useState<string | null>(null);

  // Group Chat Message Input State
  const [groupMessageInput, setGroupMessageInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<DistrictGroupMessage | null>(null);

  // Direct Chat State
  const [selectedDirectUser, setSelectedDirectUser] = useState<User | null>(null);
  const [directInput, setDirectInput] = useState('');

  // Profile Modal State
  const [selectedProfileUser, setSelectedProfileUser] = useState<User | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleOpenUserProfile = (userToView: User) => {
    setSelectedProfileUser(userToView);
    setIsProfileModalOpen(true);
  };

  const handleStartDirectChatFromProfile = (targetUser: User) => {
    setSelectedDirectUser(targetUser);
    setActiveSubTab('direct_chats');
  };

  // Local likes tracking
  const [likedMessageIds, setLikedMessageIds] = useState<string[]>([]);

  // District Info
  const userDistrictName =
    currentUser.districtId === 'dist_setif_7'
      ? 'المقاطعة 07 - عين أزال (سطيف)'
      : currentUser.districtId || 'المقاطعة التفتيشية المحلية';

  // Filter teachers belonging to the SAME district
  const sameDistrictTeachers = allUsers.filter(
    (u) => u.role === 'teacher' && u.districtId === currentUser.districtId && u.id !== currentUser.id
  );

  // Teachers in OTHER districts (to demonstrate restriction rule)
  const outsideDistrictTeachers = allUsers.filter(
    (u) => u.role === 'teacher' && u.districtId !== currentUser.districtId
  );

  // Filter group chat messages by district
  const districtChatFeed = groupMessages.filter(
    (m) => m.districtId === currentUser.districtId || !m.districtId
  );

  // Followed Teachers list
  const followedTeacherIds = currentUser.followingIds || [];
  const followedTeachers = sameDistrictTeachers.filter((t) => followedTeacherIds.includes(t.id));

  // Handle Group Chat Send
  const handleSendGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupMessageInput.trim()) return;

    onSendGroupMessage({
      message: groupMessageInput.trim(),
      replyToId: replyingTo ? replyingTo.id : undefined
    });

    setGroupMessageInput('');
    setReplyingTo(null);
  };

  // Handle Direct Message Send
  const handleSendDirect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directInput.trim() || !selectedDirectUser) return;

    onSendDirectMessage(selectedDirectUser.id, `${selectedDirectUser.firstName} ${selectedDirectUser.lastName}`, directInput.trim());
    setDirectInput('');
  };

  // Handle Like Toggle
  const handleToggleLike = (msgId: string) => {
    if (likedMessageIds.includes(msgId)) {
      setLikedMessageIds((prev) => prev.filter((id) => id !== msgId));
    } else {
      setLikedMessageIds((prev) => [...prev, msgId]);
    }
  };

  // Handle Out of District Action Attempt
  const handleAttemptOutsideFollow = (targetTeacher: User) => {
    setRestrictionWarning(
      `⛔ تقتصر المتابعة والدردشة على أساتذة نفس المقاطعة! الأستاذ ${targetTeacher.firstName} ${targetTeacher.lastName} يتبع لمقاطعة أُخرى. أصلح شرط القبول للانضمام.`
    );
    setTimeout(() => {
      setRestrictionWarning(null);
    }, 6000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      {/* Top Banner & District Condition Security Bar */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-bold border border-blue-400/30">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>نظام التواصل الموحد للمقاطعة التفتيشية</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>شبكة أساتذة المقاطعة والدردشة الجماعية</span>
            </h2>

            <p className="text-xs sm:text-sm text-blue-100/90 max-w-2xl leading-relaxed">
              منصة تفاعلية مخصصة لأساتذة التربية البدنية بالطور الابتدائي: الدردشة الجماعية، وتبادل التجارب البيداغوجية، ومتابعة حسابات الزملاء داخل مقاطعتك.
            </p>
          </div>

          {/* Current User District Badge Card */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 space-y-1 min-w-64">
            <div className="flex items-center gap-2 text-xs text-blue-200 font-bold">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>المقاطعة المعتمدة لحسابك:</span>
            </div>
            <div className="text-base font-black text-white">{userDistrictName}</div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-semibold pt-1 border-t border-white/10">
              <Lock className="w-3 h-3" />
              <span>محمية ومقتصرة على نفس المقاطعة</span>
            </div>
          </div>
        </div>
      </div>

      {/* Restriction Alert Notification (If trying outside district) */}
      {restrictionWarning && (
        <div className="bg-amber-500/15 border-2 border-amber-500 text-amber-900 p-4 rounded-2xl flex items-start gap-3 shadow-md animate-in slide-in-from-top-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs font-extrabold leading-relaxed">
            {restrictionWarning}
          </div>
          <button onClick={() => setRestrictionWarning(null)} className="text-amber-800 hover:text-amber-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white p-2 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('group_chat')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'group_chat'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>📢 الدردشة الجماعية للمقاطعة</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white">
              {districtChatFeed.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('directory')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'directory'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>👥 دليل الأساتذة ومتابعة الحسابات</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-900 font-extrabold">
              {sameDistrictTeachers.length} أساتذة
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('direct_chats')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'direct_chats'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>✉️ المحادثات الثنائية المباشرة</span>
            {followedTeachers.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                {followedTeachers.length} متابَعون
              </span>
            )}
          </button>
        </div>

        {/* Same District Strict Indicator Tag */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 font-bold px-3">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>شرط القبول: معلمو {userDistrictName} فقط</span>
        </div>
      </div>

      {/* SUB-VIEW 1: DISTRICT GROUP CHAT (غرفة الدردشة الجماعية) */}
      {activeSubTab === 'group_chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed Column */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-md p-5 flex flex-col justify-between min-h-[580px]">
            <div className="space-y-4">
              {/* Group Room Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold text-base">
                    📢
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      غرفة الدردشة الجماعية: {userDistrictName}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      مفتوحة لجميع أساتذة ومفتش التربية البدنية بالمقاطعة التفتيشية
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>متصلون بالمقاطعة</span>
                </div>
              </div>

              {/* Chat Stream Feed */}
              <div className="space-y-3.5 max-h-[420px] overflow-y-auto p-2 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                {districtChatFeed.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs">
                    💬 لا توجد رسائل سابقة في الغرفة الجماعية. كن أول من يرحب بأساتذة المقاطعة!
                  </div>
                ) : (
                  districtChatFeed.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;
                    const isInspector = msg.senderRole === 'inspector';
                    const isLiked = likedMessageIds.includes(msg.id);

                    return (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-2xl text-xs space-y-2 transition-all ${
                          isMe
                            ? 'bg-blue-50/80 border border-blue-200/80 mr-auto max-w-xl'
                            : isInspector
                            ? 'bg-amber-50/90 border-2 border-amber-300 shadow-xs max-w-xl'
                            : 'bg-white border border-slate-200 max-w-xl'
                        }`}
                      >
                        {/* Header Sender Info */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const targetUser = allUsers.find((u) => u.id === msg.senderId) || {
                                  id: msg.senderId,
                                  firstName: msg.senderName.split(' ')[0] || 'أستاذ',
                                  lastName: msg.senderName.split(' ').slice(1).join(' ') || 'المقاطعة',
                                  email: `${msg.senderId}@spex.dz`,
                                  role: msg.senderRole,
                                  schoolName: msg.senderSchool,
                                  districtId: currentUser.districtId,
                                  yearsExperience: 6
                                } as User;
                                handleOpenUserProfile(targetUser);
                              }}
                              className={`w-8 h-8 rounded-full font-extrabold text-[11px] flex items-center justify-center text-white cursor-pointer hover:scale-105 transition-transform ${
                                isInspector ? 'bg-amber-600' : isMe ? 'bg-blue-600' : 'bg-slate-700'
                              }`}
                              title="عرض البروفايل الشخصي"
                            >
                              {msg.senderName[0]}
                            </button>
                            <div className="text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  const targetUser = allUsers.find((u) => u.id === msg.senderId) || {
                                    id: msg.senderId,
                                    firstName: msg.senderName.split(' ')[0] || 'أستاذ',
                                    lastName: msg.senderName.split(' ').slice(1).join(' ') || 'المقاطعة',
                                    email: `${msg.senderId}@spex.dz`,
                                    role: msg.senderRole,
                                    schoolName: msg.senderSchool,
                                    districtId: currentUser.districtId,
                                    yearsExperience: 6
                                  } as User;
                                  handleOpenUserProfile(targetUser);
                                }}
                                className="font-extrabold text-slate-900 hover:text-blue-600 block text-xs cursor-pointer text-right transition-colors"
                              >
                                {msg.senderName}
                              </button>
                              {msg.senderSchool && (
                                <span className="text-[10px] text-slate-500 block">
                                  {msg.senderSchool}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isInspector && (
                              <span className="bg-amber-100 text-amber-900 font-extrabold px-2 py-0.5 rounded-md text-[10px]">
                                المفتش البيداغوجي
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              {msg.createdAt.slice(11, 16)}
                            </span>
                          </div>
                        </div>

                        {/* Reply reference if exists */}
                        {msg.replyTo && (
                          <div className="bg-slate-100 p-2 rounded-xl text-[11px] border-r-2 border-blue-500 text-slate-600">
                            <strong>رد على {msg.replyTo.senderName}:</strong> {msg.replyTo.message}
                          </div>
                        )}

                        {/* Message Content Body */}
                        <p className="text-slate-800 leading-relaxed font-medium text-xs whitespace-pre-wrap">
                          {msg.message}
                        </p>

                        {/* Actions: Like & Reply */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100/60 text-[11px]">
                          <button
                            onClick={() => handleToggleLike(msg.id)}
                            className={`flex items-center gap-1 font-bold cursor-pointer transition-colors ${
                              isLiked ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-600' : ''}`} />
                            <span>{(msg.likesCount || 0) + (isLiked ? 1 : 0)} إعجاب</span>
                          </button>

                          <button
                            onClick={() => setReplyingTo(msg)}
                            className="flex items-center gap-1 text-slate-500 hover:text-blue-600 font-bold cursor-pointer"
                          >
                            <Reply className="w-3.5 h-3.5" />
                            <span>رد</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Message Input Box & Quick Pedagogical Chips */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
              {replyingTo && (
                <div className="flex items-center justify-between bg-blue-50 text-blue-900 p-2 rounded-xl text-xs border border-blue-200">
                  <span className="font-bold truncate">رد على {replyingTo.senderName}: "{replyingTo.message.slice(0, 40)}..."</span>
                  <button onClick={() => setReplyingTo(null)} className="text-blue-700 hover:text-blue-950">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Quick Pedagogical Topic Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                <span className="text-slate-400 font-bold shrink-0">اقتراحات موضوعات:</span>
                {[
                  'حول الميدان البدني 🏃‍♂️',
                  'استفسار عن التدرج السنوي 📅',
                  'التنظيم والسلامة في الفناء ⚽',
                  'التحضير للندوة البيداغوجية 📝'
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setGroupMessageInput((prev) => (prev ? `${prev} ${chip}` : chip))}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg whitespace-nowrap transition-colors cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Form Input */}
              <form onSubmit={handleSendGroup} className="flex gap-2">
                <input
                  type="text"
                  value={groupMessageInput}
                  onChange={(e) => setGroupMessageInput(e.target.value)}
                  placeholder={`اكتب مشاركة أو استفساراً لأساتذة ${userDistrictName}...`}
                  className="flex-1 p-3 text-xs rounded-2xl border border-slate-200 outline-none focus:border-blue-500 bg-white shadow-2xs"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: District Members & Followed Peers Widget */}
          <div className="space-y-5">
            {/* Active Peers Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>أساتذة المقاطعة المتاحون ({sameDistrictTeachers.length})</span>
                </h4>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                  عين أزال
                </span>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto">
                {sameDistrictTeachers.map((teacher) => {
                  const isFollowed = followedTeacherIds.includes(teacher.id);

                  return (
                    <div
                      key={teacher.id}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between gap-2 hover:bg-slate-100/80 transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shadow-2xs">
                          {teacher.firstName[0]}
                        </div>
                        <div>
                          <h5 className="text-xs font-extrabold text-slate-900">
                            أ. {teacher.firstName} {teacher.lastName}
                          </h5>
                          <span className="text-[10px] text-slate-500 block">
                            {teacher.schoolName || 'مدرسة ابتدائية'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onToggleFollowTeacher(teacher.id)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                          isFollowed
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                        }`}
                      >
                        {isFollowed ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                            <span>تتابع</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>متابعة</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pedagogical Guidance Tip */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-3xl border border-amber-200 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>نصيحة المتابعة البيداغوجية</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                متابعة حسابات أساتذة مقاطعتك تُتيح لك إجراء دردشة ثنائية مباشرة، ومشاركة المذكرات البيداغوجية، والتنسيق المباشر للندوات الداخلية.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: DISTRICT TEACHERS DIRECTORY & FOLLOW SYSTEM (دليل الأساتذة والمتابعة) */}
      {activeSubTab === 'directory' && (
        <div className="space-y-6">
          {/* Search & District Filter Controls */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن أستاذ بالاسم أو المدرسة الابتدائية..."
                className="w-full pr-10 pl-4 py-2.5 text-xs rounded-2xl border border-slate-200 outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>

            {/* Toggle demo button for outside district teachers */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowOutsideDistrict(!showOutsideDistrict)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                  showOutsideDistrict
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{showOutsideDistrict ? 'إخفاء أساتذة المقاطعات الأخرى' : 'معاينة أساتذة من مقاطعات أخرى (اختبار الشرط)'}</span>
              </button>
            </div>
          </div>

          {/* Directory Grid for Same District Teachers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>دليل أساتذة {userDistrictName} ({sameDistrictTeachers.length})</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                تتابع حالياً <strong className="text-emerald-700">{followedTeacherIds.length}</strong> أستاذ بالمقاطعة
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sameDistrictTeachers
                .filter(
                  (t) =>
                    `${t.firstName} ${t.lastName} ${t.schoolName}`.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((teacher) => {
                  const isFollowed = followedTeacherIds.includes(teacher.id);

                  return (
                    <div
                      key={teacher.id}
                      className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-blue-300 transition-all shadow-xs space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Profile Top Header */}
                        <div
                          onClick={() => handleOpenUserProfile(teacher)}
                          className="flex items-start gap-3 cursor-pointer group"
                        >
                          <img
                            src={teacher.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
                            alt={teacher.firstName}
                            className="w-12 h-12 rounded-2xl object-cover border-2 border-slate-200 shadow-2xs group-hover:scale-105 transition-transform"
                          />
                          <div>
                            <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-800 rounded-md text-[10px] font-bold border border-blue-100">
                              أستاذ التربية البدنية
                            </span>
                            <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors mt-0.5">
                              أ. {teacher.firstName} {teacher.lastName}
                            </h4>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <School className="w-3 h-3 text-slate-400" />
                              <span>{teacher.schoolName || 'مدرسة ابتدائية'}</span>
                            </p>
                          </div>
                        </div>

                        {/* Specs badges */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60 text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[10px] font-bold">البلدية:</span>
                            <span className="font-extrabold text-slate-800">{teacher.municipality || 'عين أزال'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-bold">الخبرة:</span>
                            <span className="font-extrabold text-slate-800">{teacher.yearsExperience || 6} سنوات</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action Controls */}
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => onToggleFollowTeacher(teacher.id)}
                          className={`flex-1 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${
                            isFollowed
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {isFollowed ? (
                            <>
                              <UserCheck className="w-4 h-4 text-emerald-700" />
                              <span>تتابع الحساب</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" />
                              <span>متابعة الحساب</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setSelectedDirectUser(teacher);
                            setActiveSubTab('direct_chats');
                          }}
                          className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center gap-1"
                          title="مراسلة خاصة"
                        >
                          <MessageCircle className="w-4 h-4 text-blue-600" />
                          <span>دردشة خاصة</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Section for Outside District Teachers Demonstration */}
          {showOutsideDistrict && (
            <div className="bg-amber-50/80 p-6 rounded-3xl border-2 border-amber-300 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm border-b border-amber-200 pb-2">
                <Lock className="w-5 h-5 text-amber-700" />
                <span>أساتذة من مقاطعات تفتيشية أخرى (تطبيق شرط عدم السماح بالمتابعة خارج المقاطعة)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {outsideDistrictTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="bg-white p-4 rounded-2xl border border-amber-200 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={teacher.avatar}
                        alt={teacher.firstName}
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                      <div>
                        <h5 className="text-xs font-extrabold text-slate-900">
                          أ. {teacher.firstName} {teacher.lastName}
                        </h5>
                        <span className="text-[10px] text-amber-800 block font-bold">
                          المقاطعة 01 - سطيف شرق (مقاطعة مختلفة!)
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAttemptOutsideFollow(teacher)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-amber-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-700" />
                      <span>محاولة متابعة</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 3: 1-ON-1 DIRECT CHAT WITH FOLLOWED PEERS (المحادثات الثنائية) */}
      {activeSubTab === 'direct_chats' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 space-y-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-extrabold flex items-center justify-center text-lg shadow-md">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  المحادثات المباشرة بين أساتذة المقاطعة
                </h3>
                <p className="text-xs text-slate-500">
                  دردشة خاصة مشفرة بين الأساتذة المتابَعين في {userDistrictName}
                </p>
              </div>
            </div>

            {/* Direct User Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600">اختر أستاذاً للمراسلة:</label>
              <select
                value={selectedDirectUser?.id || ''}
                onChange={(e) => {
                  const u = sameDistrictTeachers.find((t) => t.id === e.target.value);
                  setSelectedDirectUser(u || null);
                }}
                className="p-2.5 rounded-xl border border-slate-200 font-extrabold text-xs bg-slate-50 outline-none"
              >
                <option value="">-- اختر أستاذاً من المقاطعة --</option>
                {sameDistrictTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    أ. {t.firstName} {t.lastName} ({followedTeacherIds.includes(t.id) ? 'تتابع' : 'المقاطعة'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedDirectUser ? (
            <div className="space-y-4">
              {/* Active Conversation Header */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 flex items-center justify-between">
                <div
                  onClick={() => handleOpenUserProfile(selectedDirectUser)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <img
                    src={selectedDirectUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
                    alt={selectedDirectUser.firstName}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 group-hover:scale-105 transition-transform"
                  />
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                      محادثة مع الأستاذ: {selectedDirectUser.firstName} {selectedDirectUser.lastName}
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      {selectedDirectUser.schoolName || 'مدرسة ابتدائية'} • {userDistrictName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenUserProfile(selectedDirectUser)}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-[11px] font-bold rounded-xl transition-all cursor-pointer"
                  >
                    عرض البروفايل
                  </button>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1.5 rounded-xl border border-emerald-200">
                    🔒 محادثة خاصة بالمقاطعة
                  </span>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200/70 p-4 h-80 overflow-y-auto space-y-3">
                {directMessages.filter(
                  (m) =>
                    (m.senderId === currentUser.id && m.receiverId === selectedDirectUser.id) ||
                    (m.senderId === selectedDirectUser.id && m.receiverId === currentUser.id)
                ).length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    ✉️ لا توجد رسائل ثنائية سابقة مع الأستاذ {selectedDirectUser.firstName}. ابدأ المحادثة البيداغوجية الآن!
                  </div>
                ) : (
                  directMessages
                    .filter(
                      (m) =>
                        (m.senderId === currentUser.id && m.receiverId === selectedDirectUser.id) ||
                        (m.senderId === selectedDirectUser.id && m.receiverId === currentUser.id)
                    )
                    .map((msg) => {
                      const isMe = msg.senderId === currentUser.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                          <div
                            className={`max-w-md p-3.5 rounded-2xl text-xs space-y-1 shadow-xs ${
                              isMe
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4 text-[10px] opacity-80 border-b border-white/20 pb-1">
                              <span className="font-bold">{msg.senderName}</span>
                              <span>{msg.createdAt.slice(11, 16)}</span>
                            </div>
                            <p className="leading-relaxed font-medium">{msg.message}</p>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Direct Input Form */}
              <form onSubmit={handleSendDirect} className="flex gap-2">
                <input
                  type="text"
                  value={directInput}
                  onChange={(e) => setDirectInput(e.target.value)}
                  placeholder={`اكتب رسالة خاصة للأستاذ ${selectedDirectUser.firstName}...`}
                  className="flex-1 p-3 text-xs rounded-2xl border border-slate-200 outline-none focus:border-blue-500 bg-white"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-600">
                اختر أستاذك المتابَع للبدء بالمحادثة المباشرة
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                يمكنك التفاعل مع زملائك في عين أزال والمقاطعة 07 ومشاركتهم الأفكار والملاحظات الميدانية.
              </p>
            </div>
          )}
        </div>
      )}

      {/* User Profile Modal Component */}
      <UserProfileModal
        user={selectedProfileUser}
        currentUser={currentUser}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onToggleFollow={onToggleFollowTeacher}
        onStartDirectChat={handleStartDirectChatFromProfile}
      />
    </div>
  );
};
