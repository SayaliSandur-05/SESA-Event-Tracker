import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#09172B] flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#E4BC70] border-t-transparent rounded-full" />
        </div>
      }
    >
      <DashboardSidebar>{children}</DashboardSidebar>
    </Suspense>
  );
}
