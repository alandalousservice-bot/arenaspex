/**
 * SPEX - Professional Community Module (وحدة المجتمع المهني)
 * شبكة التواصل المهني الداخلي للأساتذة والمفتشين مع تبادل الموارد والمحادثات المباشرة
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  MessageSquare,
  Share2,
  BookMarked,
  Bell,
  Settings,
  UserCheck,
  UserPlus,
  ShieldCheck,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Send,
  Lock,
  Globe,
  CheckCircle2,
  Sparkles,
  Heart,
  Bookmark,
  Eye,
  FileCode,
  Download,
  PlusCircle,
  HelpCircle,
  X,
  Sliders,
  ChevronRight,
  Info,
  Check,
  Building2,
  Award,
  GraduationCap
} from 'lucide-react';

import {
  User,
  CommunityResource,
  CommunityChatMessage,
  CommunityNotification,
  PersonalLibraryItem,
  LessonPlan,
  KnowledgeItem,
  UserPrivacySettings
} from '../../types/spex';

interface ProfessionalCommunityViewProps {
  currentUser: User;
  onUpdateCurrentUser: (updatedUser: User) => void;
  allUsersList: User[];
  onUpdateAllUsers: (users: User[]) => void;
  communityResources: CommunityResource[];
  onAddCommunityResource: (resource: CommunityResource) => void;
  onToggleLikeResource: (resourceId: string) => void;
  onSaveToPersonalLibrary: (item: PersonalLibraryItem) => void;
  personalLibraryItems: PersonalLibraryItem[];
  directMessages: CommunityChatMessage[];
  onSendDirectMessage: (message: CommunityChatMessage) => void;
  notifications: CommunityNotification[];
  onMarkNotificationRead: (notificationId: string) => void;
  onDeleteNotification?: (notificationId: string) => void;
  onNotifyNewFollower?: (targetUserId: string) => void;
  lessonPlans: LessonPlan[];
  knowledgeItems: KnowledgeItem[];
}

export const ProfessionalCommunityView: React.FC<ProfessionalCommunityViewProps> = ({
  currentUser,
  onUpdateCurrentUser,
  allUsersList,
  onUpdateAllUsers,
  communityResources,
  onAddCommunityResource,
  onToggleLikeResource,
  onSaveToPersonalLibrary,
  personalLibraryItems,
  directMessages,
  onSendDirectMessage,
  notifications,
  onMarkNotificationRead,
  onDeleteNotification,
  onNotifyNewFollower,
  lessonPlans,
  knowledgeItems
}) => {
  const [activeTab, setActiveTab] = useState<'feed' | 'search' | 'chat' | 'notifications' | 'profile_privacy'>('feed');
  
  // Search state - ONLY search by username
  const [searchUsernameQuery, setSearchUsernameQuery] = useState('');
  
  // Chat state
  const [selectedChatUser, setSelectedChatUser] = useState<User | null>(null);
  const [chatInputText, setChatInputText] = useState('');
  const [attachedFileType, setAttachedFileType] = useState<'none' | 'image' | 'pdf' | 'word' | 'resource'>('none');
  const [attachedFileName, setAttachedFileName] = useState('');
  const [selectedResourceToShare, setSelectedResourceToShare] = useState<CommunityResource | null>(null);
  
  // Sharing Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareCategory, setShareCategory] = useState<'game' | 'situation' | 'lesson_plan' | 'file'>('game');
  const [shareTitle, setShareTitle] = useState('');
  const [shareDescription, setShareDescription] = useState('');
  
  // Privacy Settings Form state
  const [privacySettings, setPrivacySettings] = useState<UserPrivacySettings>(() => {
    return currentUser.privacySettings || {
      whoCanFollow: 'everyone',
      whoCanMessage: 'everyone',
      showInSearch: true,
      showPersonalInfo: true
    };
  });
  const [userBio, setUserBio] = useState(currentUser.bio || '');

  // Followers & Following Modal
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [followersModalType, setFollowersModalType] = useState<'followers' | 'following'>('followers');

  // Filter users by Username strictly
  const searchResults = useMemo(() => {
    if (!searchUsernameQuery.trim()) return [];
    const cleanQuery = searchUsernameQuery.trim().toLowerCase().replace(/^@/, '');
    
    return allUsersList.filter(u => {
      if (u.id === currentUser.id) return false;
      if (u.privacySettings?.showInSearch === false) return false;
      const usernameClean = (u.username || '').toLowerCase().replace(/^@/, '');
      return usernameClean.includes(cleanQuery);
    });
  }, [searchUsernameQuery, allUsersList, currentUser.id]);

  // Handle Follow/Unfollow
  const handleToggleFollow = (targetUser: User) => {
    const isCurrentlyFollowing = (currentUser.followingIds || []).includes(targetUser.id);
    
    let updatedMyFollowing = [...(currentUser.followingIds || [])];
    if (isCurrentlyFollowing) {
      updatedMyFollowing = updatedMyFollowing.filter(id => id !== targetUser.id);
    } else {
      updatedMyFollowing.push(targetUser.id);
    }

    const updatedMe: User = {
      ...currentUser,
      followingIds: updatedMyFollowing,
      followingCount: updatedMyFollowing.length
    };

    // Update target user's followers
    const updatedUsers = allUsersList.map(u => {
      if (u.id === currentUser.id) {
        return updatedMe;
      }
      if (u.id === targetUser.id) {
        let updatedFollowers = [...(u.followersIds || [])];
        if (isCurrentlyFollowing) {
          updatedFollowers = updatedFollowers.filter(id => id !== currentUser.id);
        } else {
          updatedFollowers.push(currentUser.id);
        }
        return {
          ...u,
          followersIds: updatedFollowers,
          followersCount: updatedFollowers.length
        };
      }
      return u;
    });

    onUpdateCurrentUser(updatedMe);
    onUpdateAllUsers(updatedUsers);

    // Notify the target user on a NEW follow only (not on unfollow)
    if (!isCurrentlyFollowing && onNotifyNewFollower) {
      onNotifyNewFollower(targetUser.id);
    }
  };

  // Handle Save Privacy Settings
  const handleSavePrivacySettings = () => {
    const updatedUser: User = {
      ...currentUser,
      bio: userBio,
      privacySettings
    };
    onUpdateCurrentUser(updatedUser);
    alert('تم حفظ إعدادات الخصوصية والملف الشخصي بنجاح!');
  };

  // Handle Publish New Community Resource
  const handlePublishResource = () => {
    if (!shareTitle.trim() || !shareDescription.trim()) {
      alert('يرجى كتابة عنوان ووصف المورد المراد مشاركته في المجتمع المهني');
      return;
    }

    const newResource: CommunityResource = {
      id: `res_${Date.now()}`,
      spexId: currentUser.spexId || 'SPX-8K31H2',
      authorName: `${currentUser.firstName} ${currentUser.lastName}`,
      authorUsername: `@${currentUser.username || 'user'}`,
      authorRole: currentUser.role,
      authorAvatar: currentUser.avatar,
      type: shareCategory,
      title: shareTitle,
      description: shareDescription,
      likesCount: 1,
      savesCount: 0,
      isApprovedByInspector: currentUser.role === 'inspector',
      createdAt: new Date().toISOString()
    };

    onAddCommunityResource(newResource);
    setIsShareModalOpen(false);
    setShareTitle('');
    setShareDescription('');
    alert('تم نشر المورد بنجاح في المجتمع المهني!');
  };

  // Handle Direct Send Chat Message
  const handleSendMessage = () => {
    if (!selectedChatUser) return;
    if (!chatInputText.trim() && !selectedResourceToShare && attachedFileType === 'none') return;

    const newMessage: CommunityChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      senderSpexId: currentUser.spexId,
      senderUsername: currentUser.username,
      senderName: `${currentUser.firstName} ${currentUser.lastName}`,
      senderAvatar: currentUser.avatar,
      receiverId: selectedChatUser.id,
      receiverSpexId: selectedChatUser.spexId,
      message: chatInputText.trim() || (selectedResourceToShare ? `مشاركة مورد: ${selectedResourceToShare.title}` : 'مرفق جديد'),
      sharedResource: selectedResourceToShare || undefined,
      attachment: attachedFileType !== 'none' ? {
        url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600',
        name: attachedFileName || 'ملف_مرفق',
        type: attachedFileType === 'resource' ? 'resource' : attachedFileType,
        size: '1.4 MB'
      } : undefined,
      createdAt: new Date().toISOString(),
      read: false
    };

    onSendDirectMessage(newMessage);
    setChatInputText('');
    setSelectedResourceToShare(null);
    setAttachedFileType('none');
    setAttachedFileName('');
  };

  // Filter messages between current user and selected user
  const activeChatMessages = useMemo(() => {
    if (!selectedChatUser) return [];
    return directMessages.filter(
      m => (m.senderId === currentUser.id && m.receiverId === selectedChatUser.id) ||
           (m.senderId === selectedChatUser.id && m.receiverId === currentUser.id)
    );
  }, [directMessages, currentUser.id, selectedChatUser]);

  // Unread notifications count
  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter(n => n.userId === currentUser.id && !n.read).length;
  }, [notifications, currentUser.id]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12" dir="rtl">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-blue-800/50">
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/20 text-blue-200">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>SPEX Professional Community</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              المجتمع المهني للتربية البدنية والرياضية
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              تواصل مباشر وتبادل بيداغوجي موثوق بين الأساتذة والمفتشين داخل وخارج المقاطعات التفتيشية.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold rounded-2xl transition-all cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>مشاركة مورد بيداغوجي</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('feed')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'feed'
                ? 'bg-white text-blue-900 shadow-md font-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Globe className="w-4 h-4 text-blue-600" />
            <span>منشورات الموارد والخبرات</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'search'
                ? 'bg-white text-blue-900 shadow-md font-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Search className="w-4 h-4 text-amber-500" />
            <span>البحث بالحساب (@Username)</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap relative ${
              activeTab === 'chat'
                ? 'bg-white text-blue-900 shadow-md font-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>المحادثات الخاصة والموارد</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap relative ${
              activeTab === 'notifications'
                ? 'bg-white text-blue-900 shadow-md font-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Bell className="w-4 h-4 text-yellow-400" />
            <span>الإشعارات</span>
            {unreadNotificationsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('profile_privacy')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'profile_privacy'
                ? 'bg-white text-blue-900 shadow-md font-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Settings className="w-4 h-4 text-cyan-400" />
            <span>حسابي الشخصي والخصوصية</span>
          </button>
        </div>
      </div>

      {/* TABS CONTENT */}

      {/* 1. PEDAGOGICAL RESOURCES FEED TAB */}
      {activeTab === 'feed' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>الموارد والأنشطة المنشورة من زملاء المجتمع المهني ({communityResources.length})</span>
            </div>

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة لعبة / مذكرة جديدة</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {communityResources.length === 0 ? (
              <div className="col-span-full p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
                <BookMarked className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-700">لا توجد موارد مشتركة حالياً</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  كن أول من يشارك لعبة تربوية أو وضعية حركية أو مذكرة بيداغوجية مع أساتذة المنصة!
                </p>
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="px-5 py-2.5 bg-blue-600 text-white text-xs font-extrabold rounded-2xl shadow-md"
                >
                  نشر مورد جديد
                </button>
              </div>
            ) : (
              communityResources.map(res => (
                <div key={res.id} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-4">
                  {/* Author Banner */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <img
                        src={res.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
                        alt={res.authorName}
                        className="w-10 h-10 rounded-2xl object-cover border border-slate-200 shadow-xs"
                      />
                      <div>
                        <h4 className="text-xs font-black text-slate-900 flex items-center gap-1">
                          <span>{res.authorName}</span>
                          {res.isApprovedByInspector && (
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" title="معتمد من التفتيش" />
                          )}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span className="font-extrabold text-blue-700 dir-ltr">{res.authorUsername}</span>
                          <span>•</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold">{res.spexId}</span>
                        </div>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-black rounded-lg border border-blue-100">
                      {res.type === 'game' ? 'لعبة تربوية' : res.type === 'situation' ? 'وضعية تعلمية' : res.type === 'lesson_plan' ? 'مذكرة بيداغوجية' : 'مورد تعليمي'}
                    </span>
                  </div>

                  {/* Resource Content */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-black text-slate-900 leading-snug">
                      {res.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      {res.description}
                    </p>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onToggleLikeResource(res.id)}
                        className={`flex items-center gap-1 text-xs font-bold cursor-pointer transition-colors ${
                          (res.likedByUserIds || []).includes(currentUser.id)
                            ? 'text-rose-600'
                            : 'text-slate-500 hover:text-rose-600'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${(res.likedByUserIds || []).includes(currentUser.id) ? 'fill-current' : ''}`} />
                        <span>{res.likesCount}</span>
                      </button>

                      <button
                        onClick={() => {
                          // Copy directly to user's personal library
                          const libraryItem: PersonalLibraryItem = {
                            id: `lib_${Date.now()}`,
                            teacherId: currentUser.id,
                            type: res.type === 'game' ? 'game' : 'situation',
                            title: res.title,
                            content: res.description,
                            tags: ['المجتمع_المهني', res.authorUsername],
                            createdAt: new Date().toISOString()
                          };
                          onSaveToPersonalLibrary(libraryItem);
                          alert('تم حفظ المورد بنجاح داخل مكتبتك البيداغوجية الشخصية!');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-xl border border-emerald-200 cursor-pointer transition-all"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-emerald-600" />
                        <span>حفظ المورد بمكتبتي</span>
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        // Find user and open direct chat
                        const author = allUsersList.find(u => u.spexId === res.spexId || u.username === res.authorUsername.replace(/^@/, ''));
                        if (author) {
                          setSelectedChatUser(author);
                          setSelectedResourceToShare(res);
                          setActiveTab('chat');
                        } else {
                          alert('لا يمكن الاتصال بصاحب المورد حالياً');
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>مشاركة بركالة</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. SEARCH BY USERNAME ONLY TAB */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">محرك البحث بالحساب الموحد (Username)</h3>
                <p className="text-xs text-slate-500 font-medium">
                  وفق الضوابط الرسمية: الوصول للحسابات متاح <strong className="text-amber-700">حصرياً بواسطة Username</strong> دون إمكانية البحث بالاسم أو الولايات أو المؤسسات.
                </p>
              </div>
            </div>

            {/* Strict Username Search Input */}
            <div className="relative">
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-sm">@</span>
              <input
                type="text"
                value={searchUsernameQuery}
                onChange={(e) => setSearchUsernameQuery(e.target.value)}
                placeholder="أدخل اسم المستخدم الفريد بدقة (مثال: abdelmalek_nabti)..."
                className="w-full pr-10 pl-4 py-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dir-ltr text-right"
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-[11px] text-amber-900 flex items-center gap-2 font-medium">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>إذا لم تكن تعرف Username الخاص بالزميل، فلن يتم إظهار الحساب في نواتج البحث لحماية الخصوصية.</span>
            </div>
          </div>

          {/* Search Results List */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>نتائج البحث للـ Username: ({searchResults.length})</span>
            </h4>

            {searchUsernameQuery.trim() === '' ? (
              <div className="p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 space-y-2">
                <Search className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-bold">أدخل Username بالخانة أعلاه لعرض الحساب الشخصي</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-10 text-center bg-rose-50/50 rounded-3xl border border-rose-100 text-rose-800 space-y-2">
                <Lock className="w-8 h-8 text-rose-400 mx-auto" />
                <h4 className="text-xs font-black">لم يتم العثور على أي حساب بهذا الـ Username</h4>
                <p className="text-[11px] text-rose-600 font-medium max-w-sm mx-auto">
                  تأكد من كتابة الأحرف والرموز بدقة، أو قد يكون صاحب الحساب غيّر إعدادات الخصوصية لمنع الظهور.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map(user => {
                  const isFollowing = (currentUser.followingIds || []).includes(user.id);
                  return (
                    <div key={user.id} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
                            alt={user.username}
                            className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-xs"
                          />
                          <div>
                            <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                              <span>{user.firstName} {user.lastName}</span>
                              {user.role === 'inspector' && (
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              )}
                            </h3>
                            <div className="text-xs font-extrabold text-blue-600 dir-ltr text-right">
                              @{user.username}
                            </div>
                            <div className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">
                              SPEX ID: {user.spexId}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleFollow(user)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                            isFollowing
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                          }`}
                        >
                          {isFollowing ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>تتابعه</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>متابعة</span>
                            </>
                          )}
                        </button>
                      </div>

                      {user.bio && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium leading-relaxed">
                          "{user.bio}"
                        </p>
                      )}

                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] bg-slate-50/80 p-2 rounded-xl font-bold border border-slate-100">
                        <div>
                          <span className="text-slate-400 block">المتابعون</span>
                          <strong className="text-slate-800 text-xs">{user.followersCount || user.followersIds?.length || 0}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">يتابع</span>
                          <strong className="text-slate-800 text-xs">{user.followingCount || user.followingIds?.length || 0}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">الموارد</span>
                          <strong className="text-blue-700 text-xs">{user.publishedResourcesCount || 0}</strong>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-bold">
                          {user.schoolName || 'المؤسسة التعليمية المعتمدة'}
                        </span>

                        <button
                          onClick={() => {
                            setSelectedChatUser(user);
                            setActiveTab('chat');
                          }}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                          <span>مراسلة خاصة</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. DIRECT COMMUNITY CHAT TAB */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[520px]">
          {/* Chat Contacts Sidebar */}
          <div className="border-b md:border-b-0 md:border-l border-slate-200 bg-slate-50/50 p-4 space-y-4">
            <h3 className="text-xs font-black text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span>المحادثات والزملاء</span>
              </span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold">
                {allUsersList.length - 1} زميل
              </span>
            </h3>

            <div className="space-y-1.5 max-h-[440px] overflow-y-auto">
              {allUsersList.filter(u => u.id !== currentUser.id).map(user => {
                const isSelected = selectedChatUser?.id === user.id;
                const lastMsg = directMessages.filter(
                  m => (m.senderId === currentUser.id && m.receiverId === user.id) ||
                       (m.senderId === user.id && m.receiverId === currentUser.id)
                ).pop();

                return (
                  <button
                    key={user.id}
                    onClick={() => setSelectedChatUser(user)}
                    className={`w-full p-3 rounded-2xl transition-all text-right cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'hover:bg-slate-100/80 text-slate-800'
                    }`}
                  >
                    <img
                      src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
                      alt={user.username}
                      className="w-10 h-10 rounded-2xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {user.firstName} {user.lastName}
                        </h4>
                        <span className={`text-[10px] font-extrabold dir-ltr ${isSelected ? 'text-blue-200' : 'text-blue-600'}`}>
                          @{user.username}
                        </span>
                      </div>
                      <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                        {lastMsg ? lastMsg.message : 'ابدأ المحادثة ومشاركة الموارد...'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Chat Conversation Area */}
          <div className="md:col-span-2 flex flex-col justify-between p-4 bg-white">
            {!selectedChatUser ? (
              <div className="my-auto text-center space-y-3 p-8">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">اختر زميلاً لبدء المحادثة ومشاركة الموارد</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  يمكنك إرسال الرسائل النصية، الصور، ملفات Word و PDF، ومشاركة الألعاب والمذكرات البيداغوجية مباشرة.
                </p>
              </div>
            ) : (
              <>
                {/* Chat Top Banner */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedChatUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
                      alt={selectedChatUser.username}
                      className="w-10 h-10 rounded-2xl object-cover border border-slate-200"
                    />
                    <div>
                      <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>{selectedChatUser.firstName} {selectedChatUser.lastName}</span>
                        {selectedChatUser.role === 'inspector' && (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="font-extrabold text-blue-600 dir-ltr">@{selectedChatUser.username}</span>
                        <span>•</span>
                        <span className="font-mono">{selectedChatUser.spexId}</span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-100">
                    محادثة آمنة وموثقة
                  </span>
                </div>

                {/* Messages List Area */}
                <div className="flex-1 overflow-y-auto my-4 space-y-3 max-h-[380px] p-2">
                  {activeChatMessages.length === 0 ? (
                    <div className="text-center text-xs text-slate-400 py-10 font-bold">
                      لا توجد رسائل سابقة. أرسل تحية أو شارك لعبة تربوية الآن!
                    </div>
                  ) : (
                    activeChatMessages.map(msg => {
                      const isMe = msg.senderId === currentUser.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl space-y-2 text-xs font-medium ${
                              isMe
                                ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                                : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/80'
                            }`}
                          >
                            <p className="leading-relaxed">{msg.message}</p>

                            {/* Attached Shared Resource card */}
                            {msg.sharedResource && (
                              <div className={`p-3 rounded-xl border space-y-2 mt-2 ${
                                isMe ? 'bg-blue-700/80 border-blue-400/30 text-white' : 'bg-white border-slate-200 text-slate-900'
                              }`}>
                                <div className="flex items-center justify-between text-[10px] font-bold">
                                  <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-900">
                                    {msg.sharedResource.type === 'game' ? 'لعبة تربوية' : 'مذكرة بيداغوجية'}
                                  </span>
                                  <span>{msg.sharedResource.authorName}</span>
                                </div>
                                <h4 className="text-xs font-black">{msg.sharedResource.title}</h4>
                                <p className="text-[11px] opacity-90 line-clamp-2">{msg.sharedResource.description}</p>
                                
                                <button
                                  onClick={() => {
                                    const libraryItem: PersonalLibraryItem = {
                                      id: `lib_${Date.now()}`,
                                      teacherId: currentUser.id,
                                      type: 'game',
                                      title: msg.sharedResource!.title,
                                      content: msg.sharedResource!.description,
                                      tags: ['مشاركة_محادثة'],
                                      createdAt: new Date().toISOString()
                                    };
                                    onSaveToPersonalLibrary(libraryItem);
                                    alert('تم حفظ هذا المورد مباشرة في مكتبتك البيداغوجية الشخصية!');
                                  }}
                                  className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-extrabold rounded-lg shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <Bookmark className="w-3.5 h-3.5" />
                                  <span>حفظ في مكتبتي البيداغوجية</span>
                                </button>
                              </div>
                            )}

                            {/* Attached Image / PDF / Word File */}
                            {msg.attachment && (
                              <div className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] font-bold ${
                                isMe ? 'bg-blue-800/60 border-blue-400/30 text-white' : 'bg-white border-slate-200 text-slate-800'
                              }`}>
                                <div className="flex items-center gap-2">
                                  {msg.attachment.type === 'image' ? (
                                    <ImageIcon className="w-4 h-4 text-emerald-300" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-amber-300" />
                                  )}
                                  <span className="truncate max-w-[140px]">{msg.attachment.name}</span>
                                </div>

                                <button
                                  onClick={() => alert(`تنزيل الملف: ${msg.attachment?.name}`)}
                                  className="p-1 rounded bg-white/20 hover:bg-white/30 text-white cursor-pointer"
                                  title="تنزيل"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            <span className={`text-[9px] block text-left dir-ltr ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Selected Resource Preview before sending */}
                {selectedResourceToShare && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl mb-2 flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-900 truncate">
                      مورد محدد للمشاركة: {selectedResourceToShare.title}
                    </span>
                    <button onClick={() => setSelectedResourceToShare(null)} className="text-slate-500 hover:text-slate-800">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Attached file preview */}
                {attachedFileType !== 'none' && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl mb-2 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-900 truncate">
                      مرفق محدد ({attachedFileType}): {attachedFileName}
                    </span>
                    <button onClick={() => setAttachedFileType('none')} className="text-slate-500 hover:text-slate-800">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Message Input Controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setAttachedFileType('image');
                        setAttachedFileName(`صورة_حصة_${Date.now()}.png`);
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                      title="إرفاق صورة"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setAttachedFileType('pdf');
                        setAttachedFileName(`وثيقة_وزارية_${Date.now()}.pdf`);
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                      title="إرفاق PDF أو Word"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="اكتب رسالتك للزميل أو استفسارك هنا..."
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />

                  <button
                    onClick={handleSendMessage}
                    className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all cursor-pointer shadow-md"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 4. NOTIFICATIONS TAB */}
      {activeTab === 'notifications' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" />
              <span>إشعارات المجتمع المهني والتنبيهات المباشرة</span>
            </h3>

            <span className="text-xs text-slate-500 font-bold">
              غير المقروءة: {unreadNotificationsCount}
            </span>
          </div>

          <div className="space-y-2.5">
            {notifications.filter(n => n.userId === currentUser.id).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-bold">
                لا توجد إشعارات جديدة حالياً
              </div>
            ) : (
              notifications.filter(n => n.userId === currentUser.id).map(notif => (
                <div
                  key={notif.id}
                  onClick={() => onMarkNotificationRead(notif.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    notif.read ? 'bg-slate-50 border-slate-100 text-slate-600' : 'bg-blue-50/80 border-blue-200 text-blue-900 font-bold'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black">{notif.title}</h4>
                      <span className="text-[10px] text-slate-400 dir-ltr">
                        {new Date(notif.createdAt).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs mt-1 leading-relaxed">{notif.message}</p>
                  </div>

                  {onDeleteNotification && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNotification(notif.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer shrink-0"
                      title="حذف الإشعار"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 5. PROFILE & PRIVACY SETTINGS TAB */}
      {activeTab === 'profile_privacy' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Personal Card & Identity Details */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="text-center space-y-3 border-b border-slate-100 pb-6">
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
                alt={currentUser.firstName}
                className="w-24 h-24 rounded-3xl object-cover mx-auto border-4 border-blue-50 shadow-md"
              />

              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {currentUser.firstName} {currentUser.lastName}
                </h3>
                <div className="text-xs font-black text-blue-600 dir-ltr mt-0.5">
                  @{currentUser.username}
                </div>
              </div>

              {/* Immutable SPEX ID */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono font-bold border border-slate-800">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SPEX ID: {currentUser.spexId}</span>
              </div>
            </div>

            {/* Account Metrics */}
            <div className="grid grid-cols-2 gap-3 text-center text-xs">
              <button
                onClick={() => {
                  setFollowersModalType('followers');
                  setIsFollowersModalOpen(true);
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition-all cursor-pointer"
              >
                <span className="text-[10px] text-slate-400 font-bold block">المتابعون</span>
                <strong className="text-base font-black text-slate-900">{currentUser.followersCount || currentUser.followersIds?.length || 0}</strong>
              </button>

              <button
                onClick={() => {
                  setFollowersModalType('following');
                  setIsFollowersModalOpen(true);
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition-all cursor-pointer"
              >
                <span className="text-[10px] text-slate-400 font-bold block">تتابعهم</span>
                <strong className="text-base font-black text-slate-900">{currentUser.followingCount || currentUser.followingIds?.length || 0}</strong>
              </button>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block">الموارد المنشورة</span>
                <strong className="text-base font-black text-blue-700">{currentUser.publishedResourcesCount || 0}</strong>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block">الموارد المعتمدة</span>
                <strong className="text-base font-black text-emerald-700">{currentUser.approvedResourcesCount || 0}</strong>
              </div>
            </div>

            {/* Editable Bio Form */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 block">النبذة الشخصية والرسالة المهنية:</label>
              <textarea
                value={userBio}
                onChange={(e) => setUserBio(e.target.value)}
                rows={3}
                placeholder="اكتب نبذة موجزة تظهر لزملائك بالمجتمع المهني..."
                className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Privacy & Permissions Form */}
          <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">إعدادات الخصوصية والتحكم في الحساب</h3>
                <p className="text-xs text-slate-500 font-medium">
                  حدد الضوابط والصلاحيات لمشاهدة ملفك الشخصي ومراسلتك والظهور في البحث عبر Username.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Who can follow */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 block">من يستطيع متابعة حسابك؟</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPrivacySettings({ ...privacySettings, whoCanFollow: 'everyone' })}
                    className={`p-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer text-right flex items-center justify-between ${
                      privacySettings.whoCanFollow === 'everyone'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>الجميع بالمجتمع المهني</span>
                    {privacySettings.whoCanFollow === 'everyone' && <Check className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrivacySettings({ ...privacySettings, whoCanFollow: 'approved_only' })}
                    className={`p-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer text-right flex items-center justify-between ${
                      privacySettings.whoCanFollow === 'approved_only'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>الحسابات المعتمدة فقط</span>
                    {privacySettings.whoCanFollow === 'approved_only' && <Check className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Who can message */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 block">من يستطيع مراسلتك على الخاص؟</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPrivacySettings({ ...privacySettings, whoCanMessage: 'everyone' })}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      privacySettings.whoCanMessage === 'everyone'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>الجميع</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrivacySettings({ ...privacySettings, whoCanMessage: 'following_only' })}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      privacySettings.whoCanMessage === 'following_only'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>من أتابعهم فقط</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrivacySettings({ ...privacySettings, whoCanMessage: 'nobody' })}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      privacySettings.whoCanMessage === 'nobody'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>إغلاق الرسائل</span>
                  </button>
                </div>
              </div>

              {/* Show in Search */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900">ظهور الحساب في نتائج البحث عبر Username</h4>
                  <p className="text-[11px] text-slate-500 font-medium">عند إيقافه لن يستطيع أحد العثور عليك عبر محرك البحث.</p>
                </div>

                <button
                  type="button"
                  onClick={() => setPrivacySettings({ ...privacySettings, showInSearch: !privacySettings.showInSearch })}
                  className={`w-12 h-6 rounded-full transition-all relative p-0.5 cursor-pointer ${
                    privacySettings.showInSearch ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full bg-white block shadow-md transition-transform ${
                    privacySettings.showInSearch ? 'translate-x-0' : '-translate-x-6'
                  }`} />
                </button>
              </div>

              {/* Show Personal Info */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900">إظهار المؤسسة والرتبة المهنية بالبروفايل العامة</h4>
                  <p className="text-[11px] text-slate-500 font-medium">عرض اسم المدرسة الابتدائية والمقاطعة التفتيشية للزوار.</p>
                </div>

                <button
                  type="button"
                  onClick={() => setPrivacySettings({ ...privacySettings, showPersonalInfo: !privacySettings.showPersonalInfo })}
                  className={`w-12 h-6 rounded-full transition-all relative p-0.5 cursor-pointer ${
                    privacySettings.showPersonalInfo ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full bg-white block shadow-md transition-transform ${
                    privacySettings.showPersonalInfo ? 'translate-x-0' : '-translate-x-6'
                  }`} />
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={handleSavePrivacySettings}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-2xl transition-all cursor-pointer shadow-md"
              >
                حفظ التعديلات وإعدادات الخصوصية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE NEW RESOURCE MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-600" />
                <span>مشاركة مورد بيداغوجي بالمجتمع المهني</span>
              </h3>
              <button onClick={() => setIsShareModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">نوع المورد المراد مشاركته:</label>
                <select
                  value={shareCategory}
                  onChange={(e) => setShareCategory(e.target.value as any)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800"
                >
                  <option value="game">لعبة تربوية حركية</option>
                  <option value="situation">وضعية تعلمية للمنافسة</option>
                  <option value="lesson_plan">مذكرة بيداغوجية نموذجية</option>
                  <option value="file">خبرة أو ملف تعليمي (PDF / Word)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">عنوان المورد أو الأنشطة:</label>
                <input
                  type="text"
                  value={shareTitle}
                  onChange={(e) => setShareTitle(e.target.value)}
                  placeholder="مثال: لعبة سباق التتابع السريع للميدان البدني..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">تفاصيل المورد وشرح طريقة التنفيذ:</label>
                <textarea
                  value={shareDescription}
                  onChange={(e) => setShareDescription(e.target.value)}
                  rows={4}
                  placeholder="اكتب شرحاً واضحاً للأهداف، الوسائل المستعملة، وتوجيهات السلامة..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
              >
                إلغاء
              </button>

              <button
                onClick={handlePublishResource}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md"
              >
                نشر المورد للجميع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOLLOWERS / FOLLOWING LIST MODAL */}
      {isFollowersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">
                {followersModalType === 'followers' ? 'قائمة المتابعين لحسابك' : 'قائمة الحسابات التي تتابعها'}
              </h3>
              <button onClick={() => setIsFollowersModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {allUsersList.filter(u => {
                if (followersModalType === 'followers') {
                  return (currentUser.followersIds || []).includes(u.id);
                }
                return (currentUser.followingIds || []).includes(u.id);
              }).length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-bold">
                  القائمة فارغة حالياً
                </div>
              ) : (
                allUsersList.filter(u => {
                  if (followersModalType === 'followers') {
                    return (currentUser.followersIds || []).includes(u.id);
                  }
                  return (currentUser.followingIds || []).includes(u.id);
                }).map(u => (
                  <div key={u.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'} alt={u.username} className="w-9 h-9 rounded-xl object-cover" />
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{u.firstName} {u.lastName}</h4>
                        <span className="text-[10px] text-blue-600 font-bold dir-ltr block">@{u.username}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setIsFollowersModalOpen(false);
                        setSelectedChatUser(u);
                        setActiveTab('chat');
                      }}
                      className="px-3 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg"
                    >
                      مراسلة
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
