import type { Metadata } from "next";
import { Suspense } from "react";
import { CaseBoardView } from "@/components/features/CaseBoardView";
import { BoardSkeleton } from "@/components/features/skeletons";

export default function CasesPage() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <CaseBoardView />
    </Suspense>
  );
}
