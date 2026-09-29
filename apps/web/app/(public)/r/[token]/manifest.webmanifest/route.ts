import { NextResponse } from "next/server";

type Props = {
  params: Promise<{ token: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: Props) {
  const { token } = await params;
  const staffPath = `/r/${encodeURIComponent(token)}`;

  return NextResponse.json(
    {
      id: staffPath,
      name: "NF3 Operasional",
      short_name: "NF3",
      description: "Tugas, SOP, dan koordinasi operasional NF3",
      start_url: staffPath,
      scope: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#ea580c",
      orientation: "portrait",
    },
    {
      headers: {
        "Content-Type": "application/manifest+json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}
