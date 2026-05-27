import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  async function adminSignIn(formData: FormData) {
    "use server";
    const password = formData.get("password") as string;

    if (password === process.env.ADMIN_SECRET) {
      const cookieStore = await cookies();
      cookieStore.set("admin_token", password, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 8, // 8 hours
      });
      redirect("/admin/upload");
    } else {
      redirect("/admin/login?error=invalid");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-amber-400 font-mono">ByLawsIndex.com Admin</h1>
          <p className="text-slate-400 text-sm mt-2">Internal access only</p>
        </div>

        {params.error && (
          <div className="bg-red-950 border border-red-800 rounded-lg p-3 text-red-300 text-sm">
            Invalid password. Try again.
          </div>
        )}

        <form action={adminSignIn} className="space-y-3">
          <input
            name="password"
            type="password"
            placeholder="Admin password"
            required
            autoFocus
            className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2.5 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm py-2.5 rounded-lg transition-colors"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
