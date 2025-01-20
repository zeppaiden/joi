import { redirect } from "next/navigation";

// TODO: Figure out what the protected page should be.
export default function ProtectedPage() {
  redirect("/protected/inbox");
}
