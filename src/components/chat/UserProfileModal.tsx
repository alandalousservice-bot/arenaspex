import React from 'react';
import {
  X,
  User,
  Building2,
  School,
  MapPin,
  Award,
  CheckCircle2,
  UserPlus,
  UserCheck,
  MessageCircle,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Star,
  Lock,
  GraduationCap
} from 'lucide-react';
import { User as UserType } from '../../types/spex';

interface UserProfileModalProps {
  user: UserType | null;
  currentUser: UserType;
  isOpen: boolean;
  onClose: () => void;
  onToggleFollow: (userId: string) => void;
  onStartDirectChat: (user: UserType) => void;
  totalFollowersCount?: number;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  currentUser,
  isOpen,
  onClose,
  onToggleFollow,
  onStartDirectChat,
  totalFollowersCount = 12
}) => {
  if (!isOpen || !user) return null;

  const isMe = user.id === currentUser.id;
  const isFollowed = (currentUser.followingIds || []).includes(user.id);
  const isSameDistrict = user.districtId === currentUser.districtId;

  const getRoleTitle = (role: UserType['role']) => {
    switch (role) {
      case 'inspector':
        return 'مفتش إدارة ومتابعة بيداغوجية';
      case 'admin':
        return 'مدير النظام والتأطير الولائي';
      case 'director':
        return 'مدير مدرسة ابتدائية';
      default:
        return 'أستاذ التربية البدنية والرياضية';
    }
  };

  const getDistrictTitle = (districtId?: string) => {
    if (districtId === 'dist_setif_7' || districtId === 'dist_alg_1') {
      return 'المقاطعة 07 - عين أزال (سطيف)';
    }
    return districtId || 'المقاطعة التفتيشية المحلية';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 relative">
        {/* Cover Top Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 relative p-4 flex items-start justify-between">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-white text-[11px] font-bold border border-white/20">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>حساب موثق بنظام SPEX</span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Main Body */}
        <div className="px-6 pb-6 relative -mt-12 space-y-5">
          {/* Avatar & Header Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-end gap-4">
              <div className="relative">
                <img
                  src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-xl bg-slate-100"
                />
                <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" title="متصل الآن"></span>
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[11px] font-extrabold border border-blue-200">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                  <span>{getRoleTitle(user.role)}</span>
                </div>

                <h3 className="text-xl font-black text-slate-900 leading-tight">
                  {user.role === 'inspector' ? 'المفتش: ' : 'أ. '} {user.firstName} {user.lastName}
                </h3>

                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="text-blue-600 dir-ltr font-extrabold">@{user.username || 'user'}</span>
                  <span className="text-slate-300">•</span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 text-emerald-400 font-mono text-[10px] font-bold">
                    SPEX ID: {user.spexId || 'SPX-8K31H2'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 font-bold flex items-center gap-1 mt-1">
                  <School className="w-3.5 h-3.5 text-slate-400" />
                  <span>{user.schoolName || 'المؤسسة الابتدائية المعتمدة'}</span>
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            {!isMe && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => onToggleFollow(user.id)}
                  className={`flex-1 sm:flex-none px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                    isFollowed
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
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
                      <span>متابعة</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onStartDirectChat(user);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                >
                  <MessageCircle className="w-4 h-4 text-blue-400" />
                  <span>مراسلة خاصة</span>
                </button>
              </div>
            )}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-center">
            <div className="border-l border-slate-200 last:border-l-0">
              <span className="block text-[10px] text-slate-400 font-bold">المتابعون</span>
              <strong className="text-base font-black text-slate-900">
                {isFollowed ? totalFollowersCount + 1 : totalFollowersCount}
              </strong>
            </div>

            <div className="border-l border-slate-200 last:border-l-0">
              <span className="block text-[10px] text-slate-400 font-bold">يتابع</span>
              <strong className="text-base font-black text-slate-900">
                {(user.followingIds || []).length + 8}
              </strong>
            </div>

            <div>
              <span className="block text-[10px] text-slate-400 font-bold">سنوات الخبرة</span>
              <strong className="text-base font-black text-blue-700">
                {user.yearsExperience || 6} سنوات
              </strong>
            </div>
          </div>

          {/* Account Professional Details Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>البيانات المهنية والتفتيشية:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/70 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold block">المقاطعة التفتيشية:</span>
                <span className="font-extrabold text-slate-900 block">{getDistrictTitle(user.districtId)}</span>
                {isSameDistrict ? (
                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>نفس مقاطعتك التفتيشية</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>مقاطعة خارجية</span>
                  </span>
                )}
              </div>

              <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/70 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold block">البلدية والولاية:</span>
                <span className="font-extrabold text-slate-900 block">
                  {user.municipality || 'عين أزال'} • سطيف
                </span>
                <span className="text-[10px] text-slate-500 font-bold">المديرية: مديرية التربية لولاية سطيف</span>
              </div>

              <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/70 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold block">البريد الإلكتروني المعتمد:</span>
                <span className="font-extrabold text-slate-800 dir-ltr text-right block truncate">
                  {user.email}
                </span>
              </div>

              <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/70 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold block">رقم الهاتف للتواصل المهني:</span>
                <span className="font-extrabold text-slate-800 dir-ltr text-right block">
                  {user.phone || '0660 00 11 22'}
                </span>
              </div>
            </div>
          </div>

          {/* Bio / Pedagogical Statement */}
          <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 p-4 rounded-2xl border border-blue-100 space-y-1 text-xs">
            <span className="text-blue-900 font-black flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>الرسالة البيداغوجية والهدف:</span>
            </span>
            <p className="text-slate-700 leading-relaxed font-medium">
              "الالتزام بتطوير الحصص البدنية بالطور الابتدائي، وتعزيز قيم الروح الرياضية، والتعاون مع زملائي الأساتذة بمقاطعة عين أزال لرفع جودة التعليم المباشر."
            </p>
          </div>

          {/* Bottom Footer Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px] font-bold">
              حالة الحساب: <strong className="text-emerald-700">مُفعل ومعتمد</strong>
            </span>

            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl transition-all cursor-pointer"
            >
              إغلاق البروفايل
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
