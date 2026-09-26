import { Money } from "@/components/ui";
import { isMetaLine, lineAmount, parseQuotePacket, type WorkOrderQuote } from "@/lib/quote";

export function QuoteDocument({
  scope,
  quote,
  optionLabel = false,
}: {
  scope: string;
  quote: WorkOrderQuote;
  optionLabel?: boolean;
}) {
  const packet = parseQuotePacket(quote);
  const moneyLines = quote.lines.filter((line) => !isMetaLine(line));
  const incurred = moneyLines.filter((line) => line.kind === "incurred");
  const proposed = moneyLines.filter((line) => line.kind === "proposed");
  const steps = packet.resolution
    .split("\n")
    .map((step) => step.replace(/^\d+\.\s*/, "").trim())
    .filter((step) => step && !/^MTC is proposing/i.test(step));

  return (
    <div className="space-y-5 text-sm">
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Scope of work</p>
        <p className="mt-1.5 text-ink-2">{scope}</p>
      </section>

      <section>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Incurred</p>
        <p className="mt-1.5 text-ink-2">{packet.incurredNotes}</p>
        <ul className="mt-2 space-y-1">
          {incurred.map((line) => (
            <li key={line.id} className="flex justify-between gap-3">
              <span className="text-ink-2">
                {line.description}
                {line.laborHours ? ` — ${line.laborHours} hour${line.laborHours === 1 ? "" : "s"}` : ""}
                {line.laborRate ? ` @ $${line.laborRate}/hr` : ""}
              </span>
              <span className="tabular-nums font-medium">
                <Money amount={lineAmount(line)} />
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Proposed resolution</p>
        <p className="mt-1.5 text-ink-2">MTC is proposing to do the following:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-2">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <ul className="mt-3 space-y-1">
          {proposed
            .filter((line) => /trip|labor/i.test(line.description))
            .map((line) => (
              <li key={line.id} className="flex justify-between gap-3">
                <span className="text-ink-2">
                  {optionLabel && quote.optionType === "repair_vs_replace" ? `${line.side} · ` : ""}
                  {line.description}
                  {line.laborHours ? ` — ${line.laborHours} hour${line.laborHours === 1 ? "" : "s"}` : ""}
                  {line.laborRate ? ` @ $${line.laborRate}/hr` : ""}
                </span>
                <span className="tabular-nums font-medium">
                  <Money amount={lineAmount(line)} />
                </span>
              </li>
            ))}
        </ul>
      </section>

      <section>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Material breakdown</p>
        <ul className="mt-2 space-y-1">
          {proposed
            .filter((line) => !/trip|labor/i.test(line.description))
            .map((line) => (
              <li key={line.id} className="flex justify-between gap-3">
                <span className="text-ink-2">
                  {optionLabel && quote.optionType === "repair_vs_replace" ? `${line.side} · ` : ""}
                  {line.description}
                </span>
                <span className="tabular-nums font-medium">
                  <Money amount={lineAmount(line)} />
                </span>
              </li>
            ))}
          {proposed.filter((line) => !/trip|labor/i.test(line.description)).length === 0 && (
            <li className="text-ink-3">No materials on this estimate.</li>
          )}
        </ul>
      </section>

      <section>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Exclusions</p>
        <p className="mt-1.5 text-ink-2">{packet.exclusions}</p>
      </section>

      <section>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Lead time</p>
        <p className="mt-1.5 text-ink-2">{packet.leadTime}</p>
      </section>
    </div>
  );
}
