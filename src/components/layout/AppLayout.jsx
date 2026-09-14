import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Menu, UserCircle2 } from 'lucide-react';
import Sidebar from './Sidebar';
import IconButton from '../ui/IconButton';
import Toasts from '../ui/Toasts';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useUiStore, toast } from '../../store/uiStore';
import { useAuthStore, useCan } from '../../store/authStore';
import { authApi, enquiryApi } from '../../api';
import { getResourceConfig } from '../../config/resources';

// Human label for the current route, shown in the top bar.
function useRouteLabel() {
  const { pathname } = useLocation();
  const [, first, second] = pathname.split('/');

  if (!first) return { group: null, label: 'Dashboard' };
  if (first === 'content') return { group: 'Content', label: getResourceConfig(second)?.label || second };
  if (first === 'enquiries') return { group: 'Leads', label: second ? 'Enquiry detail' : 'Enquiries' };
  if (first === 'settings' && second === 'email') return { group: 'Site', label: 'Email & SMTP' };

  const LABELS = { sections: 'Section copy', media: 'Media', settings: 'Settings', users: 'Team accounts', roles: 'Roles & permissions', profile: 'Your profile' };
  return { group: 'Site', label: LABELS[first] || first };
}

export default function AppLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const closeSidebar = useUiStore((s) => s.closeSidebar);
  const clearSession = useAuthStore((s) => s.clearSession);
  const route = useRouteLabel();
  const canViewLeads = useCan('leads.view');

  // Badge for unactioned leads.
  const { data: newEnquiries } = useQuery({
    queryKey: ['enquiries', 'new-count'],
    queryFn: () => enquiryApi.list({ status: 'new', limit: 1 }),
    refetchInterval: 60_000,
    enabled: canViewLeads,
  });

  useEffect(() => {
    document.body.classList.toggle('sidebar-open', sidebarOpen);
  }, [sidebarOpen]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      queryClient.clear();
      clearSession();
      toast('Signed out');
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="app">
      <Sidebar enquiryCount={newEnquiries?.meta?.total || 0} onLogout={handleLogout} />
      <div className="sidebar-scrim" onClick={closeSidebar} />

      <div className="main">
        <header className="topbar">
          <IconButton icon={Menu} label="Open navigation" className="burger-btn" onClick={toggleSidebar} />
          <div className="topbar-context" style={{ minWidth: 0 }}>
            {route.group && <span>{route.group} / </span>}
            {route.label}
          </div>
          <div className="topbar-actions">
            <IconButton icon={UserCircle2} label="Your profile" onClick={() => navigate('/profile')} />
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>

      <Toasts />
      <ConfirmDialog />
    </div>
  );
}
