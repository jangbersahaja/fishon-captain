import { zIndexClasses } from "@/config/zIndex";
import authOptions from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import StaffNav from "./_components/StaffNav";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) redirect("/auth?mode=signin&next=/staff");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1 flex-col md:flex-row">
        <aside
          className={`md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 ${zIndexClasses.content}`}
        >
          <StaffNav />
        </aside>
        <main className="flex-1 bg-slate-50/60 min-h-[calc(100vh-0px)]">
          {children}
        </main>
        <aside
          className={`hidden 2xl:flex md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/60 ${zIndexClasses.content}`}
        />
      </div>
    </div>
  );
}
