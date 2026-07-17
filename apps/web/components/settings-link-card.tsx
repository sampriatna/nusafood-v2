import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export function SettingsLinkCard({
  href,
  title,
  description,
  meta,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  meta?: string;
  icon: LucideIcon;
}) {
  return (
    <Link href={href} className="block">
      <Card className="cursor-pointer p-4 transition-colors hover:border-primary/40 hover:bg-muted/30">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="size-5 text-primary" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <h3 className="font-semibold leading-tight">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
              {meta ? (
                <p className="text-xs text-muted-foreground/90">{meta}</p>
              ) : null}
            </div>
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        </div>
      </Card>
    </Link>
  );
}
