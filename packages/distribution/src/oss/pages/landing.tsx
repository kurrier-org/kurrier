import { redirect } from "next/navigation";

export async function LandingPage({
                                      locale,
                                      workspacePath,
                                  }: {
    locale: string;
    workspacePath: string | null;
}) {
    if (workspacePath) {
        return redirect(`/${locale}${workspacePath}`);
    }

    return redirect(`/${locale}/auth/login`);
}
