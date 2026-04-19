import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function IndexPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  redirect("/dashboard");
}
