import Link from "next/link";
import { GridPatternDemo } from "@/components/kurrier/grid-pattern";
import { Highlighter } from "@/components/ui/highlighter";
import FeatureExample from "@/components/kurrier/feature";
import { Button } from "@/components/ui/button";

export default function HomePage() {
	return (
		<>
			<GridPatternDemo />

			<div
				className={
					"flex flex-col items-center justify-center text-bl px-4 sm:px-8 lg:px-16 -mt-12 z-30"
				}
			>
				<h1 className={"text-5xl"}>
					<Highlighter action="underline" color="#FF9800">
						<span className={"font-bold"}>
							Unified email, calendar, and contacts
						</span>
					</Highlighter>{" "}
					for{" "}
					<Highlighter action="highlight" color="#51A2FF">
						any
					</Highlighter>{" "}
					provider.
				</h1>

				<p className="mt-4 text-xl text-neutral-400 max-w-3xl">
					All your communication, perfectly synced and beautifully integrated.
				</p>

				<div className="text-xl max-w-5xl py-8 mx-auto text-center leading-relaxed flex gap-2">
					Fast, private, and fully searchable - powered by your existing
					SMTP/IMAP/CalDAV/CardDAV credentials.
				</div>
			</div>

			<div className={"flex justify-center my-12"}>
				<Button asChild={true} size={"lg"}>
					<Link href={"/docs"}>Read the docs</Link>
				</Button>
			</div>

			<div className={"flex justify-center -mt-10"}>
				<Button
					variant={"link"}
					className={"underline"}
					asChild={true}
					size={"sm"}
				>
					<Link href={"https://buy.stripe.com/dRmfZje75d4OaGG8ux3Nm00"}>
						💙 Support Kurrier
					</Link>
				</Button>
			</div>

			<FeatureExample />
		</>
	);
}
