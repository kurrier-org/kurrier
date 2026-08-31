import { DEFAULT_DISTRIBUTION } from "./config";
import type { ComponentType } from "react";

type DistributionPages = {
    LandingPage: ComponentType<any>;
    LoginPage: ComponentType<any>;
    SignupPage: ComponentType<any>;
};

const pages = import.meta.glob("./*/pages/index.ts", {
    eager: true,
}) as Record<string, DistributionPages>;

const distribution = process.env.NEXT_PUBLIC_KURRIER_DISTRIBUTION ?? DEFAULT_DISTRIBUTION;

const selected = pages[`./${distribution}/pages/index.ts`];

if (!selected) {
    throw new Error(`Distribution pages not found: ${distribution}`);
}

export const DistributionLandingPage = selected.LandingPage;
export const DistributionLoginPage = selected.LoginPage;
export const DistributionSignupPage = selected.SignupPage;
