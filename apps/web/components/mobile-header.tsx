"use client";

import { ArrowLeft, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  showSettings?: boolean;
  backHref?: string;
  isAdminPage?: boolean;
}

export function MobileHeader({
  title,
  showBack = false,
  showSettings = false,
  backHref,
  isAdminPage = true,
}: MobileHeaderProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

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

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 -ml-2"
              onClick={handleBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="font-semibold text-lg text-foreground truncate">
            {title}
          </h1>
        </div>

        {isAdminPage && showSettings && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 -mr-2">
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
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
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {!isAdminPage && showSettings && (
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="h-9 w-9 -mr-2">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
