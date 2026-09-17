import * as XLSX from 'xlsx';

// The columns staff see in the template, mapped to the API's field names.
// Header matching is case- and space-insensitive so a hand-edited file still
// lines up.
export const LEAD_COLUMNS = [
  { header: 'Name', field: 'name', required: true, example: 'Aarav Sharma' },
  { header: 'Email', field: 'email', required: true, example: 'aarav.sharma@example.com' },
  { header: 'Phone', field: 'phone', required: true, example: '9876543210' },
  { header: 'Country Code', field: 'code', example: '+91' },
  { header: 'Destination', field: 'destination', example: 'Canada' },
  { header: 'Study Level', field: 'level', example: 'Masters' },
  { header: 'Intake', field: 'intake', example: 'Sep 2027' },
  { header: 'Test Status', field: 'test', example: 'IELTS done' },
  { header: 'Qualification', field: 'qual', example: 'Bachelors — completed' },
  { header: 'Budget', field: 'budget', example: '₹20 – 30 Lakh' },
  { header: 'Source', field: 'source', example: 'Education fair' },
  { header: 'Referred By', field: 'referral', example: 'Rhea Malhotra' },
  { header: 'Notes', field: 'message', example: 'Wants a scholarship, backlogs: 2' },
];

export const BUDGET_OPTIONS = ['Up to ₹10 Lakh', '₹10 – 20 Lakh', '₹20 – 30 Lakh', '₹30 – 50 Lakh', 'Above ₹50 Lakh'];
export const LEVEL_OPTIONS = ['Masters', 'Bachelors', 'MBA', 'PhD', 'Diploma / Pathway'];
export const INTAKE_OPTIONS = ['Jan 2027', 'May 2027', 'Sep 2027', 'Jan 2028', 'Flexible'];
export const TEST_OPTIONS = ['Not taken yet', 'Preparing now', 'IELTS done', 'TOEFL done', 'PTE done', 'GRE / GMAT done'];
export const QUAL_OPTIONS = ['Class 12', 'Bachelors — final year', 'Bachelors — completed', 'Masters', 'Working professional'];

const normalise = (s) => String(s || '').toLowerCase().replace(/[\s_-]/g, '');

/** Builds and downloads a sample .xlsx with the right headers and two example rows. */
export function downloadTemplate() {
  const headers = LEAD_COLUMNS.map((c) => (c.required ? `${c.header}*` : c.header));

  const sample = [
    LEAD_COLUMNS.map((c) => c.example),
    ['Priya Nair', 'priya.nair@example.com', '9123456780', '+91', 'United Kingdom', 'Masters', 'Jan 2027', 'Preparing now', 'Bachelors — final year', '₹10 – 20 Lakh', 'Walk-in', '', ''],
  ];

  const sheet = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  sheet['!cols'] = LEAD_COLUMNS.map((c) => ({ wch: Math.max(14, c.header.length + 4) }));

  // A second sheet documenting the accepted values, so nobody has to guess.
  const guide = [
    ['Column', 'Required', 'Accepted values / notes'],
    ['Name', 'Yes', 'Full name, at least 2 characters'],
    ['Email', 'Yes', 'Must be a valid email. Used to detect duplicates.'],
    ['Phone', 'Yes', '8–15 digits. Spaces and dashes are fine. Also used for duplicates.'],
    ['Country Code', 'No', 'Defaults to +91'],
    ['Destination', 'No', 'Any country name, e.g. Canada'],
    ['Study Level', 'No', LEVEL_OPTIONS.join(' / ')],
    ['Intake', 'No', INTAKE_OPTIONS.join(' / ')],
    ['Test Status', 'No', TEST_OPTIONS.join(' / ')],
    ['Qualification', 'No', QUAL_OPTIONS.join(' / ')],
    ['Budget', 'No', BUDGET_OPTIONS.join(' / ')],
    ['Source', 'No', 'Where the lead came from, e.g. Education fair, Walk-in, Referral'],
    ['Referred By', 'No', 'Person or partner who referred them'],
    ['Notes', 'No', 'Anything else worth recording'],
    [],
    ['Tip', '', 'Delete the two example rows before importing your own data.'],
  ];
  const guideSheet = XLSX.utils.aoa_to_sheet(guide);
  guideSheet['!cols'] = [{ wch: 16 }, { wch: 10 }, { wch: 70 }];

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Enquiries');
  XLSX.utils.book_append_sheet(book, guideSheet, 'How to fill');
  XLSX.writeFile(book, 'gia-enquiries-template.xlsx');
}

/** Reads an .xlsx/.csv File and maps its rows onto our field names. */
export async function parseLeadFile(file) {
  const buffer = await file.arrayBuffer();
  const book = XLSX.read(buffer, { type: 'array' });
  const sheet = book.Sheets[book.SheetNames[0]];
  if (!sheet) return { rows: [], unknownHeaders: [] };

  const raw = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

  // Map incoming headers ("Email*", "e-mail") onto field names.
  const lookup = new Map();
  LEAD_COLUMNS.forEach((c) => {
    lookup.set(normalise(c.header), c.field);
    lookup.set(normalise(c.field), c.field);
  });
  lookup.set('mobile', 'phone');
  lookup.set('phonenumber', 'phone');
  lookup.set('contact', 'phone');
  lookup.set('country', 'destination');
  lookup.set('message', 'message');
  lookup.set('remarks', 'message');

  const unknownHeaders = new Set();

  const rows = raw.map((row) => {
    const mapped = {};
    Object.entries(row).forEach(([header, value]) => {
      const key = lookup.get(normalise(header).replace(/\*$/, ''));
      if (key) mapped[key] = typeof value === 'string' ? value.trim() : value;
      else if (String(header).trim()) unknownHeaders.add(header);
    });
    return mapped;
  });

  // Drop rows where every cell is blank, and the template's own examples.
  const meaningful = rows.filter(
    (r) => (r.name || r.email || r.phone) && r.email !== 'aarav.sharma@example.com' && r.email !== 'priya.nair@example.com',
  );

  return { rows: meaningful, unknownHeaders: [...unknownHeaders] };
}

/** Same rules as the API, run locally so problems show before uploading. */
export function validateRow(row) {
  const errors = [];
  if (!row.name || String(row.name).trim().length < 2) errors.push('Name is missing');
  if (!row.email || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(row.email).trim())) errors.push('Email is invalid');
  const digits = String(row.phone || '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) errors.push('Phone is invalid');
  if (row.budget && !BUDGET_OPTIONS.includes(row.budget)) errors.push('Budget is not one of the allowed ranges');
  return errors;
}
