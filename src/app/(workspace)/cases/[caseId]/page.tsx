import type { Metadata } from "next";
import { CaseDetailView } from "@/components/features/CaseDetailView";

function safeDecode(value: string): string {
  if (!value.includes("%")) return value;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function CaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  // Case data lives in the client data source (mock session or API with the persona header).
  return <CaseDetailView caseId={safeDecode(caseId)} />;
}
