"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export function SettingsLogoutCard() {
  const router = useRouter();
  const { toast } = useToast();
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
    } catch {
      toast({
        title: "Error",
        description: "Gagal logout. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Card className="p-4">
      <Button
        variant="destructive"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="w-full"
      >
        {isLoggingOut ? (
          <span className="flex items-center gap-2">
            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Keluar...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <LogOut className="size-4" />
            Logout dari Sistem
          </span>
        )}
      </Button>
    </Card>
  );
}
