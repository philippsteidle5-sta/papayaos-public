import { InvoiceItemData } from "./invoiceGenerator";
import { SUPERADMIN_EMAIL, getCurrentUserEmail, isSuperAdminEmail } from "./leadDatabase";

export interface AdminInvoiceRecord {
  id: string;
  number: string;
  date: string;
  amount: number; // Brutto in EUR, z. B. 29.00 oder 99.00
  netAmount: number;
  taxAmount: number;
  taxRatePercent?: number;
  currency: string;
  planName: string;
  status: "PAID" | "PENDING" | "REFUNDED";
  paymentMethodLabel: string;
  paymentType?: "apple_pay" | "google_pay" | "paypal" | "klarna" | "card" | "crypto" | "invoice_transfer";
  recipientName: string;
  recipientEmail: string;
  recipientSlot: number | string;
  quantumToken: string;
  features: string[];
  paidAt?: string;
  notes?: string;
  createdAt?: string;
}

const LOCAL_STORAGE_INVOICES_KEY = "syntax_admin_all_invoices_v1";

const LEGACY_DEMO_INVOICE_IDS = new Set(["inv_2026_2319", "inv_2026_1711", "inv_2026_0944", "inv_2026_0891", "inv_2026_0782", "inv_2026_0655", "inv_2026_0520"]);

export function getStoredAdminInvoices(): AdminInvoiceRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_INVOICES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const filtered = parsed.filter((invoice: AdminInvoiceRecord) => !LEGACY_DEMO_INVOICE_IDS.has(invoice.id) && !String(invoice.id).startsWith("inv_beta_"));
    if (filtered.length !== parsed.length) persistAdminInvoices(filtered);
    return filtered;
  } catch {
    return [];
  }
}

/**
 * Persist invoices in localStorage
 */
export function persistAdminInvoices(invoices: AdminInvoiceRecord[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_INVOICES_KEY, JSON.stringify(invoices));
  } catch (e) {
    console.error("Failed to persist admin invoices:", e);
  }
}

export async function fetchAllAdminInvoices(): Promise<AdminInvoiceRecord[]> {
  try {
    const res = await fetch("/api/admin/invoices?adminEmail=" + encodeURIComponent(SUPERADMIN_EMAIL));
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.invoices)) {
        persistAdminInvoices(data.invoices);
        return data.invoices;
      }
    }
  } catch (e) {
    console.warn("Could not fetch invoices from server API:", e);
  }
  return [];
}

/**
 * Toggle or update invoice status (e.g. mark PENDING as PAID, or vice versa)
 */
export async function updateAdminInvoiceStatus(
  invoiceId: string,
  newStatus: "PAID" | "PENDING" | "REFUNDED",
  notes?: string
): Promise<{ ok: boolean; invoice?: AdminInvoiceRecord }> {
  const current = getStoredAdminInvoices();
  const idx = current.findIndex((inv) => inv.id === invoiceId || inv.number === invoiceId);

  if (idx === -1) {
    return { ok: false };
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("de-DE") + " " + now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr";

  current[idx] = {
    ...current[idx],
    status: newStatus,
    paidAt: newStatus === "PAID" ? (current[idx].paidAt || dateStr) : undefined,
    notes: notes !== undefined ? notes : current[idx].notes,
  };

  persistAdminInvoices(current);

  // Sync with backend API
  try {
    await fetch("/api/admin/invoices/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminEmail: SUPERADMIN_EMAIL,
        invoiceId: current[idx].id,
        status: newStatus,
        notes: current[idx].notes,
      }),
    });
  } catch {}

  return { ok: true, invoice: current[idx] };
}

/**
 * Delete an invoice from database
 */
export async function deleteAdminInvoice(invoiceId: string): Promise<boolean> {
  const current = getStoredAdminInvoices();
  const filtered = current.filter((inv) => inv.id !== invoiceId && inv.number !== invoiceId);
  persistAdminInvoices(filtered);

  try {
    await fetch("/api/admin/invoices/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminEmail: SUPERADMIN_EMAIL,
        invoiceId,
      }),
    });
  } catch {}

  return true;
}

/**
 * Export all invoices as CSV string & trigger immediate browser download
 */
export function exportInvoicesToCsv(invoices: AdminInvoiceRecord[]): void {
  const headers = [
    "Rechnungsnummer",
    "Datum",
    "Status",
    "Kunde Name",
    "Kunde E-Mail",
    "Slot #",
    "Plan",
    "Zahlungsart",
    "Brutto (EUR)",
    "Netto (EUR)",
    "MwSt 19% (EUR)",
    "Bezahlt am",
    "Notizen",
  ];

  const rows = invoices.map((inv) => [
    inv.number,
    inv.date,
    inv.status === "PAID" ? "BEZAHLT" : (inv.status === "PENDING" ? "OFFEN" : "ERSTATTET"),
    `"${(inv.recipientName || "").replace(/"/g, '""')}"`,
    inv.recipientEmail,
    inv.recipientSlot || "",
    `"${(inv.planName || "").replace(/"/g, '""')}"`,
    `"${(inv.paymentMethodLabel || "").replace(/"/g, '""')}"`,
    inv.amount.toFixed(2).replace(".", ","),
    inv.netAmount.toFixed(2).replace(".", ","),
    inv.taxAmount.toFixed(2).replace(".", ","),
    `"${(inv.paidAt || "").replace(/"/g, '""')}"`,
    `"${(inv.notes || "").replace(/"/g, '""')}"`,
  ]);

  const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute("href", url);
  link.setAttribute("download", `SYNTAX_Rechnungen_Billing_Export_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

