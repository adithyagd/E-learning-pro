import { PageHeader } from "@/layouts/AppShell";
import { EmptyState } from "@/components/states";

/** Reserved page for a module that will be implemented in a later step. */
export function ModulePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        title="Not yet available"
        description="This area is reserved and will be enabled in a later release."
      />
    </>
  );
}
