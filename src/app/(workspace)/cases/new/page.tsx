import type { Metadata } from "next";
import { CreateCaseForm } from "@/components/features/CreateCaseForm";

export const metadata: Metadata = { title: "New case request | CALIBER" };

export default function NewCasePage() {
  return <CreateCaseForm />;
}
