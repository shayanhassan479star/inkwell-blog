/**
 * Creates (or promotes) the FIRST administrator without hard-coded credentials.
 *
 *   npm run create-admin -- --email you@example.com --name "Your Name"
 *
 * The password is read from the ADMIN_PASSWORD environment variable if set, otherwise typed at a hidden prompt.
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (loaded from .env.local by the npm script).
 * Run it from your own machine; never put the service-role key in a public place.
 */
import { createClient } from "@supabase/supabase-js";
import readline from "node:readline";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyRl = rl as any;
    const original = anyRl._writeToOutput?.bind(rl);
    if (hidden && original) anyRl._writeToOutput = (text: string) => { if (text.includes(question)) original(text); };
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const PLACEHOLDER = /(YOUR[-_]|REPLACE[-_]WITH|your-project-ref)/i;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || PLACEHOLDER.test(url) || PLACEHOLDER.test(key)) {
    fail("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first (see README → Configure Supabase).");
  }

  const email = (arg("email") ?? process.env.ADMIN_EMAIL ?? (await ask("Admin email: "))).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("That doesn't look like a valid email address.");
  const name = (arg("name") ?? process.env.ADMIN_NAME ?? (await ask("Display name: "))) || "Site Owner";

  const db = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });

  // Is there already an auth user with this email?
  let userId: string | null = null;
  for (let page = 1; page <= 20 && !userId; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(`Could not reach Supabase Auth: ${error.message}`);
    const found = data.users.find((u) => u.email?.toLowerCase() === email);
    if (found) userId = found.id;
    if (data.users.length < 200) break;
  }

  if (userId) {
    console.log(`• An account for ${email} already exists — promoting it to administrator (password unchanged).`);
  } else {
    const password = process.env.ADMIN_PASSWORD ?? (await ask("Password (min 12 chars, upper+lower+number): ", true));
    if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      fail("Password must be at least 12 characters and include upper-case, lower-case and a number.");
    }
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: name } });
    if (error || !data.user) fail(`Could not create the account: ${error?.message ?? "unknown error"}`);
    userId = data.user!.id;
    console.log(`• Created account for ${email}.`);
  }

  // The signup trigger created a 'reader' profile; upgrade it. Service role is exempt from the role-change guard.
  const { error: updateError } = await db.from("profiles").update({ role: "admin", is_active: true, display_name: name }).eq("id", userId!);
  if (updateError) fail(`The account exists but could not be promoted: ${updateError.message}. Did you run the SQL migrations?`);

  const { data: check } = await db.from("profiles").select("role, slug").eq("id", userId!).single();
  if (check?.role !== "admin") fail("Promotion did not stick — check the profiles table and migrations.");
  console.log(`\n✔ ${email} is now an administrator. Sign in at /login.\n`);
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
