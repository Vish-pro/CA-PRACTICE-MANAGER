import { redirect } from "next/navigation";

export default function ReportsRootRedirect() {
  redirect("/reports/leads-pipeline");
}