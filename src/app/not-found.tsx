import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-semibold">404</h1>
      <p className="text-neutral-500 max-w-md">
        The page you were looking for doesn&apos;t exist or was moved.
      </p>
      <Link
        href="/"
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
      >
        Home
      </Link>
    </div>
  );
}
