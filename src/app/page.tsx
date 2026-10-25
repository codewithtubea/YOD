import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
          YOD Circle
        </p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-stone-900">
          A quiet place for our circle.
        </h1>
        <p className="mt-4 max-w-md text-stone-700">
          One chapter a day, honest reflections, prayer, and care. The
          foundation is being built — starting with a verified Supabase
          connection.
        </p>
      </div>

      <Link
        href="/setup-check"
        className="inline-flex w-fit items-center rounded-full bg-emerald-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-900"
      >
        Check Supabase connection
      </Link>
    </main>
  );
}
