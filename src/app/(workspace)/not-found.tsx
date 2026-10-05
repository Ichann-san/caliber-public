import { Button, EmptyState } from "@/components/ui";

export default function WorkspaceNotFound() {
  return (
    <EmptyState
      title="Page not found"
      body="This address is not part of the workspace."
      action={
        <Button as="a" href="/cases" variant="primary">
          Go to cases
        </Button>
      }
    />
  );
}
