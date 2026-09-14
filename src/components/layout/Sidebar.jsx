import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Inbox, Settings, Users2, Image, FileText, LogOut, ExternalLink, ShieldCheck, Mail,
} from 'lucide-react';
import { RESOURCE_LIST } from '../../config/resources';
import { useAuthStore, can } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import IconButton from '../ui/IconButton';
import { cn } from '../../utils/cn';
import { SITE_URL } from '../../config/site';

export default function Sidebar({ enquiryCount, onLogout }) {
  const user = useAuthStore((s) => s.user);
  const closeSidebar = useUiStore((s) => s.closeSidebar);
  const isSuperAdmin = user?.role === 'super_admin';


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
          <small>Admin</small>
        </span>
      </div>

      <nav className="sidebar-nav">
        {item('/', 'Dashboard', LayoutDashboard)}
        {can(user, 'leads.view') && item(
          '/enquiries',
          user?.leadScope === 'assigned' ? 'My enquiries' : 'Enquiries',
          Inbox,
          enquiryCount > 0 ? <span className="count">{enquiryCount}</span> : null,
        )}

        {can(user, 'content.manage') && (
          <>
            <div className="nav-group-label">Content</div>
            {RESOURCE_LIST.map((r) => item(`/content/${r.name}`, r.label, r.icon))}
          </>
        )}

        {can(user, 'sections.edit', 'media.upload', 'settings.manage') || isSuperAdmin ? (
          <div className="nav-group-label">Site</div>
        ) : null}
        {can(user, 'sections.edit') && item('/sections', 'Section copy', FileText)}
        {can(user, 'media.upload') && item('/media', 'Media', Image)}
        {can(user, 'settings.manage') && item('/settings', 'Settings', Settings)}
        {can(user, 'settings.manage') && item('/settings/email', 'Email & SMTP', Mail)}
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
