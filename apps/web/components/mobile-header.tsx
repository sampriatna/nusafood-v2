"use client";

import { ArrowLeft, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  title: string;
  showBack?: boolean;
  showSettings?: boolean;
  backHref?: string;
  isAdminPage?: boolean;
  right?: React.ReactNode;
};

export function MobileHeader({
  title,
  showBack = false,
  showSettings = false,
  backHref,
  isAdminPage = true,
  right,
}: Props) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const backButton = showBack ? (
    backHref ? (
      <Button
        variant="ghost"
        size="icon"
        className="-ml-2 size-9 shrink-0"
        asChild
      >
        <Link href={backHref} aria-label="Kembali">
          <ArrowLeft className="size-5" />
        </Link>
      </Button>
    ) : (
      <Button
        variant="ghost"
        size="icon"
        className="-ml-2 size-9 shrink-0"
        onClick={() => router.back()}
        aria-label="Kembali"
      >
        <ArrowLeft className="size-5" />
      </Button>
    )
  ) : null;

  const settingsMenu =
    isAdminPage && showSettings ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="-mr-2 size-9">
            <Settings className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center">
              <Settings className="mr-2 size-4" />
              <span>Pengaturan</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-destructive focus:text-destructive"
          >
            {isLoggingOut ? (
              <span className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <LogOut className="mr-2 size-4" />
            )}
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : !isAdminPage && showSettings ? (
      <Button variant="ghost" size="icon" className="-mr-2 size-9" asChild>
        <Link href="/settings" aria-label="Pengaturan">
          <Settings className="size-5" />
        </Link>
      </Button>
    ) : null;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2">
          {backButton}
          <h1 className="truncate text-lg font-semibold">{title}</h1>
        </div>
        {settingsMenu ?? (right ? <div className="shrink-0">{right}</div> : null)}
      </div>
    </header>
  );
}
