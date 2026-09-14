/**
 * AssignSelect values are `''` (unassigned), `role` or `role|userId`; these
 * convert to and from the API's { assignedRole, assignedTo }.
 */
export const toAssignValue = (row) => {
  if (!row.assignedRole) return '';
  const person = row.assignedTo?.id || row.assignedTo;
  return person ? `${row.assignedRole}|${person}` : row.assignedRole;
};

export const fromAssignValue = (value) => {
  const [assignedRole = '', assignedTo = null] = value.split('|');
  return { assignedRole, assignedTo: assignedTo || null };
};
