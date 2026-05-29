import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/auth";
import { loginAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Already signed in → straight to the console.
  if (await hasAdminSession()) {
    redirect("/admin");
  }
  const { error } = await searchParams;

  return (
    <>
      <h1>Operator sign-in</h1>
      <p className="lede">
        The CRM and lifecycle actions are restricted to the business operator. Enter the admin
        token to continue.
      </p>
      <div className="card" style={{ maxWidth: 420 }}>
        {error ? (
          <p className="small" style={{ color: "#b00020" }} role="alert">
            Invalid token, or no admin token is configured on the server.
          </p>
        ) : null}
        <form action={loginAction} className="row-actions" style={{ flexDirection: "column", gap: 8 }}>
          <label htmlFor="token" className="small muted">
            Admin token
          </label>
          <input
            id="token"
            name="token"
            type="password"
            autoComplete="current-password"
            required
            aria-label="Admin token"
          />
          <button type="submit">Sign in</button>
        </form>
        <p className="small muted" style={{ marginTop: 12 }}>
          Set <code>ADMIN_TOKEN</code> in the server environment (see <code>.env.example</code>).
        </p>
      </div>
    </>
  );
}
