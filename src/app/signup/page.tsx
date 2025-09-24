import { redirect } from "next/navigation";
export const metadata = { title: "Sign up" };

export default function SignupPage() {
  redirect("/auth?mode=signup&next=/captain/form");
}
