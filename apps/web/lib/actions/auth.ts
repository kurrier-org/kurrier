"use server";

import { FormState, getServerEnv } from "@schema";
import { formDataToJson } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AuthSession } from "@supabase/supabase-js";
import * as crypto from "node:crypto";
import { Queue, QueueEvents } from "bullmq";
import {getRedis} from "@/lib/actions/get-redis";
import {APP_VERSION} from "@common";

const initProviders = async (userId: string) => {
	const { REDIS_PASSWORD, REDIS_HOST, REDIS_PORT } = getServerEnv();
	const redisConnection = {
		connection: {
			host: REDIS_HOST || "redis",
			port: Number(REDIS_PORT || 6379),
			password: REDIS_PASSWORD,
		},
	};
	const commonWorkerQueue = new Queue("common-worker", redisConnection);
	const commonWorkerEvents = new QueueEvents("common-worker", redisConnection);
	await commonWorkerEvents.waitUntilReady();

	const job = await commonWorkerQueue.add("sync-providers", { userId });
	await job.waitUntilFinished(commonWorkerEvents);
};

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
		redirect("/dashboard/platform/overview");
	}

	return { success: true, message: "Logged in!" };
}

const applyPendingMigrations = async (userId: string) => {
    const { migrationWorkerQueue, migrationWorkerEvents } = await getRedis();
    const job = await migrationWorkerQueue.add(
        "migration:run-for-user-after-signup",
        { userId },
        {
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 3000,
            },
            removeOnComplete: { age: 60 },
            removeOnFail: false,
            jobId: `migration:${userId}:${APP_VERSION}`,
        },
    );
    await job.waitUntilFinished(migrationWorkerEvents);
    return
};

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

    const userId = String(data?.user?.id);
	await initProviders(userId);
    await applyPendingMigrations(userId)

	if (data) {
		redirect("/dashboard/platform/overview");
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
