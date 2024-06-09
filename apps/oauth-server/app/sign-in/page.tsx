import { cookies } from "next/headers";
import { RedirectType, redirect } from "next/navigation";

import { cn } from "@/lib/utils";

import * as schema from "@/db/schema";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
const d1 = getRequestContext().env.DB;
const db = drizzle(d1, { schema });

export const runtime = "edge";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function SignInPage({
	// params,
	searchParams
}: {
	// params: { slug: string }
	searchParams: { [key: string]: string | string[] | undefined };
}) {
	const loginChallenge = searchParams.login_challenge;
	const error = searchParams.error;
	const redirectUrl = searchParams.redirect;

	async function action(formData: FormData) {
		"use server";
		// validate username + password
		const username = formData.get("username") as string;
		const password = formData.get("password") as string;

		const [user] = await db
			.select()
			.from(schema.users)
			.where(
				and(
					eq(schema.users.username, username),
					eq(schema.users.password, password)
				)
			)
			.execute();

		if (!user) {
			redirect("/sign-in?error=invalid-credentials", RedirectType.replace);
		}

		// @ts-ignore
		const qs = new URLSearchParams(formData); // 'username=asda&password=asdasd&grant_type=password'

		// how can we know the origin of the Oauth server?
		const res = await fetch(new URL(`/oauth2/token`, "http://localhost:3000"), {
			method: "POST",
			body: qs,
			headers: {
				// Spec says to use application/x-www-form-urlencoded... But like, why?
				"Content-Type": "application/x-www-form-urlencoded"
			}
		});
		const json = await res.json<{ access_token: string }>();

		cookies().set("__token", json.access_token, {
			sameSite: true,
			secure: true
		});

		if (redirectUrl) {
			// http%3A%2F%2Flocalhost%3A3000%2Foauth%2Fconsent-form%3Fuser_code%3Dgaheoh
			const decodedRedirectUrl = decodeURIComponent(redirectUrl as string);
			return redirect(decodedRedirectUrl);
		}
		if (loginChallenge) {
			// for testing convenience, if any loginChallenge is present (sent by the CLI),
			// we will redirect to the consent form
			redirect("/oauth/consent-form");
		} else {
			redirect("/welcome");
		}
	}

	return (
		<div>
			{/* <p>Challenge: {loginChallenge}</p> */}
			<form action={action}>
				<SignInForm />
				<input
					type="hidden"
					className="hidden"
					name="grant_type"
					value="password"
					data-1p-ignore
				/>
			</form>

			{error && (
				<Alert className="mt-4 w-full max-w-sm" variant="destructive">
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>
						{error === "invalid-credentials"
							? "Invalid username or password."
							: "An unknown error occurred."}
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
}

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignInForm() {
	return (
		<Card className="w-full max-w-sm">
			<CardHeader>
				<CardTitle className="text-xl">Sign in</CardTitle>
				<CardDescription>
					Enter your email below to sign in to your account.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor="username">Username</Label>
						<Input
							name="username"
							id="username"
							type="username"
							placeholder="m@example.com"
							required
							data-1p-ignore
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="password">Password</Label>
						<Input
							name="password"
							id="password"
							type="password"
							required
							data-1p-ignore
						/>
					</div>
					<Button type="submit" className="w-full">
						Sign in
					</Button>
				</div>
				<div className="mt-4 text-center text-sm">
					Don’t have an account?{" "}
					<Link href="/sign-up" className="underline">
						Sign up
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}
