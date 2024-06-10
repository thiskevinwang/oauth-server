"use client";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import Link from "next/link";

// a mapping of all paths to UI-friendly names
const pathLookup = {
	"/": "Home",
	"/sign-up": "Sign Up",
	"/sign-in": "Sign In",
	"/welcome": "Welcome",
	"/consent-granted": "Consent Granted",
	"/consent-form": "Consent Form",
	"/oauth2": "OAuth2",
	"/oauth": "OAuth",
	"/error": "Error"
};

function splitPath(path: string) {
	// Remove the leading slash if it exists
	if (path.startsWith("/")) {
		path = path.substring(1);
	}

	// Split the path and prepend the leading slash to each part except the first one
	const parts = path.split(/(?=\/)/);
	if (parts.length > 0) {
		parts[0] = "/" + parts[0];
	}

	return parts;
}

export function PathBreadcrumbs() {
	const pathname = usePathname();
	const parts = splitPath(pathname);

	return (
		<Breadcrumb className="hidden md:flex">
			<BreadcrumbList>
				{parts.map((part, index) => {
					// if last
					if (index === parts.length - 1) {
						return (
							<Fragment key={index}>
								<BreadcrumbItem>
									<BreadcrumbPage>{pathLookup[part] || part}</BreadcrumbPage>
								</BreadcrumbItem>
							</Fragment>
						);
					}

					// if nth
					return (
						<Fragment key={index}>
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link href={`${parts.slice(0, index + 1).join()}`}>{pathLookup[part] || part}</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
						</Fragment>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
