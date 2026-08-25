import React from 'react';
import { useLocation } from 'react-router-dom';
import { AdminDashboard } from './AdminDashboard';
import { AdminAccountsPage } from './AdminAccountsPage';
import { AdminAccountDetailPage } from './AdminAccountDetailPage';
import { AdminOverview } from './AdminOverview';
import { AdminPendingUsersPage } from './AdminPendingUsersPage';
import { AdminReportsPage } from './AdminReportsPage';
import { AdminInspectorWorkspacePage } from './AdminInspectorWorkspacePage';
import { KnowledgeEngineView } from '../knowledge/KnowledgeEngineView';
import { AISetting, AILog, CommunityResource, KnowledgeItem, User } from '../../types/spex';

interface AdminWorkspacePageProps {
  currentUser: User;
  aiSettings: AISetting;
  onUpdateAISettings: (settings: AISetting) => void;
  aiLogs: AILog[];
  knowledgeItems: KnowledgeItem[];
  onApproveKnowledgeItem: (id: string) => void;
  onRejectKnowledgeItem?: (id: string, reason: string) => void;
  onAddKnowledgeItem: (item: Partial<KnowledgeItem>) => void;
  onUpdateKnowledgeItem?: (id: string, patch: Partial<KnowledgeItem>) => void;
  onSubmitKnowledgeItem?: (id: string) => void;
  onDeleteKnowledgeItem?: (id: string) => void;
  users: User[];
  onAddUser: (user: Partial<User>) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  communityResources?: CommunityResource[];
}

export const AdminWorkspacePage: React.FC<AdminWorkspacePageProps> = (props) => {
  const { pathname } = useLocation();
  if (/^\/admin\/accounts\/[^/]+$/.test(pathname))
    return <AdminAccountDetailPage currentUser={props.currentUser} />;
  if (pathname === '/admin/accounts') return <AdminAccountsPage />;
  if (pathname === '/admin/pending-users') return <AdminPendingUsersPage />;
  if (pathname === '/admin/inspectors')
    return (
      <AdminInspectorWorkspacePage
        currentUser={props.currentUser}
        onAddUser={props.onAddUser}
        onUpdateUser={props.onUpdateUser}
      />
    );
  if (pathname === '/admin/reports') return <AdminReportsPage fallbackUsers={props.users} />;
  if (pathname === '/admin/curriculum')
    return (
      <KnowledgeEngineView
        knowledgeItems={props.knowledgeItems}
        onAddKnowledgeItem={props.onAddKnowledgeItem}
        onUpdateKnowledgeItem={props.onUpdateKnowledgeItem}
        onSubmitKnowledgeItem={props.onSubmitKnowledgeItem}
        onDeleteKnowledgeItem={props.onDeleteKnowledgeItem}
        onApproveKnowledgeItem={props.onApproveKnowledgeItem}
        onRejectKnowledgeItem={props.onRejectKnowledgeItem}
        currentUser={props.currentUser}
        communityResources={props.communityResources}
      />
    );
  const initialAdminTab =
    pathname === '/admin/services'
      ? 'account_api_keys'
      : pathname === '/admin/approvals'
        ? 'audit_logs'
        : 'users';
  if (pathname === '/admin')
    return <AdminOverview users={props.users} knowledgeItems={props.knowledgeItems} />;
  return (
    <AdminDashboard
      {...props}
      isPlatformOwner={Boolean(props.currentUser.isPlatformOwner)}
      initialAdminTab={initialAdminTab}
    />
  );
};
