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
							{/*Unified email, calendar, and contacts*/}
							Email, calendar, contacts, and storage
						</span>
					</Highlighter>{" "}
					{/*for{" "}*/}
					{/*<Highlighter action="highlight" color="#51A2FF">*/}
					{/*	any*/}
					{/*</Highlighter>{" "}*/}
					{/*provider.*/}
				</h1>

				<p className="mt-4 text-xl text-neutral-600 max-w-3xl">
					Your{" "}
					<Highlighter action="highlight" color="#FF9800">
						open-source workspace
					</Highlighter>{" "}
					, perfectly synced and beautifully integrated.
				</p>

				<div className="text-xl max-w-5xl py-8 mx-auto text-center leading-relaxed flex gap-2">
					Fast, private, and fully searchable - powered by your existing SMTP,
					IMAP, CalDAV, CardDAV, and WebDAV services.
				</div>
			</div>


			<div className="my-12 flex flex-col items-center gap-6 px-4 text-center">
				<Button asChild size="lg">
					<Link href="/docs">Read the docs</Link>
				</Button>

				<div className="text-sm text-neutral-600">
					<span>Prefer a hosted version?</span>
					<span className="mx-2">·</span>
					<Link
						href="https://www.kurrier.io"
						className="font-medium text-foreground underline underline-offset-4"
					>
						Kurrier.io
					</Link>
					<span className="mx-2">·</span>
					<Link
						href="https://www.kurriermail.com"
						className="font-medium text-foreground underline underline-offset-4"
					>
						Kurrier Mail
					</Link>
				</div>

				<Button variant="link" className="underline" asChild size="sm">
					<Link href="https://buy.stripe.com/dRmfZje75d4OaGG8ux3Nm00">
						💙 Support Kurrier
					</Link>
				</Button>
			</div>

			{/*<div className={"flex justify-center my-12"}>*/}
			{/*	<Button asChild={true} size={"lg"}>*/}
			{/*		<Link href={"/docs"}>Read the docs</Link>*/}
			{/*	</Button>*/}
			{/*</div>*/}



			{/*<div className={"flex justify-center -mt-10"}>*/}
			{/*	<Button*/}
			{/*		variant={"link"}*/}
			{/*		className={"underline"}*/}
			{/*		asChild={true}*/}
			{/*		size={"sm"}*/}
			{/*	>*/}
			{/*		<Link href={"https://buy.stripe.com/dRmfZje75d4OaGG8ux3Nm00"}>*/}
			{/*			💙 Support Kurrier*/}
			{/*		</Link>*/}
			{/*	</Button>*/}
			{/*</div>*/}

			<FeatureExample />
		</>
	);
}
