import {
  Check, GraduationCap, Search, FileText, ShieldCheck, Briefcase, Coins,
  Shield, Clock, Home, Users, Phone, Mail, MapPin, Target, HelpCircle,
} from 'lucide-react';

// Mirrors the website's icon map so the admin preview matches the live site.
const ICONS = {
  check: Check,
  cap: GraduationCap,
  search: Search,
  document: FileText,
  'shield-check': ShieldCheck,
  briefcase: Briefcase,
  coins: Coins,
  shield: Shield,
  clock: Clock,
  home: Home,
  users: Users,
  phone: Phone,
  mail: Mail,
  pin: MapPin,
  target: Target,
};

export default function Icon({ name, size = 18, ...rest }) {
  const Cmp = ICONS[name] || HelpCircle;
  return <Cmp size={size} {...rest} />;
}
