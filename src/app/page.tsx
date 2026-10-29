import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import HomePageClient from "./HomePageClient";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Page() {
  // Check the staff session on the server.
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("sesa_session_user")?.value;

  if (sessionCookie) {
    const user = await getCurrentUser();

    if (user) {
      redirect("/dashboard");
    }
  }

  // No valid staff session: show the normal public homepage.
  return <HomePageClient />;
}
