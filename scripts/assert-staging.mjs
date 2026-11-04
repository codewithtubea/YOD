import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const PRODUCTION_PROJECT_REF = "mfcmqvgypomcfbrqiqrm";

export function projectRefFromUrl(url) {
  if (!url) return null;
  const match = /^https?:\/\/([a-z0-9]+)\.supabase\.co/i.exec(url.trim());
  return match?.[1] ?? null;
}

function readPublicEnv(path) {
  const values = {};
  try {
    const contents = readFileSync(resolve(process.cwd(), path), "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const match = /^(NEXT_PUBLIC_SUPABASE_(?:URL|PUBLISHABLE_KEY))=(.*)$/.exec(
        line.trim(),
      );
      if (match) values[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    return values;
  }
  return values;
}

export function resolveStagingConfig({ requireKey = false } = {}) {
  const testFile = readPublicEnv(".env.test.local");
  const localFile = readPublicEnv(".env.local");
  const sources = [
    {
      name: "STAGING_SUPABASE_URL",
      url: process.env.STAGING_SUPABASE_URL,
      key: process.env.STAGING_SUPABASE_PUBLISHABLE_KEY,
    },
    {
      name: ".env.test.local",
      url: testFile.NEXT_PUBLIC_SUPABASE_URL,
      key: testFile.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    },
    {
      name: "NEXT_PUBLIC_SUPABASE_URL",
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    },
    {
      name: ".env.local",
      url: localFile.NEXT_PUBLIC_SUPABASE_URL,
      key: localFile.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    },
  ];

  const source = sources.find((candidate) => candidate.url);
  if (!source) {
    throw new Error(
      "Refusing to run: set STAGING_SUPABASE_URL or point .env.test.local at the staging project.",
    );
  }

  if (projectRefFromUrl(source.url) === PRODUCTION_PROJECT_REF) {
    throw new Error(
      "Refusing to run tests against the production Supabase project. Use staging.",
    );
  }

  if (requireKey && !source.key) {
    throw new Error(
      `Refusing to run: ${source.name} has a staging URL but no matching publishable key.`,
    );
  }

  return {
    url: source.url,
    publishableKey: source.key,
    source: source.name,
    projectRef: projectRefFromUrl(source.url),
  };
}

export function effectiveSupabaseUrl() {
  return resolveStagingConfig().url;
}

export function assertStaging(options) {
  return resolveStagingConfig(options);
}

if (process.argv[1]?.endsWith("assert-staging.mjs")) {
  const staging = assertStaging();
  console.log(`Staging project confirmed: ${staging.projectRef} (${staging.source})`);
}
