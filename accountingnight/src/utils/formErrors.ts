export function clearFormErrors(
  errors: Record<string, string>,
  ...keys: string[]
): Record<string, string> {
  const next = { ...errors };

  for (const key of [...keys, 'form']) delete next[key];
  return next;
}
