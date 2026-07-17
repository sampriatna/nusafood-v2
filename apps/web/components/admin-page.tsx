import { MobileHeader } from "@/components/mobile-header";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  backHref?: string;
  maxWidth?: "xl" | "2xl" | "3xl";
  className?: string;
  children: React.ReactNode;
};

const widthClass = {
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
} as const;

export function AdminPage({
  title,
  backHref = "/dashboard",
  maxWidth = "2xl",
  className,
  children,
}: Props) {
  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title={title} showBack backHref={backHref} />
      <div
        className={cn(
          "mx-auto space-y-4 p-4 pb-10",
          widthClass[maxWidth],
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
