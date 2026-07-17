"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  showBack?: boolean;
  backHref?: string;
  right?: React.ReactNode;
};

export function MobileHeader({
  title,
  showBack = false,
  backHref,
  right,
}: Props) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2">
          {showBack ? (
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
          ) : null}
          <h1 className="truncate text-lg font-semibold">{title}</h1>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </header>
  );
}
