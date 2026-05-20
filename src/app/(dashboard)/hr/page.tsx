import { redirect } from "next/navigation";

export default function HRRootRedirect() {
  redirect("/hr/attendance");
}