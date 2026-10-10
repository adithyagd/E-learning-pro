import { CheckCircle2, Info, XCircle } from "lucide-react";

type Block =
  | { type: "h"; text: string }
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "steps"; items: { title: string; text: string }[] }
  | { type: "terms"; items: { term: string; definition: string }[] }
  | { type: "example"; title: string; text: string }
  | {
      type: "compare";
      title: string;
      good: string;
      bad: string;
      goodLabel?: string;
      badLabel?: string;
    }
  | { type: "answer"; title: string; items: { term: string; definition: string }[] }
  | { type: "callout"; text: string };

/** Lesson content is stored as structured blocks in `lessons.content.blocks`. */
export function getBlocks(content: unknown): Block[] {
  const b = (content as { blocks?: unknown } | null)?.blocks;
  return Array.isArray(b) ? (b as Block[]) : [];
}

export function LessonContent({ content }: { content: unknown }) {
  const blocks = getBlocks(content);
  if (!blocks.length)
    return <p className="text-sm text-muted-foreground">This lesson has no content yet.</p>;
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h":
            return (
              <h3 key={i} className="pt-2 text-base font-semibold text-foreground">
                {b.text}
              </h3>
            );
          case "p":
            return <p key={i}>{b.text}</p>;
          case "list":
            return (
              <ul key={i} className="list-disc space-y-1 pl-5">
                {b.items.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            );
          case "steps":
            return (
              <ol key={i} className="space-y-3">
                {b.items.map((s, n) => (
                  <li key={s.title} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-xs font-semibold tabular-nums text-primary">
                      {n + 1}
                    </span>
                    <div>
                      <p className="font-medium">{s.title}</p>
                      <p className="text-muted-foreground">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            );
          case "terms":
            return (
              <dl key={i} className="divide-y rounded-md border">
                {b.items.map((t) => (
                  <div key={t.term} className="grid gap-1 p-3 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="font-medium">{t.term}</dt>
                    <dd className="text-muted-foreground">{t.definition}</dd>
                  </div>
                ))}
              </dl>
            );
          case "example":
            return (
              <div key={i} className="rounded-md border-l-2 border-primary bg-muted/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {b.title}
                </p>
                <p className="mt-1">{b.text}</p>
              </div>
            );
          case "compare":
            return (
              <div key={i}>
                <p className="mb-2 font-medium">{b.title}</p>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded-md border border-success/30 bg-success/5 p-3">
                    <p className="flex items-center gap-1 text-xs font-semibold text-success">
                      <CheckCircle2 className="size-3.5" aria-hidden />{" "}
                      {b.goodLabel ?? "Recommended"}
                    </p>
                    <p className="mt-1">{b.good}</p>
                  </div>
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                    <p className="flex items-center gap-1 text-xs font-semibold text-destructive">
                      <XCircle className="size-3.5" aria-hidden /> {b.badLabel ?? "Avoid"}
                    </p>
                    <p className="mt-1">{b.bad}</p>
                  </div>
                </div>
              </div>
            );
          case "answer":
            return (
              <details key={i} className="group rounded-md border bg-card">
                <summary className="cursor-pointer rounded-md p-3 font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {b.title} — show after you finish the exercise
                </summary>
                <dl className="divide-y border-t">
                  {b.items.map((t) => (
                    <div key={t.term} className="grid gap-1 p-3 sm:grid-cols-[200px_1fr] sm:gap-4">
                      <dt className="font-medium">{t.term}</dt>
                      <dd className="text-muted-foreground">{t.definition}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            );
          case "callout":
            return (
              <div key={i} className="flex gap-2 rounded-md border border-info/30 bg-info/10 p-3">
                <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
                <p>{b.text}</p>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
