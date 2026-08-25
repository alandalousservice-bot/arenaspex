import React from 'react';
import { useLocation } from 'react-router-dom';
import { AdminAccountsPage } from './AdminAccountsPage';
import { AdminAccountDetailPage } from './AdminAccountDetailPage';
import { AdminOverview } from './AdminOverview';
import { AdminPendingUsersPage } from './AdminPendingUsersPage';
import { AdminReportsPage } from './AdminReportsPage';
import { AdminInspectorWorkspacePage } from './AdminInspectorWorkspacePage';
import { AdminServicesPage } from './AdminServicesPage';
import { AdminApprovalsPage } from './AdminApprovalsPage';
import { AdminCurriculumPage } from './AdminCurriculumPage';
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
  if (pathname === '/admin/services') return <AdminServicesPage />;
  if (pathname === '/admin/approvals') return <AdminApprovalsPage />;
  if (pathname === '/admin/inspectors')
    return (
      <AdminInspectorWorkspacePage
        currentUser={props.currentUser}
        onAddUser={props.onAddUser}
        onUpdateUser={props.onUpdateUser}
      />
    );
  if (pathname === '/admin/reports') return <AdminReportsPage />;
  if (pathname === '/admin/curriculum')
    return <AdminCurriculumPage knowledgeItems={props.knowledgeItems} />;
  return <AdminOverview users={props.users} knowledgeItems={props.knowledgeItems} />;
};
