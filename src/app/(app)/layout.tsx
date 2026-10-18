import { redirect } from "next/navigation";
import { TabBar } from "@/components/TabBar";
import { getCurrentUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="app">
      <div className="content">{children}</div>
      <TabBar />
    </div>
  );
}
