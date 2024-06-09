import { redirect, RedirectType } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";

export function SignInButton() {
  const jwt = cookies().get("__token");
  if (!!jwt?.value) return null;
  return (
    <Link className="underline" href="/sign-in">
      Sign in
    </Link>
  );
}
