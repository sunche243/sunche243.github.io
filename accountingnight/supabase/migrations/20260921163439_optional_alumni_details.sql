-- Make the two standard alumni profile fields optional without changing
-- submissions, RPCs, RLS policies, or any other dynamic form fields.

update public.form_fields
set required = false
where required
  and regexp_replace(lower(label), '[[:space:]()（）·_/-]', '', 'g') in (
    '입학년도학번',
    '학번입학년도',
    '입학년도',
    '학번',
    '현재소속및직함',
    '소속및직함',
    '현재소속직함',
    '소속직함',
    '현재소속및직책',
    '소속및직책',
    '현재소속',
    '소속'
  );
