import { cookies } from "next/headers";
import { redirect, RedirectType } from "next/navigation";

import { cn } from "@/lib/utils";

import { randomSync } from "ksuid";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import * as schema from "@/db/schema";
const d1 = getRequestContext().env.DB;
const db = drizzle(d1, { schema });

export const runtime = "edge";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SignUpPage({
  // params,
  searchParams,
}: {
  // params: { slug: string }
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const error = searchParams.error;

  // related see https://auth0.com/docs/api/authentication#signup
  async function action(formData: FormData) {
    "use server";

    console.log({ formData });
    // create user and then call /oauth2/token
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    try {
      const user = await db
        .insert(schema.users)
        .values({
          username,
          password,
        })
        .execute();
    } catch (e: any) {
      console.error(e);
      // [Error: D1_ERROR: UNIQUE constraint failed: users.username]
      if (e.message.match(/unique/i)) {
        return redirect(`/sign-up?error=username_taken`, RedirectType.replace);
      }
      return redirect(`/sign-up?error=${e.message}`, RedirectType.replace);
    }

    // @ts-ignore
    const qs = new URLSearchParams(formData); // 'username=asda&password=asdasd&grant_type=password'
    // how can we know the origin of the Oauth server?
    const res = await fetch(
      new URL(`/oauth2/token?${qs}`, "http://localhost:3000"),
      {
        method: "POST",
        headers: {
          // Spec says to use application/x-www-form-urlencoded... But like, why?
          "Content-Type": "application/x-www-form-urlencoded",
        },
        redirect: "follow",
      }
    );
    const json = await res.json<{ access_token: string }>();

    cookies().set("__token", json.access_token, {
      sameSite: true,
      secure: true,
    });

    redirect("/welcome");
  }

  return (
    <div>
      <form action={action}>
        <SignUpForm />
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
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignUpForm() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Sign Up</CardTitle>
        <CardDescription>
          Enter your information to create an account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {/* <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="first-name">First name</Label>
              <Input id="first-name" placeholder="Max" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last-name">Last name</Label>
              <Input id="last-name" placeholder="Robinson" required />
            </div>
          </div> */}
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              name="username"
              id="username"
              placeholder="m@example.com"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input name="password" id="password" type="password" />
          </div>
          <Button type="submit" className="w-full">
            Create an account
          </Button>
        </div>
        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link href="/sign-in" className="underline">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
