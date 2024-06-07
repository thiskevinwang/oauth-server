"use client";
// ex. http://localhost:3000/login?login_challenge=123
export default function LoginPage({
  // params,
  searchParams,
}: {
  // params: { slug: string }
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const loginChallenge = searchParams.login_challenge;

  async function action(formData: FormData) {
    // @ts-ignore
    const qs = new URLSearchParams(formData); // 'username=asda&password=asdasd&grant_type=password'
    const res = await fetch(`/oauth2/token?${qs}`, {
      method: "POST",
      headers: {
        // Spec says to use application/x-www-form-urlencoded... But like, why?
        "Content-Type": "application/x-www-form-urlencoded",
      },
      redirect: "follow",
    });
    // not part of spec. Just redirect to smoke test cookie setting & parsing
    console.log(res.status);
    if (res.redirected) {
      window.location.href = res.url;
    }
  }

  return (
    <div>
      <h1>Login</h1>
      <p>Challenge: {loginChallenge}</p>

      <form action={action}>
        <div className="space-y-4 flex flex-col">
          <input
            type="text"
            name="username"
            placeholder="username"
            className="border rounded-md p-1"
            data-1p-ignore
          />
          <input
            type="password"
            name="password"
            placeholder="password (optional)"
            className="border rounded-md p-1"
            data-1p-ignore
          />
          <input
            type="hidden"
            className="hidden"
            name="grant_type"
            value="password"
            data-1p-ignore
          />

          <button className="border rounded-md p-1">Submit</button>
        </div>
      </form>
    </div>
  );
}
