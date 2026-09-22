// B2C = a student enquiring for themselves; B2B = a partner, agent, school or
// company. Mirrors LEAD_TYPES in backend/src/models/Enquiry.js — keep both.
export const LEAD_TYPES = [
  { value: 'b2c', label: 'B2C', hint: 'A student enquiring for themselves' },
  { value: 'b2b', label: 'B2B', hint: 'A partner, agent, school or company' },
];

export const LEAD_TYPE_LABELS = { b2c: 'B2C', b2b: 'B2B' };

// Leads created before the field existed have no leadType; they are B2C.
export const leadTypeOf = (row) => (row?.leadType === 'b2b' ? 'b2b' : 'b2c');
export const leadTypeLabel = (row) => LEAD_TYPE_LABELS[leadTypeOf(row)];
export const leadTypeTone = (row) => (leadTypeOf(row) === 'b2b' ? 'info' : 'neutral');
