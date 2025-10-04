import { redirect } from "next/navigation";

export default function LegacyCaptainTermsRedirect() {
  redirect("/agreement");
}

