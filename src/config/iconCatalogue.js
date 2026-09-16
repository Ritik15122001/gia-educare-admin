// Grouped for the admin icon picker; the flat list is what forms validate against.
export const ICON_GROUPS = [
  { label: 'Study & education', icons: ['cap', 'school', 'library', 'book-open', 'notebook-pen', 'clipboard-check', 'file-check', 'document', 'pen-tool', 'presentation', 'award', 'languages'] },
  { label: 'Travel & visa', icons: ['plane', 'globe', 'passport', 'luggage', 'map', 'pin', 'compass', 'ticket', 'flag'] },
  { label: 'Money & funding', icons: ['coins', 'banknote', 'piggy-bank', 'wallet', 'credit-card', 'hand-coins', 'percent', 'calculator'] },
  { label: 'People & support', icons: ['users', 'user-check', 'user-plus', 'handshake', 'headphones', 'message-circle', 'phone', 'mail', 'heart', 'life-buoy'] },
  { label: 'Trust & quality', icons: ['shield', 'shield-check', 'badge-check', 'circle-check', 'star', 'thumbs-up', 'lock', 'key'] },
  { label: 'Process & tools', icons: ['target', 'search', 'briefcase', 'building-2', 'clock', 'timer', 'calendar', 'calendar-check', 'home', 'trending-up', 'chart-bar', 'list-checks', 'layers', 'lightbulb', 'rocket', 'sparkles', 'settings', 'send', 'bookmark', 'gift', 'scale', 'stethoscope', 'laptop'] },
];

export const ICON_OPTIONS = ICON_GROUPS.flatMap((g) => g.icons);
