import { cn } from '../../utils/cn';

// One compact picker for "role, then optionally a person in it".
// Value format and conversions live in utils/assign.js.
export default function AssignSelect({ roles = [], users = [], value, currentLabel, onChange, className, ...rest }) {
  // A lead can point at someone no longer offered (deactivated, moved role) — keep
  // showing them rather than silently displaying "Unassigned".
  const known = new Set(['', ...roles.map((r) => r.key), ...users.map((u) => `${u.role}|${u.id}`)]);

  return (
    <select className={cn('select', className)} value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
      <option value="">Unassigned</option>
      {!known.has(value) && <option value={value}>{currentLabel || 'Current assignee'}</option>}
      {roles.map((role) => (
        <optgroup key={role.key} label={role.name}>
          <option value={role.key}>{role.name} (team)</option>
          {users
            .filter((u) => u.role === role.key)
            .map((u) => (
              <option key={u.id} value={`${role.key}|${u.id}`}>
                {u.name}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}
