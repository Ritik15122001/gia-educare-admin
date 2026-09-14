export const ENQUIRY_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'closed'];

export const STATUS_TONE = {
  new: 'info',
  contacted: 'warn',
  qualified: 'gold',
  converted: 'ok',
  closed: 'neutral',
};

// Mirrors BUDGET_RANGES in backend/src/models/Enquiry.js.
export const BUDGET_RANGES = ['Up to ₹10 Lakh', '₹10 – 20 Lakh', '₹20 – 30 Lakh', '₹30 – 50 Lakh', 'Above ₹50 Lakh'];

export const STATUS_OPTIONS = ENQUIRY_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}));
