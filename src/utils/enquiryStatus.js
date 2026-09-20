export const ENQUIRY_STATUSES = ['new', 'contacted', 'not_connected', 'qualified', 'converted', 'closed'];

export const STATUS_TONE = {
  new: 'info',
  contacted: 'warn',
  not_connected: 'err',
  qualified: 'gold',
  converted: 'ok',
  closed: 'neutral',
};

// Mirrors BUDGET_RANGES in backend/src/models/Enquiry.js.
export const BUDGET_RANGES = ['Up to ₹10 Lakh', '₹10 – 20 Lakh', '₹20 – 30 Lakh', '₹30 – 50 Lakh', 'Above ₹50 Lakh'];

// Stored keys are snake_case; these are what people read.
export const STATUS_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  not_connected: 'Not connected',
  qualified: 'Qualified',
  converted: 'Converted',
  closed: 'Closed',
};

export const statusLabel = (s) => STATUS_LABELS[s] || s;

export const STATUS_OPTIONS = ENQUIRY_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }));
