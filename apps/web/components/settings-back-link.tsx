import Link from "next/link";

export function SettingsBackLink({
  href = "/settings",
  label = "← Pengaturan",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link href={href} className="text-sm text-muted-foreground hover:underline">
      {label}
    </Link>
  );
}
