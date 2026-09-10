import { z } from 'zod';
import {
  Globe, GraduationCap, Layers, Sparkles, Quote, Users, Milestone,
  ShieldCheck, BarChart3, ListOrdered, HelpCircle, Table2, Tags,
} from 'lucide-react';
import { F, ICON_OPTIONS, GRADIENT_PRESETS } from './fieldTypes';

const req = (label, min = 2) => z.string().trim().min(min, `${label} is required`);
const opt = (max = 500) => z.string().trim().max(max).optional().or(z.literal(''));

// Shared tail on every content form.
const base = { order: z.coerce.number().int().min(0).optional(), published: z.boolean().optional() };

/**
 * One entry per editable collection. This drives the sidebar, list columns,
 * the create/edit form, validation and the API calls — so a new content type
 * is a single object here plus a model on the backend.
 */
export const RESOURCES = {
  destinations: {
    name: 'destinations',
    label: 'Destinations',
    singular: 'Destination',
    icon: Globe,
    group: 'Content',
    description: 'Countries shown on the home page grid and the destinations page.',
    sortable: true,
    publishable: true,
    searchPlaceholder: 'Search countries…',
    columns: [
      { key: 'flag', label: '', width: 46, type: 'emoji' },
      { key: 'name', label: 'Country', type: 'title', sub: 'tag' },
      { key: 'bg', label: 'Card', type: 'gradient', width: 70 },
      { key: 'showOnHome', label: 'On home', type: 'bool', width: 90 },
      { key: 'facts', label: 'Facts', type: 'count', width: 70 },
    ],
    fields: [
      { name: 'name', label: 'Country name', type: F.TEXT, required: true, placeholder: 'United States' },
      { name: 'flag', label: 'Flag emoji', type: F.EMOJI, placeholder: '🇺🇸' },
      { name: 'tag', label: 'Card badge', type: F.TEXT, placeholder: 'STEM OPT 3 yrs', hint: 'Short label on the home-page card.' },
      { name: 'bg', label: 'Card gradient', type: F.GRADIENT, full: true },
      { name: 'blurb', label: 'Home card blurb', type: F.TEXTAREA, full: true, hint: 'One line shown on the home page card.' },
      { name: 'meta', label: 'Home card chips', type: F.TAGS, full: true, hint: 'e.g. Fall / Spring · $25k–55k / yr · F-1 visa' },
      { name: 'description', label: 'Full description', type: F.TEXTAREA, full: true, hint: 'Shown on the destinations page.' },
      { name: 'facts', label: 'Fact table', type: F.PAIRS, full: true, hint: 'Tuition, intakes, post-study work, tests…' },
      { name: 'tags', label: 'Tags', type: F.TAGS, full: true },
      { name: 'showOnHome', label: 'Feature on the home page', type: F.SWITCH },
    ],
    defaults: {
      name: '', flag: '🌍', tag: '', bg: GRADIENT_PRESETS[0].value, blurb: '', description: '',
      meta: [], facts: [], tags: [], showOnHome: false, published: true,
    },
    schema: z.object({
      name: req('Country name'),
      flag: opt(8),
      tag: opt(60),
      bg: opt(300),
      blurb: opt(400),
      description: opt(1200),
      meta: z.array(z.string()).max(6).optional(),
      facts: z.array(z.object({ label: req('Label', 1), value: req('Value', 1) })).max(10).optional(),
      tags: z.array(z.string()).max(10).optional(),
      showOnHome: z.boolean().optional(),
      ...base,
    }),
  },

  courses: {
    name: 'courses',
    label: 'Courses',
    singular: 'Course',
    icon: GraduationCap,
    group: 'Content',
    description: 'Programs listed in the course catalogue.',
    sortable: true,
    publishable: true,
    searchPlaceholder: 'Search programs…',
    filters: [{ key: 'category', label: 'All fields', optionsFrom: 'course-categories', valueKey: 'key', labelKey: 'label' }],
    columns: [
      { key: 'icon', label: '', width: 46, type: 'emoji' },
      { key: 'title', label: 'Program', type: 'title', sub: 'level' },
      { key: 'category', label: 'Field', type: 'badge', width: 120 },
      { key: 'duration', label: 'Duration', width: 130 },
      { key: 'tuition', label: 'Tuition / yr', width: 130 },
    ],
    fields: [
      { name: 'title', label: 'Program title', type: F.TEXT, required: true, full: true, placeholder: 'MS Data Science & Analytics' },
      { name: 'category', label: 'Field of study', type: F.SELECT, required: true, optionsFrom: 'course-categories', valueKey: 'key', labelKey: 'label' },
      { name: 'icon', label: 'Icon emoji', type: F.EMOJI, placeholder: '📊' },
      { name: 'badge', label: 'Badge', type: F.TEXT, placeholder: 'Highest demand' },
      { name: 'level', label: 'Level', type: F.TEXT, placeholder: 'Masters' },
      { name: 'duration', label: 'Duration', type: F.TEXT, placeholder: '12 – 24 months' },
      { name: 'tuition', label: 'Tuition / year', type: F.TEXT, placeholder: '$18k – $48k' },
      { name: 'topPicks', label: 'Top picks', type: F.TEXT, placeholder: 'USA · Canada · UK' },
      { name: 'note', label: 'Footnote', type: F.TEXT, placeholder: 'GRE optional at most campuses' },
      { name: 'description', label: 'Description', type: F.TEXTAREA, full: true },
    ],
    defaults: {
      title: '', category: '', icon: '🎓', badge: '', level: 'Masters', duration: '',
      tuition: '', topPicks: '', note: '', description: '', published: true,
    },
    schema: z.object({
      title: req('Program title'),
      category: req('Field of study', 1),
      icon: opt(8), badge: opt(40), level: opt(60), duration: opt(60),
      tuition: opt(60), topPicks: opt(120), note: opt(160), description: opt(800),
      ...base,
    }),
  },

  'course-categories': {
    name: 'course-categories',
    label: 'Course fields',
    singular: 'Course field',
    icon: Tags,
    group: 'Content',
    description: 'Filter tabs above the course catalogue.',
    sortable: true,
    publishable: true,
    columns: [
      { key: 'label', label: 'Label', type: 'title' },
      { key: 'key', label: 'Key', type: 'mono', width: 140 },
    ],
    fields: [
      { name: 'label', label: 'Label', type: F.TEXT, required: true, placeholder: 'Data & AI' },
      { name: 'key', label: 'Key', type: F.TEXT, required: true, placeholder: 'data', hint: 'Lowercase, no spaces. Used by the course records.' },
    ],
    defaults: { label: '', key: '', published: true },
    schema: z.object({
      label: req('Label'),
      key: z.string().trim().min(1, 'Key is required').regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and dashes only'),
      ...base,
    }),
  },

  services: {
    name: 'services',
    label: 'Services',
    singular: 'Service',
    icon: Sparkles,
    group: 'Content',
    description: 'The "what we do" cards on the home page.',
    sortable: true,
    publishable: true,
    columns: [
      { key: 'icon', label: 'Icon', type: 'icon', width: 70 },
      { key: 'title', label: 'Service', type: 'title' },
      { key: 'description', label: 'Description', type: 'truncate' },
    ],
    fields: [
      { name: 'title', label: 'Title', type: F.TEXT, required: true, placeholder: 'Profile evaluation' },
      { name: 'icon', label: 'Icon', type: F.ICON, options: ICON_OPTIONS, full: true },
      { name: 'description', label: 'Description', type: F.TEXTAREA, full: true, required: true },
    ],
    defaults: { title: '', icon: 'target', description: '', published: true },
    schema: z.object({ title: req('Title'), icon: z.enum(ICON_OPTIONS).optional(), description: req('Description', 10).max(600), ...base }),
  },

  testimonials: {
    name: 'testimonials',
    label: 'Testimonials',
    singular: 'Testimonial',
    icon: Quote,
    group: 'Content',
    description: 'Student quotes on the home page.',
    sortable: true,
    publishable: true,
    searchPlaceholder: 'Search students…',
    columns: [
      { key: 'initials', label: '', type: 'avatar', width: 52 },
      { key: 'name', label: 'Student', type: 'title', sub: 'program' },
      { key: 'quote', label: 'Quote', type: 'truncate' },
      { key: 'rating', label: 'Rating', type: 'stars', width: 100 },
    ],
    fields: [
      { name: 'name', label: 'Student name', type: F.TEXT, required: true, placeholder: 'Aditi R.' },
      { name: 'initials', label: 'Initials', type: F.TEXT, placeholder: 'AR', hint: 'Left blank, we derive it from the name.' },
      { name: 'program', label: 'Program & city', type: F.TEXT, placeholder: 'MSc Data Analytics · Toronto' },
      { name: 'rating', label: 'Rating', type: F.SELECT, options: [1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n} star${n > 1 ? 's' : ''}` })) },
      { name: 'quote', label: 'Quote', type: F.TEXTAREA, full: true, required: true },
    ],
    defaults: { name: '', initials: '', program: '', rating: 5, quote: '', published: true },
    schema: z.object({
      name: req('Student name'), initials: opt(3), program: opt(120),
      rating: z.coerce.number().int().min(1).max(5).optional(),
      quote: req('Quote', 10).max(800), ...base,
    }),
  },

  team: {
    name: 'team',
    label: 'Team',
    singular: 'Team member',
    icon: Users,
    group: 'Content',
    description: 'Counsellors shown on the about page.',
    sortable: true,
    publishable: true,
    columns: [
      { key: 'photoUrl', label: '', type: 'avatarImage', width: 52 },
      { key: 'name', label: 'Name', type: 'title', sub: 'role' },
      { key: 'bio', label: 'Bio', type: 'truncate' },
    ],
    fields: [
      { name: 'name', label: 'Full name', type: F.TEXT, required: true, placeholder: 'Rhea Malhotra' },
      { name: 'role', label: 'Role', type: F.TEXT, placeholder: 'Founder · US & Canada' },
      { name: 'initials', label: 'Initials', type: F.TEXT, placeholder: 'RM', hint: 'Used when no photo is set.' },
      { name: 'linkedin', label: 'LinkedIn URL', type: F.TEXT, placeholder: 'https://linkedin.com/in/…' },
      { name: 'photoUrl', label: 'Photo', type: F.IMAGE, full: true },
      { name: 'bio', label: 'Short bio', type: F.TEXTAREA, full: true },
    ],
    defaults: { name: '', role: '', initials: '', linkedin: '', photoUrl: '', bio: '', published: true },
    schema: z.object({
      name: req('Full name'), role: opt(120), initials: opt(3),
      linkedin: opt(300), photoUrl: opt(500), bio: opt(600), ...base,
    }),
  },

  values: {
    name: 'values',
    label: 'Values',
    singular: 'Value',
    icon: ShieldCheck,
    group: 'Content',
    description: 'The "rules we don\'t bend" cards on the about page.',
    sortable: true,
    publishable: true,
    columns: [
      { key: 'icon', label: 'Icon', type: 'icon', width: 70 },
      { key: 'title', label: 'Value', type: 'title' },
      { key: 'description', label: 'Description', type: 'truncate' },
    ],
    fields: [
      { name: 'title', label: 'Title', type: F.TEXT, required: true, placeholder: 'Honest odds' },
      { name: 'icon', label: 'Icon', type: F.ICON, options: ICON_OPTIONS, full: true },
      { name: 'description', label: 'Description', type: F.TEXTAREA, full: true, required: true },
    ],
    defaults: { title: '', icon: 'shield', description: '', published: true },
    schema: z.object({ title: req('Title'), icon: z.enum(ICON_OPTIONS).optional(), description: req('Description', 10).max(500), ...base }),
  },

  milestones: {
    name: 'milestones',
    label: 'Milestones',
    singular: 'Milestone',
    icon: Milestone,
    group: 'Content',
    description: 'The company timeline on the about page.',
    sortable: true,
    publishable: true,
    columns: [
      { key: 'year', label: 'Year', type: 'badge', width: 90 },
      { key: 'title', label: 'Milestone', type: 'title' },
      { key: 'description', label: 'Description', type: 'truncate' },
    ],
    fields: [
      { name: 'year', label: 'Year', type: F.TEXT, required: true, placeholder: '2016' },
      { name: 'title', label: 'Title', type: F.TEXT, required: true, placeholder: 'GIA Educare opens in Gurugram' },
      { name: 'description', label: 'Description', type: F.TEXTAREA, full: true },
    ],
    defaults: { year: '', title: '', description: '', published: true },
    schema: z.object({ year: req('Year', 4), title: req('Title'), description: opt(500), ...base }),
  },

  stats: {
    name: 'stats',
    label: 'Stats',
    singular: 'Stat',
    icon: BarChart3,
    group: 'Content',
    description: 'The counter band under the hero. The first three also feed the hero trust row.',
    sortable: true,
    publishable: true,
    columns: [
      { key: 'value', label: 'Value', type: 'stat', width: 120 },
      { key: 'label', label: 'Label', type: 'title' },
    ],
    fields: [
      { name: 'value', label: 'Number', type: F.NUMBER, required: true, placeholder: '12000' },
      { name: 'suffix', label: 'Suffix', type: F.TEXT, placeholder: '+', hint: 'Shown in gold after the number.' },
      { name: 'label', label: 'Label', type: F.TEXT, required: true, full: true, placeholder: 'Students counselled' },
    ],
    defaults: { value: 0, suffix: '+', label: '', published: true },
    schema: z.object({ value: z.coerce.number().min(0, 'Enter a number'), suffix: opt(4), label: req('Label'), ...base }),
  },

  'process-steps': {
    name: 'process-steps',
    label: 'Process steps',
    singular: 'Process step',
    icon: ListOrdered,
    group: 'Content',
    description: 'The numbered "how it works" timeline.',
    sortable: true,
    publishable: true,
    columns: [
      { key: 'num', label: '#', type: 'badge', width: 60 },
      { key: 'title', label: 'Step', type: 'title' },
      { key: 'description', label: 'Description', type: 'truncate' },
    ],
    fields: [
      { name: 'num', label: 'Number', type: F.TEXT, required: true, placeholder: '01' },
      { name: 'title', label: 'Title', type: F.TEXT, required: true, placeholder: 'Free counselling' },
      { name: 'description', label: 'Description', type: F.TEXTAREA, full: true },
    ],
    defaults: { num: '', title: '', description: '', published: true },
    schema: z.object({ num: req('Number', 1).max(4), title: req('Title'), description: opt(400), ...base }),
  },

  'study-levels': {
    name: 'study-levels',
    label: 'Study levels',
    singular: 'Study level',
    icon: Layers,
    group: 'Content',
    description: 'Bachelors / Masters / MBA cards on the courses page.',
    sortable: true,
    publishable: true,
    columns: [
      { key: 'num', label: '#', type: 'badge', width: 60 },
      { key: 'title', label: 'Level', type: 'title' },
      { key: 'description', label: 'Description', type: 'truncate' },
    ],
    fields: [
      { name: 'num', label: 'Number', type: F.TEXT, required: true, placeholder: '01' },
      { name: 'title', label: 'Title', type: F.TEXT, required: true, placeholder: 'Bachelors' },
      { name: 'description', label: 'Description', type: F.TEXTAREA, full: true },
    ],
    defaults: { num: '', title: '', description: '', published: true },
    schema: z.object({ num: req('Number', 1).max(4), title: req('Title'), description: opt(500), ...base }),
  },

  faqs: {
    name: 'faqs',
    label: 'FAQs',
    singular: 'FAQ',
    icon: HelpCircle,
    group: 'Content',
    description: 'Accordion questions on the contact page.',
    sortable: true,
    publishable: true,
    searchPlaceholder: 'Search questions…',
    columns: [
      { key: 'question', label: 'Question', type: 'title' },
      { key: 'answer', label: 'Answer', type: 'truncate' },
    ],
    fields: [
      { name: 'question', label: 'Question', type: F.TEXT, required: true, full: true },
      { name: 'answer', label: 'Answer', type: F.TEXTAREA, required: true, full: true, rows: 6 },
    ],
    defaults: { question: '', answer: '', published: true },
    schema: z.object({ question: req('Question', 5).max(300), answer: req('Answer', 10).max(2000), ...base }),
  },

  'comparison-rows': {
    name: 'comparison-rows',
    label: 'Comparison table',
    singular: 'Comparison row',
    icon: Table2,
    group: 'Content',
    description: 'The side-by-side country table on the destinations page.',
    sortable: true,
    publishable: true,
    columns: [
      { key: 'country', label: 'Country', type: 'title' },
      { key: 'length', label: 'Length', width: 130 },
      { key: 'tuition', label: 'Tuition', width: 130 },
      { key: 'work', label: 'Post-study work', width: 150 },
    ],
    fields: [
      { name: 'country', label: 'Country', type: F.TEXT, required: true, placeholder: '🇺🇸 USA' },
      { name: 'length', label: 'Course length', type: F.TEXT, placeholder: '18 – 24 months' },
      { name: 'tuition', label: 'Tuition / yr', type: F.TEXT, placeholder: '$25k – $55k' },
      { name: 'living', label: 'Living cost / yr', type: F.TEXT, placeholder: '$12k – $20k' },
      { name: 'work', label: 'Post-study work', type: F.TEXT, placeholder: '1 yr (3 yrs STEM)' },
      { name: 'best', label: 'Best for', type: F.TEXT, full: true, placeholder: 'Research & specialisation depth' },
    ],
    defaults: { country: '', length: '', tuition: '', living: '', work: '', best: '', published: true },
    schema: z.object({
      country: req('Country'), length: opt(60), tuition: opt(60),
      living: opt(60), work: opt(60), best: opt(120), ...base,
    }),
  },
};

export const RESOURCE_LIST = Object.values(RESOURCES);
export const getResourceConfig = (name) => RESOURCES[name];
