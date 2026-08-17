/**
 * SPEX - Professional Communication Hub (فضاء التواصل المهني)
 * ميزة موحّدة تجمع في تبويب واحد: الدردشة الجماعية للمقاطعة، الرسائل المباشرة،
 * المنشورات المهنية، دليل الزملاء، والإشعارات — بدل ميزتين منفصلتين بوظائف مكررة.
 */

import React, { useState } from 'react';
import {
  MessageCircle,
  Globe,
  Users,
  Bell,
  Settings,
  Radio,
  ShieldCheck,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import {
  User,
  DistrictGroupMessage,
  DirectChatMessage,
  CommunityChatMessage,
  CommunityResource,
  CommunityNotification,
  PersonalLibraryItem,
  LessonPlan,
  KnowledgeItem,
  InspectionDistrict
} from '../../types/spex';
import { DistrictChatView } from '../chat/DistrictChatView';
import { ProfessionalCommunityView } from '../community/ProfessionalCommunityView';

interface ProfessionalHubProps {
  currentUser: User;
  onUpdateCurrentUser: (updatedUser: User) => void;
  allUsersList: User[];
  onUpdateAllUsers: (users: User[]) => void;
  districts?: InspectionDistrict[];
  groupMessages: DistrictGroupMessage[];
  directMessages: DirectChatMessage[];
  onSendGroupMessage: (msg: { message: string; replyToId?: string }) => void;
  onSendDirectMessageFromChat: (receiverId: string, receiverName: string, message: string) => void;
  onToggleFollowTeacher: (teacherId: string) => void;
  communityResources: CommunityResource[];
  onAddCommunityResource: (resource: CommunityResource) => void;
  onToggleLikeResource: (resourceId: string) => void;
  onSaveToPersonalLibrary: (item: PersonalLibraryItem) => void;
  personalLibraryItems: PersonalLibraryItem[];
  onSendDirectMessage: (message: CommunityChatMessage) => void;
  notifications: CommunityNotification[];
  onMarkNotificationRead: (notificationId: string) => void;
  onDeleteNotification?: (notificationId: string) => void;
  onNotifyNewFollower?: (targetUserId: string) => void;
  lessonPlans: LessonPlan[];
  knowledgeItems: KnowledgeItem[];
}

type HubSection = 'district' | 'direct' | 'posts' | 'directory' | 'notifications' | 'privacy';

export const ProfessionalHub: React.FC<ProfessionalHubProps> = ({
  currentUser,
  onUpdateCurrentUser,
  allUsersList,
  onUpdateAllUsers,
  districts = [],
  groupMessages,
  directMessages,
  onSendGroupMessage,
  onSendDirectMessageFromChat,
  onToggleFollowTeacher,
  communityResources,
  onAddCommunityResource,
  onToggleLikeResource,
  onSaveToPersonalLibrary,
  personalLibraryItems,
  onSendDirectMessage,
  notifications,
  onMarkNotificationRead,
  onDeleteNotification,
  onNotifyNewFollower,
  lessonPlans,
  knowledgeItems
}) => {
  const [section, setSection] = useState<HubSection>('district');

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;
  const colleaguesCount = Math.max(allUsersList.length - 1, 0);

  const sections: Array<{
    id: HubSection;
    label: string;
    icon: React.ElementType;
    badge?: string | number;
  }> = [
    { id: 'district', label: 'مقاطعتك', icon: Radio },
    { id: 'direct', label: 'الرسائل المباشرة', icon: MessageCircle },
    { id: 'posts', label: 'المنشورات المهنية', icon: Globe },
    { id: 'directory', label: 'دليل الزملاء', icon: Users, badge: colleaguesCount },
    {
      id: 'notifications',
      label: 'الإشعارات',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined
    }
  ];

  return (
    <div className="space-y-4">
      {/* Hub Header */}
      <div className="bg-gradient-to-l from-emerald-600 via-teal-600 to-cyan-700 rounded-3xl shadow-lg p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_55%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <h2 className="text-xl font-black flex items-center gap-2">
                فضاء التواصل المهني
                <span className="px-2 py-0.5 bg-white/15 rounded-full text-[10px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-200" />
                  {groupMessages.length} رسالة في قناة المقاطعة
                </span>
              </h2>
              <p className="text-xs font-semibold text-emerald-100 mt-1">
                دردشة المقاطعة، الرسائل المباشرة، منشورات المجتمع، دليل الزملاء والإشعارات في مكان واحد
              </p>
            </div>
          </div>
          <button
            onClick={() => setSection('privacy')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white text-xs font-black rounded-2xl transition-all cursor-pointer"
            title="حسابي الشخصي والخصوصية"
          >
            <Settings className="w-4 h-4" />
            <span>الخصوصية</span>
          </button>
        </div>

        {/* Section Tabs */}
        <div className="relative mt-5 pt-4 border-t border-white/15 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = section === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-teal-900 shadow-md font-black'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-cyan-300'}`} />
                <span>{s.label}</span>
                {s.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-teal-600 text-white' : 'bg-white/20 text-white'
                    }`}
                  >
                    {s.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content — كل قسم يغلف المكوّن الحالي المُعاد استخدامه مع تبويب مُتحكَّم به */}
      {(section === 'district' || section === 'direct' || section === 'directory') && (
        <DistrictChatView
          currentUser={currentUser}
          allUsers={allUsersList}
          districts={districts}
          groupMessages={groupMessages}
          directMessages={directMessages}
          onSendGroupMessage={onSendGroupMessage}
          onSendDirectMessage={onSendDirectMessageFromChat}
          onToggleFollowTeacher={onToggleFollowTeacher}
          controlledSubTab={section === 'district' ? 'group_chat' : section === 'direct' ? 'direct_chats' : 'directory'}
          hideTabBar
        />
      )}

      {(section === 'posts' || section === 'notifications' || section === 'privacy') && (
        <ProfessionalCommunityView
          currentUser={currentUser}
          onUpdateCurrentUser={onUpdateCurrentUser}
          allUsersList={allUsersList}
          onUpdateAllUsers={onUpdateAllUsers}
          communityResources={communityResources}
          onAddCommunityResource={onAddCommunityResource}
          onToggleLikeResource={onToggleLikeResource}
          onSaveToPersonalLibrary={onSaveToPersonalLibrary}
          personalLibraryItems={personalLibraryItems}
          directMessages={directMessages as unknown as CommunityChatMessage[]}
          onSendDirectMessage={onSendDirectMessage}
          notifications={notifications}
          onMarkNotificationRead={onMarkNotificationRead}
          onDeleteNotification={onDeleteNotification}
          onNotifyNewFollower={onNotifyNewFollower}
          lessonPlans={lessonPlans}
          knowledgeItems={knowledgeItems}
          controlledTab={section === 'posts' ? 'feed' : section === 'notifications' ? 'notifications' : 'profile_privacy'}
          hideTabBar
        />
      )}

      {/* شارة توحيد الميزات */}
      <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-slate-400">
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        <span>التواصل المهني يجمع قنوات المقاطعة والرسائل المباشرة والمجتمع في ميزة واحدة</span>
      </div>
    </div>
  );
};
