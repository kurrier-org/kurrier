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
						<span className={"font-bold"}>Instant webmail</span>
					</Highlighter>{" "}
					for{" "}
					<Highlighter action="highlight" color="#51A2FF">
						any
					</Highlighter>{" "}
					email provider.{" "}
				</h1>

				<div className="text-xl max-w-5xl py-8 mx-auto text-center leading-relaxed flex gap-2">
					Connect with SMTP, IMAP, SES, SendGrid, and more — your email, unified
					and searchable.
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
