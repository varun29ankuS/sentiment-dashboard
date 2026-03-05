import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { CommandPalette } from "@/components/command-palette";
import { SearchTrigger } from "@/components/search-trigger";
import { HeaderBreadcrumb } from "@/components/header-breadcrumb";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-6">
          <SidebarTrigger className="-ml-2" />
          <Separator orientation="vertical" className="h-4" />
          <HeaderBreadcrumb />
          <div className="flex-1" />
          <SearchTrigger />
          <ThemeToggle />
        </header>
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </SidebarInset>
      <CommandPalette />
    </SidebarProvider>
  );
}
