// Fixed owner UUID — this is the account already registered in Supabase Auth.
// All app data is stored under this user_id.
// RLS must be disabled on all tables (run fix-rls.sql in Supabase SQL Editor).
export const FIXED_USER_ID = 'f385fc20-efab-472d-a98a-4548c37c0476'
