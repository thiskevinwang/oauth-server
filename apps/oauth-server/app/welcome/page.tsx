import { cookies } from "next/headers";
import { redirect, RedirectType } from "next/navigation";

import { cn } from "@/lib/utils";

import { unsafeDecodeToken } from "@/lib/auth";

export const runtime = "edge";

export default function WelcomePage() {
  const jwt = cookies().get("__token");

  const decoded = jwt?.value ? unsafeDecodeToken(jwt.value) : null;
  return (
    <div className={cn("mx-auto flex justify-center")}>
      <WelcomeCard
        username={decoded?.payload.username}
        id={decoded?.payload.sub}
      />
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

export function WelcomeCard({
  username,
  id,
}: {
  username: string;
  id: string;
}) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Welcome</CardTitle>
        <CardDescription>This is you</CardDescription>
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
              value={username}
              readOnly
              disabled
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="id">ID</Label>
            <Input name="id" id="id" type="id" value={id} readOnly disabled />
          </div>
          {/* <Button type="submit" className="w-full">
            Create an account
          </Button> */}
        </div>
        {/* <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link href="/sign-in" className="underline">
            Sign in
          </Link>
        </div> */}
      </CardContent>
    </Card>
  );
}
