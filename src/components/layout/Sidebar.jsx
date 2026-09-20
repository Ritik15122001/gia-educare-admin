import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Inbox, Settings, Users2, Image, FileText, LogOut, ExternalLink, ShieldCheck, Mail, Wallet, Bell,
} from 'lucide-react';
import { RESOURCE_LIST } from '../../config/resources';
import { useAuthStore, can, canModule } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import IconButton from '../ui/IconButton';
import { cn } from '../../utils/cn';
import { SITE_URL } from '../../config/site';

export default function Sidebar({ enquiryCount, unreadCount = 0, onLogout }) {
  const user = useAuthStore((s) => s.user);
  const closeSidebar = useUiStore((s) => s.closeSidebar);
  const isSuperAdmin = user?.role === 'super_admin';


  // Only the collections this role may open.
  const visibleResources = RESOURCE_LIST.filter((r) => canModule(user, r.name));

  const item = (to, label, Icon, extra) => (
    <NavLink key={to} to={to} end={to === '/' || to === '/settings'} className={({ isActive }) => cn('nav-item', isActive && 'active')} onClick={closeSidebar}>
      <Icon />
      <span>{label}</span>
      {extra}
    </NavLink>
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <span className="sidebar-logo">
          <img src="/logo.jpg" alt="GIA Educare" />
        </span>
        <span className="sidebar-title">
          GIA Educare
          <small>CRM</small>
        </span>
      </div>

      <nav className="sidebar-nav">
        {item('/', 'Dashboard', LayoutDashboard)}
        {can(user, 'leads.view') && item(
          '/enquiries',
          user?.leadScope === 'assigned' ? 'My leads' : 'Leads',
          Inbox,
          enquiryCount > 0 ? <span className="count">{enquiryCount}</span> : null,
        )}

        {item('/notifications', 'Notifications', Bell, unreadCount > 0 ? <span className="count">{unreadCount}</span> : null)}
        {canModule(user, 'finance') && item('/finance', 'Expenses & P&L', Wallet)}

        {visibleResources.length > 0 && (
          <>
            <div className="nav-group-label">Content</div>
            {visibleResources.map((r) => item(`/content/${r.name}`, r.label, r.icon))}
          </>
        )}

        {canModule(user, 'sections') || canModule(user, 'media') || canModule(user, 'settings') || isSuperAdmin ? (
          <div className="nav-group-label">Site</div>
        ) : null}
        {canModule(user, 'sections') && item('/sections', 'Section copy', FileText)}
        {canModule(user, 'media') && item('/media', 'Media', Image)}
        {canModule(user, 'settings') && item('/settings', 'Settings', Settings)}
        {canModule(user, 'settings') && item('/settings/email', 'Email & SMTP', Mail)}
        {isSuperAdmin && item('/users', 'Team accounts', Users2)}
        {isSuperAdmin && item('/roles', 'Roles & permissions', ShieldCheck)}

        <div className="nav-group-label">Shortcuts</div>
        <a className="nav-item" href={SITE_URL} target="_blank" rel="noreferrer noopener">
          <ExternalLink />
          <span>View website</span>
        </a>
      </nav>

      <div className="sidebar-foot">
        <div className="sidebar-user">
          <span className="avatar">
            {(user?.name || '?')
              .split(' ')
              .slice(0, 2)
              .map((w) => w[0])
              .join('')
              .toUpperCase()}
          </span>
          <div style={{ minWidth: 0 }}>
            <b>{user?.name}</b>
            <small>{user?.roleName || user?.role?.replace('_', ' ')}</small>
          </div>
          <IconButton
            icon={LogOut}
            label="Sign out"
            onClick={onLogout}
            style={{ marginLeft: 'auto', borderColor: 'rgba(255,255,255,.16)', color: '#fff' }}
          />
        </div>
      </div>
    </aside>
  );
}
