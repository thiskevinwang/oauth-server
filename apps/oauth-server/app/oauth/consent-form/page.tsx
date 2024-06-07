"use client";
import useSWR from "swr";

// ex http://localhost:3000/oauth/consent-form?consent_challenge=b665e56ad77044fbaa866567c7d4e60c
export default function ConsentForm({
  // params,
  searchParams,
}: {
  // params: { slug: string }
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const consentChallenge = searchParams.consent_challenge;

  // GET /oauth2/auth?cli
  const { data, error } = useSWR(
    consentChallenge
      ? `/oauth2/auth?consent_challenge=${consentChallenge}`
      : null,
    async (url) => {
      const response = await fetch(url);
      return response.json();
    }
  );

  console.log(data, error);

  return (
    <div>
      <h1>Consent Form</h1>
      <p>Do you consent to the terms and conditions?</p>
      <button>Yes</button>
      <button>No</button>
    </div>
  );
}
