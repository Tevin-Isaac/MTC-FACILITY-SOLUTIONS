"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronRight, Plus } from "lucide-react";
import type { WorkOrder } from "@/types/work-order";
import {
  accountForSite as accountForSiteFn,
  siteById as siteByIdFn,
  slaCountdown,
  slaRisk,
  PHASE_COLOR,
  type PhaseFamily,
} from "@/lib/domain";
import { useAppData } from "@/components/AppDataProvider";
import { StatusBadge, PriorityBadge } from "@/components/Badge";
import { WorkOrderQuickView } from "@/components/WorkOrderQuickView";
import { SectionHead, Pill, Empty, LinkButton, Money, Tile } from "@/components/ui";
import { EASE_OUT } from "@/components/motion";

export function AnimatedPhaseBars({
  phaseCounts,
  phaseMax,
  phaseTotal,
}: {
  phaseCounts: { phase: PhaseFamily; value: number }[];
  phaseMax: number;
  phaseTotal: number;
}) {
  const reduce = useReducedMotion();
  return (
    <>
    <ul className="mt-6 flex flex-col gap-4">
      {phaseCounts.map(({ phase, value }, i) => (
        <li key={phase}>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: PHASE_COLOR[phase] }}
              />
              {phase}
            </span>
            <span className="text-[15px] font-semibold tabular-nums">{value}</span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-tint">
            <motion.div
              className="h-full rounded-full"
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${(value / phaseMax) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.15 + i * 0.07, ease: EASE_OUT }}
              style={{ background: PHASE_COLOR[phase] }}
            />
          </div>
        </li>
      ))}
    </ul>
    <p className="mt-5 text-xs text-ink-3">
      {phaseTotal} work order{phaseTotal === 1 ? "" : "s"} across all phases
    </p>
    </>
  );
}

export function DashboardAttention({
  items,
}: {
  items: { wo: WorkOrder; risk: ReturnType<typeof slaRisk> }[];
}) {
  const [peek, setPeek] = useState<WorkOrder | null>(null);
  const { sites } = useAppData();

  return (
    <>
      <Tile className="h-full">
        <SectionHead
          title="Needs attention"
          sub="Open work orders at risk of, or past, their resolve deadline"
          trailing={
            items.length > 0 ? (
              <Pill tone="critical">{items.length}</Pill>
            ) : (
              <Pill tone="good">Clear</Pill>
            )
          }
        />
        {items.length === 0 ? (
          <Empty
            title="Nothing is breaching right now"
            hint="Work orders appear here once they are within four hours of their resolve deadline."
          />
        ) : (
          <ul className="mt-5 flex flex-col gap-2">
            {items.map(({ wo, risk }, i) => {
              const site = siteByIdFn(sites, wo.siteId);
              return (
                <motion.li
                  key={wo.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05, ease: EASE_OUT }}
                >
                  <button
                    type="button"
                    onClick={() => setPeek(wo)}
                    className="group flex w-full flex-wrap items-center gap-3 rounded-card bg-sunken px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:bg-tint hover:shadow-soft"
                  >
                    <span className="text-sm font-semibold tabular-nums">{wo.woNumber}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-2">
                      {site?.name}
                    </span>
                    <PriorityBadge priority={wo.priority} />
                    <Pill tone={risk === "breached" ? "critical" : "warning"} dot>
                      {slaCountdown(wo) ?? (risk === "breached" ? "Breached" : "At risk")}
                    </Pill>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}
      </Tile>
      <WorkOrderQuickView workOrder={peek} onClose={() => setPeek(null)} />
    </>
  );
}

export function DashboardJobMix({
  commercial,
  residential,
}: {
  commercial: number;
  residential: number;
}) {
  const total = Math.max(1, commercial + residential);
  return (
    <Tile>
      <SectionHead
        title="Corporate and residential"
        sub="Same board, both kinds of work"
      />
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-card bg-navy-tint px-4 py-4">
          <p className="text-[11px] font-medium text-navy-ink">Corporate</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{commercial}</p>
        </div>
        <div className="rounded-card bg-gold-tint px-4 py-4">
          <p className="text-[11px] font-medium text-gold-deep">Residential</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{residential}</p>
        </div>
      </div>
      <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-tint">
        <span
          className="h-full bg-navy transition-all"
          style={{ width: `${(commercial / total) * 100}%` }}
        />
        <span
          className="h-full bg-gold transition-all"
          style={{ width: `${(residential / total) * 100}%` }}
        />
      </div>
    </Tile>
  );
}

export function DashboardActionQueues({
  unassigned,
  quotes,
  readyToBill,
  onHold,
  needsQuote = [],
  mode = "money",
}: {
  unassigned: WorkOrder[];
  quotes: WorkOrder[];
  readyToBill: WorkOrder[];
  onHold: WorkOrder[];
  needsQuote?: WorkOrder[];
  mode?: "ops" | "money";
}) {
  const queues =
    mode === "ops"
      ? [
          { title: "Needs dispatch", hint: "Intake with nobody assigned", items: unassigned, tone: "warning" as const },
          { title: "Needs a quote", hint: "Write and send the estimate", items: needsQuote, tone: "navy" as const },
          { title: "Quote with client", hint: "Waiting on a yes or no", items: quotes, tone: "gold" as const },
          { title: "On hold", hint: "Exception — resume when ready", items: onHold, tone: "serious" as const },
        ]
      : [
          { title: "Needs dispatch", hint: "Intake with nobody dispatched", items: unassigned, tone: "warning" as const },
          { title: "Quote with client", hint: "Waiting on a yes or no", items: quotes, tone: "navy" as const },
          { title: "Ready to bill", hint: "Create or send the invoice", items: readyToBill, tone: "good" as const },
          { title: "On hold", hint: "Exception — resume when ready", items: onHold, tone: "serious" as const },
        ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {queues.map((queue) => (
        <Tile key={queue.title} className="min-h-[12rem]">
          <SectionHead
            title={queue.title}
            sub={queue.hint}
            trailing={<Pill tone={queue.tone}>{queue.items.length}</Pill>}
          />
          {queue.items.length === 0 ? (
            <p className="mt-6 text-xs text-ink-3">Clear</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-1.5">
              {queue.items.slice(0, 4).map((wo) => (
                <li key={wo.id}>
                  <Link
                    href={`/work-orders/${wo.id}`}
                    className="flex items-center justify-between gap-2 rounded-control px-2 py-1.5 text-sm hover:bg-tint"
                  >
                    <span className="font-semibold tabular-nums">{wo.woNumber}</span>
                    <span className="truncate text-xs text-ink-3">
                      {wo.trade.replace(/_/g, " ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Tile>
      ))}
    </div>
  );
}

export function DashboardQueue({ items }: { items: WorkOrder[] }) {
  const [peek, setPeek] = useState<WorkOrder | null>(null);
  const { sites, accounts } = useAppData();

  return (
    <>
      <Tile padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
          <SectionHead title="My queue" sub="Soonest resolve deadline first · click a row to peek" />
          <div className="flex items-center gap-2">
            <LinkButton href="/work-orders/new" variant="soft">
              <Plus className="h-4 w-4" />
              New work order
            </LinkButton>
            <Link
              href="/work-orders"
              className="inline-flex items-center gap-1 rounded-control px-3 py-2 text-sm font-medium text-navy-ink transition-colors hover:bg-tint"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {items.length === 0 ? (
          <Empty
            title="No open work orders"
            hint="Create one, or wait for the next ServiceChannel intake."
          />
        ) : (
          <div className="mt-5 overflow-x-auto px-2 pb-4 sm:px-3">
            <table className="w-full min-w-[52rem] border-separate border-spacing-y-1.5 text-left text-sm">
              <thead>
                <tr className="text-[11.5px] font-medium text-ink-3">
                  <th className="px-4 pb-1.5 font-medium">WO #</th>
                  <th className="px-4 pb-1.5 font-medium">Site</th>
                  <th className="px-4 pb-1.5 font-medium">Trade</th>
                  <th className="px-4 pb-1.5 font-medium">Priority</th>
                  <th className="px-4 pb-1.5 font-medium">SLA</th>
                  <th className="px-4 pb-1.5 font-medium">Stage</th>
                  <th className="px-4 pb-1.5 text-right font-medium">NTE</th>
                  <th className="w-8 pb-1.5" />
                </tr>
              </thead>
              <tbody>
                {items.map((wo) => {
                  const site = siteByIdFn(sites, wo.siteId);
                  const account = accountForSiteFn(sites, accounts, wo.siteId);
                  const countdown = slaCountdown(wo);
                  const risk = slaRisk(wo);
                  const cell = "bg-sunken px-4 py-4 transition-colors group-hover:bg-tint";
                  return (
                    <tr
                      key={wo.id}
                      className="group cursor-pointer"
                      onClick={() => setPeek(wo)}
                    >
                      <td className={`${cell} rounded-l-card font-semibold tabular-nums`}>
                        <Link
                          href={`/work-orders/${wo.id}`}
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {wo.woNumber}
                        </Link>
                      </td>
                      <td className={cell}>
                        <div className="truncate font-medium">{site?.name}</div>
                        <div className="truncate text-xs text-ink-3">{account?.name}</div>
                      </td>
                      <td className={`${cell} capitalize text-ink-2`}>
                        {wo.trade.replace(/_/g, " ")}
                      </td>
                      <td className={cell}>
                        <PriorityBadge priority={wo.priority} />
                      </td>
                      <td className={cell}>
                        {countdown ? (
                          <span
                            className={
                              risk === "breached"
                                ? "font-semibold text-critical"
                                : risk === "at_risk"
                                  ? "font-semibold text-warning"
                                  : "text-ink-2"
                            }
                          >
                            {countdown}
                          </span>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>
                      <td className={cell}>
                        <StatusBadge status={wo.status} />
                      </td>
                      <td className={`${cell} text-right font-semibold`}>
                        <Money amount={wo.nte} />
                      </td>
                      <td className={`${cell} rounded-r-card pl-0 pr-3`}>
                        <ChevronRight className="h-4 w-4 text-ink-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Tile>
      <WorkOrderQuickView workOrder={peek} onClose={() => setPeek(null)} />
    </>
  );
}
