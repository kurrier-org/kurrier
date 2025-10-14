"use server";

import { FormState } from "@schema";
import { formDataToJson } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AuthSession } from "@supabase/supabase-js";
import * as crypto from "node:crypto";
export async function login(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	const values = formDataToJson(formData);
	const supabase = await createClient();
	const { data, error } = await supabase.auth.signInWithPassword({
		email: values.email,
		password: values.password,
	});

	if (error) {
		return {
			success: false,
			error: error.message,
		};
	}

	if (data) {
		redirect("/dashboard");
	}

	return { success: true, message: "Logged in!" };
}

export async function signup(
	prev: FormState,
	formData: FormData,
): Promise<FormState> {
	const values = formDataToJson(formData);
	const supabase = await createClient();
	const { data, error } = await supabase.auth.signUp({
		email: values.email,
		password: values.password,
	});

	if (error) {
		return {
			success: false,
			error: error.message,
		};
	}

	if (data) {
		redirect("/dashboard");
	}

	return { success: true, message: "Welcome!", data };
}

export const isSignedIn = async () => {
	const client = await createClient();
	const {
		data: { user },
	} = await client.auth.getUser();
	return user;
};

export const currentSession = async () => {
	const client = await createClient();
	const {
		data: { session },
	} = await client.auth.getSession();
	return session as AuthSession;
};

export const signOut = async (redirectUrl?: string) => {
	const client = await createClient();
	await client.auth.signOut();
	redirect(redirectUrl ? redirectUrl : "/auth/login");
};

export const getGravatarUrl = async (email: string, size = 80) => {
	const trimmedEmail = email.trim().toLowerCase();
	const hash = crypto.createHash("sha256").update(trimmedEmail).digest("hex");
	return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
};
