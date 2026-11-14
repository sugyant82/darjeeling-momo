// deno-lint-ignore-file no-explicit-any
// Deletes the signed-in user's account (App Store requirement). Cascades remove
// the profile, carts and orders via FK on delete cascade.
import { adminClient, getUser } from '../_shared/client.ts';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const user = await getUser(req);
    if (!user) return jsonResponse({ error: 'Not authenticated' }, 401);

    const admin = adminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return jsonResponse({ deleted: true });
  } catch (err) {
    console.error('delete-account error', err);
    return jsonResponse({ error: (err as Error).message ?? 'Unexpected error' }, 500);
  }
});
