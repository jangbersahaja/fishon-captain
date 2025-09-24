import { redirect } from "next/navigation";

export const metadata = { title: "Sign in" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next = searchParams.next || "/captain/form";
  redirect(`/auth?mode=signin&next=${encodeURIComponent(next)}`);
}
