// Field types understood by FieldRenderer. Keeping them named here means the
// resource config stays declarative and typo-safe.
export const F = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  NUMBER: 'number',
  SELECT: 'select',
  SWITCH: 'switch',
  TAGS: 'tags',
  PAIRS: 'pairs',
  ICON: 'icon',
  EMOJI: 'emoji',
  GRADIENT: 'gradient',
  IMAGE: 'image',
  DATE: 'date',
};

// Icon names the backend accepts for service/value cards.
export const ICON_OPTIONS = [
  'target', 'search', 'document', 'shield-check', 'briefcase', 'coins',
  'cap', 'shield', 'clock', 'home', 'users', 'phone', 'mail', 'pin',
];

// Ready-made gradients matching the site's destination cards.
export const GRADIENT_PRESETS = [
  { label: 'Navy', value: 'linear-gradient(155deg,#2C4A7C,#0C1E3B)' },
  { label: 'Crimson', value: 'linear-gradient(155deg,#7C2C3B,#2B0E17)' },
  { label: 'Rust', value: 'linear-gradient(155deg,#8A3A2E,#2A0F0A)' },
  { label: 'Teal', value: 'linear-gradient(155deg,#1F6B63,#07211F)' },
  { label: 'Indigo', value: 'linear-gradient(155deg,#3C3F8F,#111233)' },
  { label: 'Steel blue', value: 'linear-gradient(155deg,#1C5C8A,#061A2A)' },
  { label: 'Gold', value: 'linear-gradient(150deg,#B08234,#3B2708)' },
  { label: 'Violet', value: 'linear-gradient(150deg,#5B3E8F,#1A1030)' },
];
