import type { Metadata } from "next";
import { ProjectPicClient } from "./project-pic-client";

type Props = {
  params: Promise<{ token: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Project NF3",
  };
}

export default async function ProjectPicPage({ params }: Props) {
  const { token } = await params;
  return <ProjectPicClient token={token} />;
}
