"use server";
import {rlsClient} from "@/lib/actions/clients";
import { calendars } from "@db";
import { eq } from "drizzle-orm";
import {FormState} from "@schema";
import {decode} from "decode-formdata";

export const fetchDefaultCalendar = async () => {
    const rls = await rlsClient();
    const [defaultCalendar] = await rls((tx) =>
        tx
            .select()
            .from(calendars)
            .where(eq(calendars.isDefault, true))
    );
    return defaultCalendar;
}


export async function createCalendarEvent  (
    _prev: FormState,
    formData: FormData,
): Promise<FormState> {
    const decodedForm = decode(formData);
    console.log("decodedForm", decodedForm)

    return {
        success: true,
    };
}
