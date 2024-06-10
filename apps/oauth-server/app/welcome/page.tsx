import { unsafeDecodeToken } from "@/lib/auth";
import { formatRelative } from "date-fns";
import { cookies } from "next/headers";

import JsonView from "@/components/json-view";

export const runtime = "edge";

export default function Page() {
	const jwt = cookies().get("__token");

	const decoded = jwt?.value ? unsafeDecodeToken(jwt.value) : {};
	return (
		<div>
			<h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Welcome!</h1>
			<JsonView value={decoded}></JsonView>
			<p>Current time: {formatRelative(new Date(), new Date())}</p>

			{decoded?.payload ? (
				<>
					<p>Token issued: {formatRelative(decoded?.payload.iat * 1000, new Date())}</p>
					<p>Token expires: {formatRelative(decoded?.payload.exp * 1000, new Date())}</p>
				</>
			) : null}
		</div>
	);
}
