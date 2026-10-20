import { redirect } from "next/navigation";

// Instagram is now one of the chat channels; its setup lives on the channels page.
export default function InstagramRedirect() {
  redirect("/dashboard/channels");
}
