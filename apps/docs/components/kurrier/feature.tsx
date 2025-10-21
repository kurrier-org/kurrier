import { Mail, Lock, Search, Server, ShieldCheck, Cpu } from "lucide-react";

const features = [
	{
		name: "Instant webmail for any provider",
		description:
			"Add Gmail, SES, SendGrid, or any IMAP/SMTP account — Kurrier automatically builds a working inbox with threads and attachments.",
		icon: Mail,
	},
	{
		name: "Self-hosted and private",
		description:
			"Run Kurrier on your own server or laptop. No external tracking or telemetry — your data and credentials stay fully in your control.",
		icon: Lock,
	},
	{
		name: "Reliable message sync",
		description:
			"Kurrier continuously syncs new mail, sent items, and deletions — keeping your local inbox up to date automatically.",
		icon: Server,
	},
	{
		name: "Local search and filters",
		description:
			"Search subjects, senders, and content instantly with fast local indexing — no dependency on cloud APIs.",
		icon: Search,
	},
	{
		name: "Simple to deploy",
		description:
			"Get started in minutes with Docker or run it from source. Kurrier runs anywhere — from a personal machine to a VPS.",
		icon: Cpu,
	},
	{
		name: "Open-source and extensible",
		description:
			"Fully open-source under a permissive license. Extend providers, add custom logic, or integrate Kurrier into your own projects.",
		icon: ShieldCheck,
	},
];

export default function KurrierFeatures() {
	return (
		<section className="bg-white dark:bg-neutral-950 py-24 sm:py-32 transition-colors">
			<div className="mx-auto max-w-7xl px-6 lg:px-8">
				{/* Section Header */}
				<div className="mx-auto max-w-2xl sm:text-center">
					<h2 className="text-base font-semibold text-blue-600 dark:text-blue-400">
						Why Kurrier
					</h2>
					<p className="mt-2 text-4xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">
						Email that fits your setup.
					</p>
					<p className="mt-6 text-lg text-gray-600 dark:text-gray-300">
						Kurrier turns your existing email credentials into a full webmail —
						modern, private, and designed to run anywhere.
					</p>
				</div>
			</div>

			<div className="relative overflow-hidden pt-16">
				<div className="mx-auto max-w-7xl px-6 lg:px-8">
					<img
						alt="Kurrier dashboard preview (light)"
						src="/light-mailbox.png"
						width={2432}
						height={1442}
						className="block dark:hidden mb-[-12%] rounded-xl shadow-2xl ring-1 ring-gray-900/10"
					/>

					{/* Dark mode image */}
					<img
						alt="Kurrier dashboard preview (dark)"
						src="/dark-mailbox.png"
						width={2432}
						height={1442}
						className="hidden dark:block mb-[-12%] rounded-xl shadow-2xl ring-1 ring-gray-100/10 dark:shadow-gray-900/40"
					/>

					<div aria-hidden="true" className="relative">
						<div className="absolute -inset-x-20 bottom-0 bg-gradient-to-t from-white dark:from-gray-950 pt-[7%]" />
					</div>
				</div>
			</div>

			<div className="mx-auto mt-16 max-w-7xl px-6 sm:mt-20 md:mt-24 lg:px-8">
				<dl className="mx-auto grid max-w-2xl grid-cols-1 gap-x-6 gap-y-12 text-gray-600 dark:text-gray-300 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16">
					{features.map((feature) => (
						<div key={feature.name} className="relative pl-9">
							<dt className="inline font-semibold text-gray-900 dark:text-gray-100">
								<feature.icon
									aria-hidden="true"
									className="absolute top-1 left-1 size-5 text-blue-600 dark:text-blue-400"
								/>
								{feature.name}
							</dt>{" "}
							<dd className="inline text-gray-600 dark:text-gray-400">
								{feature.description}
							</dd>
						</div>
					))}
				</dl>
			</div>
		</section>
	);
}
