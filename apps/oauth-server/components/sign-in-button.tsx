import { cookies } from "next/headers";
import Link from "next/link";
import { RedirectType, redirect } from "next/navigation";

export function SignInButton() {
	const jwt = cookies().get("__token");
	if (!!jwt?.value) return null;
	return (
		<Link className="underline" href="/sign-in">
			Sign in
		</Link>
	);
}
