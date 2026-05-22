// Supabase project: food-picker (xwqgrpfcuohpstqinkxb), region ap-south-1.
// Schema isolated to `commute`; publishable key is safe to ship in client code —
// access is gated by RLS (deny-all to anon) + RPC bcrypt secret comparison.
export const SUPABASE_URL = 'https://xwqgrpfcuohpstqinkxb.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_AreTk-QXvZCFUM5J4oP46w_TXvCc-Y0';

// VAPID public key for Web Push. Public half of the keypair — safe to ship.
// Private key lives only in the send-reminders Edge Function env.
export const VAPID_PUBLIC_KEY = 'BEOVEJ4V0Tm-OuC906pu3ZA9EwQ6V1xpkj72L-jxqmUrEad1vYCA2wzBX-V_LTC_CgoygtztE3H0gNHio7WEGuc';
