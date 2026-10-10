import { redirect } from "next/navigation";

// The AI sandbox lives inside the dashboard (it needs the signed-in session).
export default function TestCsAiRedirect() {
  redirect("/dashboard/test-cs-ai");
}
