import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Inbox, Settings, Users2, Image, FileText, LogOut, ExternalLink,
} from 'lucide-react';
import { RESOURCE_LIST } from '../../config/resources';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import IconButton from '../ui/IconButton';
import { cn } from '../../utils/cn';

const SITE_URL = 'http://localhost:5183';

export default function Sidebar({ enquiryCount, onLogout }) {
  const user = useAuthStore((s) => s.user);
  const closeSidebar = useUiStore((s) => s.closeSidebar);
  const isSuperAdmin = user?.role === 'super_admin';
  const canManageSettings = ['super_admin', 'admin'].includes(user?.role);

  const item = (to, label, Icon, extra) => (
    <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => cn('nav-item', isActive && 'active')} onClick={closeSidebar}>
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
          <small>Admin</small>
        </span>
      </div>

      <nav className="sidebar-nav">
        {item('/', 'Dashboard', LayoutDashboard)}
        {item(
          '/enquiries',
          'Enquiries',
          Inbox,
          enquiryCount > 0 ? <span className="count">{enquiryCount}</span> : null,
        )}

        <div className="nav-group-label">Content</div>
        {RESOURCE_LIST.map((r) => item(`/content/${r.name}`, r.label, r.icon))}

        <div className="nav-group-label">Site</div>
        {item('/sections', 'Section copy', FileText)}
        {item('/media', 'Media', Image)}
        {canManageSettings && item('/settings', 'Settings', Settings)}
        {isSuperAdmin && item('/users', 'Team accounts', Users2)}

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
            <small>{user?.role?.replace('_', ' ')}</small>
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
