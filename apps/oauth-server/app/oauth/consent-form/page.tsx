"use client";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import useSWR from "swr";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";

const FormSchema = z.object({
  pin: z.string().min(6, {
    message: "Your one-time password must be 6 characters.",
  }),
});

// ex http://localhost:3000/oauth/consent-form?consent_challenge=b665e56ad77044fbaa866567c7d4e60c
export default function ConsentForm({
  // params,
  searchParams,
}: {
  // params: { slug: string }
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const consentChallenge = searchParams.consent_challenge;
  const userCode = searchParams.user_code;

  // GET /oauth2/auth
  // const { data, error } = useSWR(
  //   consentChallenge
  //     ? `/oauth2/auth?consent_challenge=${consentChallenge}`
  //     : null,
  //   async (url) => {
  //     const response = await fetch(url);
  //     return response.json();
  //   }
  // );

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      pin: userCode as string,
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    toast("You submitted the following values:", {
      description: JSON.stringify(data, null, 2),
    });
    const qs = new URLSearchParams({ otp: data.pin });
    const res = await fetch(`/oauth2/consent`, {
      method: "POST",
      body: qs,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    const json = await res.json<{
      code: string;
      scope: string;
      state: string;
    }>();

    if (res.status === 200) {
      // redirect to http://localhost:8976/oauth/callback
      // but how do we know to do this?
      const redirectUri = new URL("/oauth/callback", "http://localhost:8976");
      const params = new URLSearchParams(json);
      redirectUri.search = params.toString();
      window.location.href = redirectUri.toString();
    }
  }

  return (
    <div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Sign Up</CardTitle>
          <CardDescription>
            Enter your information to create an account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="w-2/3 space-y-6"
            >
              <FormField
                control={form.control}
                name="pin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Code</FormLabel>
                    <FormControl>
                      <InputOTP
                        maxLength={6}
                        {...field}
                        data-1p-ignore=""
                        pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </FormControl>
                    <FormDescription>
                      Please enter the temporary code you were prompted with.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">
                Submit
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
