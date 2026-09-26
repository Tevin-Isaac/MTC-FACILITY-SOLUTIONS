import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { quoteTotals, type QuoteLine, type WorkOrderQuote } from "@/lib/quote";

export async function loadPublicWorkOrder(workOrderId: string) {
  const admin = createAdminClient();
  const { data: wo, error } = await admin
    .from("work_orders")
    .select("id, wo_number, trade, priority, status, description, nte, dne, site_id, created_at")
    .eq("id", workOrderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!wo) return null;

  const { data: site } = await admin
    .from("sites")
    .select("name, address, account_id")
    .eq("id", wo.site_id)
    .maybeSingle();
  const { data: account } = site
    ? await admin.from("accounts").select("name, type").eq("id", site.account_id).maybeSingle()
    : { data: null };

  const { data: quoteRow } = await admin
    .from("quotes")
    .select("*, quote_line_items(*)")
    .eq("work_order_id", workOrderId)
    .limit(1)
    .maybeSingle();

  const { data: invoice } = await admin
    .from("invoices")
    .select("*")
    .eq("work_order_id", workOrderId)
    .limit(1)
    .maybeSingle();

  const { data: completion } = await admin
    .from("completion_records")
    .select(
      "before_photo_urls, after_photo_urls, after_video_url, root_cause, sign_off_name, sign_off_at, sign_off_signature_url"
    )
    .eq("work_order_id", workOrderId)
    .maybeSingle();

  const quote: WorkOrderQuote | null = quoteRow
    ? {
        id: quoteRow.id as string,
        workOrderId: quoteRow.work_order_id as string,
        optionType: quoteRow.option_type as WorkOrderQuote["optionType"],
        status: quoteRow.status as WorkOrderQuote["status"],
        approvedBy: (quoteRow.approved_by as string) ?? null,
        approvedAt: (quoteRow.approved_at as string) ?? null,
        lines: ((quoteRow.quote_line_items as Record<string, unknown>[]) ?? []).map((row) => ({
          id: row.id as string,
          side: row.side as QuoteLine["side"],
          description: row.description as string,
          kind: row.kind as QuoteLine["kind"],
          laborHours: row.labor_hours != null ? Number(row.labor_hours) : null,
          laborRate: row.labor_rate != null ? Number(row.labor_rate) : null,
          materialsCost: row.materials_cost != null ? Number(row.materials_cost) : null,
          markupPercent: row.markup_percent != null ? Number(row.markup_percent) : null,
        })),
      }
    : null;

  return {
    workOrder: {
      id: wo.id as string,
      woNumber: wo.wo_number as string,
      trade: wo.trade as string,
      status: wo.status as string,
      description: wo.description as string,
      nte: wo.nte != null ? Number(wo.nte) : null,
      dne: wo.dne != null ? Number(wo.dne) : null,
    },
    site: site as { name: string; address: string } | null,
    account: account as { name: string; type: string } | null,
    quote,
    invoice: invoice
      ? {
          invoiceNumber: invoice.invoice_number as string,
          status: invoice.status as string,
          amount: Number(invoice.amount),
          issuedAt: (invoice.issued_at as string) ?? null,
          dueAt: (invoice.due_at as string) ?? null,
        }
      : null,
    completion: completion
      ? {
          beforePhotoUrls: (completion.before_photo_urls as string[]) ?? [],
          afterPhotoUrls: (completion.after_photo_urls as string[]) ?? [],
          afterVideoUrl: (completion.after_video_url as string) ?? null,
          rootCause: (completion.root_cause as string) ?? null,
          signOffName: (completion.sign_off_name as string) ?? null,
          signOffAt: (completion.sign_off_at as string) ?? null,
          signOffSignatureUrl: (completion.sign_off_signature_url as string) ?? null,
        }
      : null,
    totals: quoteTotals(quote),
  };
}
