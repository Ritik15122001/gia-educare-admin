export const ENQUIRY_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'closed'];

export const STATUS_TONE = {
  new: 'info',
  contacted: 'warn',
  qualified: 'gold',
  converted: 'ok',
  closed: 'neutral',
};

export const STATUS_OPTIONS = ENQUIRY_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}));
