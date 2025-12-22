import React from "react";
import SettingsGeneral from "@/components/mailbox/settings/settings-general";
import { FormState, handleAction } from "@schema";
import { decode } from "decode-formdata";
import { rlsClient } from "@/lib/actions/clients";
import { identities } from "@db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";


async function Page({params}: {params: Promise<Record<string, string>>}) {

    const paramsResolved = await params;
    const rls = await rlsClient();
    const [identity] = await rls((tx) =>
        tx
            .select()
            .from(identities)
            .where(eq(identities.publicId, paramsResolved.identityPublicId))
    );

    const updateName = async (_prev: FormState, formData: FormData): Promise<FormState> => {
        "use server";
        return handleAction(async () => {
            const decodedForm = decode(formData);
            const rls = await rlsClient();
            await rls((tx) =>
                tx
                    .update(identities)
                    .set({
                        displayName: decodedForm.displayName as string,
                    })
                    .where(eq(identities.id, decodedForm.id as string)),
            );
            revalidatePath(String(decodedForm.pathname))
            return {success: true, message: "Display name updated."};
        })
    }

    return <SettingsGeneral updateName={updateName} identity={identity} />
}

export default Page;
