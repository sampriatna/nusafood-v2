import { Suspense } from "react";
import NewTeguranForm from "./new-teguran-form";

export default function NewTeguranPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">Memuat form...</div>
      }
    >
      <NewTeguranForm />
    </Suspense>
  );
}
