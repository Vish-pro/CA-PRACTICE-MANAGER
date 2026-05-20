import { redirect } from "next/navigation";

export default function TasksRootRedirect() {
  redirect("/tasks/tracker");
}