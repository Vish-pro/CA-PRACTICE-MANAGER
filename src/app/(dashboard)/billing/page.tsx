import { redirect } from "next/navigation";

export default function BillingRootRedirect() {
  redirect("/billing/invoices");
}