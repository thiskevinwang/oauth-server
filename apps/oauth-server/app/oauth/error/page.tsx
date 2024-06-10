import { formatRelative } from "date-fns";

import JsonView from "@/components/json-view";

export const runtime = "edge";

export default function Page({
	searchParams
}: {
	searchParams: { [key: string]: string | string[] | undefined };
}) {

	return (
		<div>
			<h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Error</h1>
			<JsonView value={{ ...searchParams }}/>
		</div>
	);
}
