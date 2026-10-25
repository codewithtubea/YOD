import Link from "next/link";

import { readSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type CheckState = "ok" | "error";

type Check = {
  label: string;
  state: CheckState;
  detail: string;
};

async function checkAuthApi(url: string, publishableKey: string): Promise<Check> {
  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: publishableKey },
      cache: "no-store",
    });

    if (response.ok) {
      return {
        label: "Auth API",
        state: "ok",
        detail: "Reached the Supabase Auth service.",
      };
    }

    return {
      label: "Auth API",
      state: "error",
      detail: `Supabase Auth responded with HTTP ${response.status}. Check the project URL and publishable key.`,
    };
  } catch {
    return {
      label: "Auth API",
      state: "error",
      detail:
        "Could not reach the Supabase Auth service. Check your network and the project URL.",
    };
  }
}

async function checkDatabase(): Promise<Check> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("health_check");

    if (!error) {
      return {
        label: "Database",
        state: "ok",
        detail: "Ran the health_check SQL function successfully.",
      };
    }

    if (error.code === "PGRST202") {
      return {
        label: "Database",
        state: "error",
        detail:
          "Connected to the API, but the foundation migration is not applied yet (health_check is missing). Run supabase/migrations/20261025120000_foundation.sql.",
      };
    }

    return {
      label: "Database",
      state: "error",
      detail: `Database check failed: ${error.message}`,
    };
  } catch {
    return {
      label: "Database",
      state: "error",
      detail: "Could not create a Supabase client. Check the environment variables.",
    };
  }
}

function StatusBadge({ state }: { state: CheckState }) {
  const isOk = state === "ok";

  return (
    <span
      className={
        isOk
          ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900"
          : "rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-900"
      }
    >
      {isOk ? "OK" : "Failed"}
    </span>
  );
}

export default async function SetupCheckPage() {
  const env = readSupabaseEnv();

  if (!env.ok) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-6 px-6 py-16">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
            YOD Circle setup
          </p>
          <h1 className="mt-2 font-serif text-3xl text-stone-900">
            Supabase is not configured
          </h1>
        </div>

        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
          <p className="font-medium">Missing environment variables:</p>
          <ul className="mt-2 list-inside list-disc font-mono text-sm">
            {env.missing.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            Copy <code>.env.example</code> to <code>.env.local</code> and fill in
            the values from Supabase → Project Settings → API. Restart the dev
            server afterwards.
          </p>
        </div>
      </main>
    );
  }

  const [authCheck, databaseCheck] = await Promise.all([
    checkAuthApi(env.value.url, env.value.publishableKey),
    checkDatabase(),
  ]);

  const checks = [authCheck, databaseCheck];
  const allOk = checks.every((check) => check.state === "ok");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
          YOD Circle setup
        </p>
        <h1 className="mt-2 font-serif text-3xl text-stone-900">
          {allOk ? "Supabase is connected" : "Supabase needs attention"}
        </h1>
        <p className="mt-3 text-stone-700">
          {allOk
            ? "The project URL, publishable key, Auth API, and database are reachable."
            : "The configuration loaded, but one or more checks failed."}
        </p>
      </div>

      <dl className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white/70">
        <div className="flex items-start justify-between gap-4 p-5">
          <div>
            <dt className="font-medium text-stone-900">Environment</dt>
            <dd className="mt-1 text-sm text-stone-600">
              URL and publishable key are present.
            </dd>
          </div>
          <StatusBadge state="ok" />
        </div>

        {checks.map((check) => (
          <div
            key={check.label}
            className="flex items-start justify-between gap-4 p-5"
          >
            <div>
              <dt className="font-medium text-stone-900">{check.label}</dt>
              <dd className="mt-1 text-sm text-stone-600">{check.detail}</dd>
            </div>
            <StatusBadge state={check.state} />
          </div>
        ))}
      </dl>

      <div className="rounded-2xl border border-stone-200 bg-stone-100/70 p-5 text-sm text-stone-700">
        <p className="font-medium text-stone-900">Project</p>
        <p className="mt-1 break-all font-mono text-xs">{env.value.url}</p>
        <p className="mt-3">
          The publishable key is intentionally not displayed. Secret keys are
          never used here.
        </p>
      </div>

      <Link
        href="/"
        className="text-sm font-medium text-emerald-800 underline decoration-emerald-700/30 underline-offset-4"
      >
        Back to home
      </Link>
    </main>
  );
}
