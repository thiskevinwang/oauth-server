import { cookies } from "next/headers";
import { RedirectType, redirect } from "next/navigation";

export function SignOutButton() {
	const action = async () => {
		"use server";
		cookies().delete("__token");
		redirect("/welcome", RedirectType.push);
	};
	const jwt = cookies().get("__token");
	if (!jwt?.value) return null;
	return (
		<form action={action}>
			<button className="underline" type="submit">
				Sign out
			</button>
		</form>
	);
}
