import { MobileHeader } from "@/components/mobile-header";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  backHref?: string;
  /** Default true jika backHref diberikan; set false untuk portal staff home. */
  showBack?: boolean;
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
  showBack,
  maxWidth = "2xl",
  className,
  children,
}: Props) {
  const resolvedShowBack = showBack ?? true;
  return (
    <div className="min-h-screen bg-background">
      <MobileHeader
        title={title}
        showBack={resolvedShowBack}
        backHref={backHref}
      />
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
