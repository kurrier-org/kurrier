import {
	S3Client,
	HeadBucketCommand,
	CreateBucketCommand,
	PutPublicAccessBlockCommand,
	ListObjectsV2Command,
	DeleteObjectCommand,
	DeleteObjectsCommand,
	GetObjectCommand,
	PutObjectCommand,
	PutBucketCorsCommand,
} from "@aws-sdk/client-s3";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { z } from "zod";
import type {
	AddBucketResult,
	AddFolderResult,
	DeleteEntryResult,
	DownloadResult,
	ListPathEntry,
	ListPathResult,
	StorageProvider,
	UploadUrlResult,
	VerifyResult,
} from "../core";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const RawS3ConfigSchema = z
	.object({
		S3_ACCESS_KEY_ID: z.string(),
		S3_SECRET_ACCESS_KEY: z.string(),
		S3_REGION: z.string(),
	})
	.transform((r) => ({
		accessKeyId: r.S3_ACCESS_KEY_ID,
		secretAccessKey: r.S3_SECRET_ACCESS_KEY,
		region: r.S3_REGION,
	}));

type S3Config = z.infer<typeof RawS3ConfigSchema>;

const BucketNameSchema = z
	.string()
	.trim()
	.min(3)
	.max(63)
	.regex(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/)
	.refine((s) => !s.includes(".."), "Bucket name cannot contain '..'")
	.refine((s) => !s.includes(".-") && !s.includes("-."), "Invalid bucket name");

type HeadBucketStrictResult = { exists: boolean };

export class S3Store implements StorageProvider {
	private cfg: S3Config;
	private s3: S3Client;
	private sts: STSClient;

	private constructor(cfg: S3Config) {
		this.cfg = cfg;

		const shared = {
			region: cfg.region,
			credentials: {
				accessKeyId: cfg.accessKeyId,
				secretAccessKey: cfg.secretAccessKey,
			},
		};

		this.s3 = new S3Client(shared);
		this.sts = new STSClient(shared);
	}

	static from(raw: unknown): S3Store {
		const cfg = RawS3ConfigSchema.parse(raw);
		return new S3Store(cfg);
	}

	async verify(
		id: string,
		metaData?: Record<string, any>,
	): Promise<VerifyResult> {
		try {
			const ident = await this.sts.send(new GetCallerIdentityCommand({}));

			const bucket = metaData?.bucket ? String(metaData.bucket) : "";
			if (bucket) {
				await this.s3.send(new HeadBucketCommand({ Bucket: bucket }));
			}

			return {
				ok: true,
				message: "OK",
				meta: {
					region: this.cfg.region,
					accountId: ident.Account,
					arn: ident.Arn,
					bucketChecked: bucket || null,
					providerId: id,
					store: true,
				},
			};
		} catch (err: any) {
			return {
				ok: false,
				message: err?.message ?? "S3 verify failed",
				meta: {
					code: err?.name,
					httpStatus: err?.$metadata?.httpStatusCode,
				},
			};
		}
	}

	async addBucket(
		id: string,
		input: { bucket: string; makePublicBlocked?: boolean },
	): Promise<AddBucketResult> {
		const makePublicBlocked = input.makePublicBlocked ?? true;

		let bucket = "";
		try {
			bucket = BucketNameSchema.parse(
				String(input.bucket ?? "")
					.trim()
					.toLowerCase(),
			);

			const head = await this.headBucketStrict(bucket);

			if (head.exists) {
				if (makePublicBlocked) {
					await this.ensurePublicAccessBlocked(bucket);
				}
				await this.ensureCors(bucket);
				return {
					ok: true,
					message: "Bucket already exists",
					meta: {
						providerId: id,
						bucket,
						region: this.cfg.region,
						created: false,
						publicAccessBlocked: makePublicBlocked,
						cloudProvider: "s3",
					},
				};
			}

			await this.s3.send(
				new CreateBucketCommand(
					this.cfg.region === "us-east-1"
						? { Bucket: bucket }
						: {
								Bucket: bucket,
								CreateBucketConfiguration: {
									LocationConstraint: this.cfg.region as any,
								},
							},
				),
			);

			if (makePublicBlocked) {
				await this.ensurePublicAccessBlocked(bucket);
			}
			await this.ensureCors(bucket);
			return {
				ok: true,
				message: "Bucket created",
				meta: {
					providerId: id,
					bucket,
					region: this.cfg.region,
					created: true,
					publicAccessBlocked: makePublicBlocked,
					cloudProvider: "s3",
				},
			};
		} catch (e: any) {
			const status = e?.httpStatus || e?.$metadata?.httpStatusCode;
			const bucketRegion = e?.bucketRegion || this.getBucketRegionFromError(e);
			const code = e?.code || e?.name || e?.Code || "Unknown";

			let message = e?.message || "Failed to add bucket";

			if (code === "BucketRegionMismatch") {
				message =
					e?.message ||
					`Bucket exists in region ${bucketRegion}. Provider is set to ${this.cfg.region}.`;
			}

			if (code === "BucketAlreadyExists") {
				message = "Bucket name is already taken globally.";
			}

			return {
				ok: false,
				message,
				meta: {
					providerId: id,
					bucket: bucket || input?.bucket,
					code,
					httpStatus: status,
					bucketRegion,
					providerRegion: this.cfg.region,
				},
			};
		}
	}

	async listPath(
		id: string,
		input: {
			bucket: string;
			path?: string;
			maxKeys?: number;
			continuationToken?: string | null;
		},
	): Promise<ListPathResult> {
		const bucketRaw = input?.bucket;
		if (typeof bucketRaw !== "string" || bucketRaw.trim().length === 0) {
			return {
				ok: false,
				message: "Bucket is required",
				meta: { providerId: id, code: "BucketMissing" },
			};
		}

		const bucket = BucketNameSchema.parse(bucketRaw.trim().toLowerCase());

		const uiPath = typeof input.path === "string" ? input.path : "/";
		const normalizedPath = this.normalizeUiPath(uiPath);
		const prefix = this.uiPathToPrefix(normalizedPath);

		try {
			const res = await this.s3.send(
				new ListObjectsV2Command({
					Bucket: bucket,
					Prefix: prefix,
					Delimiter: "/",
					MaxKeys: input.maxKeys ?? 200,
					ContinuationToken: input.continuationToken ?? undefined,
				}),
			);

			const folders: ListPathEntry[] = (res.CommonPrefixes ?? [])
				.map((cp) => cp.Prefix)
				.filter((p): p is string => !!p)
				.map((p) => {
					const name = this.lastSegment(p.slice(0, -1));
					return {
						type: "folder",
						name,
						path: this.prefixToUiPath(p),
					};
				});

			const files: ListPathEntry[] = (res.Contents ?? [])
				.filter((o) => !!o.Key)
				.filter((o) => o.Key !== prefix)
				.map((o) => {
					const key = o.Key as string;
					return {
						type: "file",
						name: this.lastSegment(key),
						path: this.prefixToUiPath(key),
						sizeBytes: typeof o.Size === "number" ? o.Size : undefined,
						etag: o.ETag ?? null,
						lastModified: o.LastModified ? o.LastModified.toISOString() : null,
					};
				});

			const entries = [...folders, ...files].sort((a, b) => {
				if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
				return a.name.localeCompare(b.name);
			});

			return {
				ok: true,
				message: "OK",
				meta: {
					providerId: id,
					region: this.cfg.region,
					store: true,
				},
				data: {
					bucket,
					path: normalizedPath,
					prefix,
					entries,
					nextToken: res.IsTruncated
						? (res.NextContinuationToken ?? null)
						: null,
				},
			};
		} catch (e: any) {
			return {
				ok: false,
				message: e?.message || "Failed to list path",
				meta: {
					providerId: id,
					bucket,
					path: normalizedPath,
					prefix,
					code: e?.name || e?.Code || "Unknown",
					httpStatus: e?.$metadata?.httpStatusCode,
					providerRegion: this.cfg.region,
					bucketRegion: this.getBucketRegionFromError(e),
				},
			};
		}
	}

	async deleteEntry(
		id: string,
		input: { bucket: string; path: string; type: "file" | "folder" },
	): Promise<DeleteEntryResult> {
		const bucket = BucketNameSchema.parse(
			String(input.bucket ?? "")
				.trim()
				.toLowerCase(),
		);
		const uiPath = String(input.path ?? "/");
		const type = input.type;

		try {
			if (type === "file") {
				const key = this.uiPathToKey(uiPath);
				if (!key)
					return {
						ok: false,
						message: "Invalid file path",
						meta: { providerId: id, bucket, path: uiPath },
					};

				await this.s3.send(
					new DeleteObjectCommand({ Bucket: bucket, Key: key }),
				);
				return {
					ok: true,
					message: "Deleted",
					meta: { providerId: id, bucket, key },
				};
			}

			const prefix = this.folderUiPathToPrefix(uiPath);
			if (!prefix)
				return {
					ok: false,
					message: "Invalid folder path",
					meta: { providerId: id, bucket, path: uiPath },
				};

			let deleted = 0;
			let token: string | undefined;

			for (;;) {
				const res = await this.s3.send(
					new ListObjectsV2Command({
						Bucket: bucket,
						Prefix: prefix,
						ContinuationToken: token,
						MaxKeys: 1000,
					}),
				);

				const keys = (res.Contents ?? [])
					.map((o) => o.Key)
					.filter((k): k is string => !!k);

				if (keys.length) {
					for (let i = 0; i < keys.length; i += 1000) {
						const batch = keys.slice(i, i + 1000);
						await this.s3.send(
							new DeleteObjectsCommand({
								Bucket: bucket,
								Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
							}),
						);
						deleted += batch.length;
					}
				}

				if (!res.IsTruncated) break;
				token = res.NextContinuationToken;
			}

			return {
				ok: true,
				message: "Folder deleted",
				meta: { providerId: id, bucket, prefix, deleted },
			};
		} catch (e: any) {
			return {
				ok: false,
				message: e?.message || "Failed to delete",
				meta: {
					providerId: id,
					bucket,
					path: uiPath,
					code: e?.name || e?.Code || "Unknown",
					httpStatus: e?.$metadata?.httpStatusCode,
					providerRegion: this.cfg.region,
					bucketRegion: this.getBucketRegionFromError(e),
				},
			};
		}
	}

	async downloadUrl(
		id: string,
		input: { bucket: string; path: string; expiresIn?: number },
	): Promise<DownloadResult> {
		const bucket = BucketNameSchema.parse(
			String(input.bucket ?? "")
				.trim()
				.toLowerCase(),
		);
		const uiPath = String(input.path ?? "");
		const key = this.uiPathToKey(uiPath);
		const expiresIn = Math.max(
			10,
			Math.min(Number(input.expiresIn ?? 60), 3600),
		);

		if (!key) {
			return {
				ok: false,
				message: "Invalid file path",
				meta: { providerId: id, bucket, path: uiPath },
			};
		}

		const fallbackName = key.split("/").filter(Boolean).pop() || "download";
		const filename = String(fallbackName);
		const safeFilename = filename.replace(/[\r\n"]/g, "");
		const contentDisposition = `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;

		try {
			const url = await getSignedUrl(
				this.s3,
				new GetObjectCommand({
					Bucket: bucket,
					Key: key,
					ResponseContentDisposition: contentDisposition,
				}),
				{ expiresIn },
			);

			return {
				ok: true,
				message: "OK",
				meta: { providerId: id, bucket, key, expiresIn },
				data: { url, expiresIn },
			};
		} catch (e: any) {
			return {
				ok: false,
				message: e?.message || "Failed to generate download URL",
				meta: {
					providerId: id,
					bucket,
					key,
					code: e?.name || e?.Code || "Unknown",
					httpStatus: e?.$metadata?.httpStatusCode,
				},
			};
		}
	}

	async uploadUrl(
		id: string,
		input: {
			bucket: string;
			path: string;
			expiresIn?: number;
			contentType?: string | null;
			cacheControl?: string | null;
			contentDisposition?: string | null;
			metadata?: Record<string, string> | null;
		},
	): Promise<UploadUrlResult> {
		const bucket = BucketNameSchema.parse(
			String(input.bucket ?? "")
				.trim()
				.toLowerCase(),
		);
		const uiPath = String(input.path ?? "");
		const key = this.uiPathToKey(uiPath);
		const expiresIn = Math.max(
			10,
			Math.min(Number(input.expiresIn ?? 60), 3600),
		);

		if (!key) {
			return {
				ok: false,
				message: "Invalid file path",
				meta: { providerId: id, bucket, path: uiPath },
			};
		}

		const contentType = input.contentType
			? String(input.contentType)
			: "application/octet-stream";
		const cacheControl = input.cacheControl
			? String(input.cacheControl)
			: undefined;
		const contentDisposition = input.contentDisposition
			? String(input.contentDisposition)
			: undefined;

		const meta = input.metadata
			? Object.fromEntries(
					Object.entries(input.metadata).map(([k, v]) => [
						String(k).toLowerCase(),
						String(v),
					]),
				)
			: undefined;

		try {
			const cmd = new PutObjectCommand({
				Bucket: bucket,
				Key: key,
				ContentType: contentType,
				CacheControl: cacheControl,
				ContentDisposition: contentDisposition,
				Metadata: meta,
			});

			const url = await getSignedUrl(this.s3, cmd, { expiresIn });

			const headers: Record<string, string> = {
				"content-type": contentType,
			};

			if (cacheControl) headers["cache-control"] = cacheControl;
			if (contentDisposition)
				headers["content-disposition"] = contentDisposition;

			return {
				ok: true,
				message: "OK",
				meta: { providerId: id, bucket, key, expiresIn },
				data: { url, expiresIn, method: "PUT", headers },
			};
		} catch (e: any) {
			return {
				ok: false,
				message: e?.message || "Failed to generate upload URL",
				meta: {
					providerId: id,
					bucket,
					key,
					code: e?.name || e?.Code || "Unknown",
					httpStatus: e?.$metadata?.httpStatusCode,
				},
			};
		}
	}

	async addFolder(
		id: string,
		input: { bucket: string; path: string },
	): Promise<AddFolderResult> {
		const bucket = BucketNameSchema.parse(
			String(input.bucket ?? "")
				.trim()
				.toLowerCase(),
		);
		const uiPath = String(input.path ?? "/");
		const normalized = this.normalizeUiPath(uiPath);
		const prefix = this.uiPathToPrefix(normalized);

		if (!prefix) {
			return {
				ok: false,
				message: "Invalid folder path",
				meta: { providerId: id, bucket, path: uiPath },
			};
		}

		try {
			await this.s3.send(
				new PutObjectCommand({
					Bucket: bucket,
					Key: prefix.endsWith("/") ? prefix : `${prefix}/`,
					Body: new Uint8Array(0),
					ContentType: "application/x-directory",
				}),
			);

			return {
				ok: true,
				message: "Folder created",
				meta: { providerId: id, bucket, region: this.cfg.region },
				data: {
					bucket,
					path: normalized,
					prefix: prefix.endsWith("/") ? prefix : `${prefix}/`,
				},
			};
		} catch (e: any) {
			return {
				ok: false,
				message: e?.message || "Failed to create folder",
				meta: {
					providerId: id,
					bucket,
					path: normalized,
					prefix,
					code: e?.name || e?.Code || "Unknown",
					httpStatus: e?.$metadata?.httpStatusCode,
					providerRegion: this.cfg.region,
					bucketRegion: this.getBucketRegionFromError(e),
				},
			};
		}
	}

	private buildDefaultCorsOrigins() {
		const out: string[] = [];

		out.push("http://localhost");
		out.push("http://localhost:3000");

		const webUrl = process.env.WEB_URL
			? String(process.env.WEB_URL).trim()
			: "";
		if (webUrl) {
			try {
				out.push(new URL(webUrl).origin);
			} catch {
				out.push(webUrl);
			}
		}

		return Array.from(new Set(out)).filter(Boolean);
	}

	private async ensureCors(bucket: string) {
		const origins = this.buildDefaultCorsOrigins();

		await this.s3.send(
			new PutBucketCorsCommand({
				Bucket: bucket,
				CORSConfiguration: {
					CORSRules: [
						{
							AllowedOrigins: origins,
							AllowedMethods: ["GET", "PUT", "POST", "HEAD", "DELETE"],
							AllowedHeaders: ["*"],
							ExposeHeaders: ["ETag", "x-amz-checksum-crc32"],
							MaxAgeSeconds: 3000,
						},
					],
				},
			}),
		);
	}

	private uiPathToKey(uiPath: string) {
		const p = typeof uiPath === "string" ? uiPath.trim() : "/";
		if (!p || p === "/") return "";
		return p.replace(/^\/+/, "");
	}

	private folderUiPathToPrefix(uiPath: string) {
		const n = this.normalizeUiPath(uiPath);
		return this.uiPathToPrefix(n);
	}

	private normalizeUiPath(p: string) {
		const s = p.trim();
		if (!s || s === "/") return "/";
		const noLeading = s.replace(/^\/+/, "");
		const noTrailing = noLeading.replace(/\/+$/, "");
		return `/${noTrailing}/`;
	}

	private uiPathToPrefix(uiPath: string) {
		if (uiPath === "/") return "";
		return uiPath.replace(/^\/+/, "");
	}

	private prefixToUiPath(prefix: string) {
		if (!prefix) return "/";
		return `/${prefix}`;
	}

	private lastSegment(s: string) {
		const parts = s.split("/").filter(Boolean);
		return parts.length ? parts[parts.length - 1] : s;
	}

	private getBucketRegionFromError(e: any) {
		return (
			e?.$response?.headers?.["x-amz-bucket-region"] || e?.BucketRegion || null
		);
	}

	private isNotFound(e: any) {
		const s = e?.$metadata?.httpStatusCode;
		const c = e?.name || e?.Code;
		return s === 404 || c === "NotFound" || c === "NoSuchBucket";
	}

	private async headBucketStrict(
		bucket: string,
	): Promise<HeadBucketStrictResult> {
		try {
			await this.s3.send(new HeadBucketCommand({ Bucket: bucket }));
			return { exists: true };
		} catch (e: any) {
			const status = e?.$metadata?.httpStatusCode;
			const bucketRegion = this.getBucketRegionFromError(e);

			if (this.isNotFound(e)) return { exists: false };

			if (status === 301 && bucketRegion) {
				throw {
					code: "BucketRegionMismatch",
					message: `Bucket exists in region ${bucketRegion}. Provider is set to ${this.cfg.region}.`,
					bucketRegion,
					providerRegion: this.cfg.region,
					httpStatus: 301,
				};
			}

			throw e;
		}
	}

	private async ensurePublicAccessBlocked(bucket: string) {
		await this.s3.send(
			new PutPublicAccessBlockCommand({
				Bucket: bucket,
				PublicAccessBlockConfiguration: {
					BlockPublicAcls: true,
					IgnorePublicAcls: true,
					BlockPublicPolicy: true,
					RestrictPublicBuckets: true,
				},
			}),
		);
	}
}
