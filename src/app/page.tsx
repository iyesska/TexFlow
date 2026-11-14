import { redirect } from "next/navigation";

/** The documents are the home page; the proxy sends signed-out visitors to sign in. */
export default function Home() {
  redirect("/documents");
}
