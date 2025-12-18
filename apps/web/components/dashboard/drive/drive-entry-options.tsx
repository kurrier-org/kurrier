import React from "react";
import { DriveEntryEntity } from "@db";
import { Download, Trash } from "lucide-react";
import { deletePath, fetchDownloadLink } from "@/lib/actions/drive";
import { ReusableFormButton } from "@/components/common/reusable-form-button";

function DriveEntryOptions({ entry }: { entry: DriveEntryEntity }) {
	return (
		<>
			<div className={"flex gap-2 absolute right-3 top-3 z-50"}>
				{entry.type === "file" && (
					<ReusableFormButton
						action={fetchDownloadLink}
						actionIcon={true}
						onSuccess={(data: { downloadUrl: string }) => {
							console.log("download data", data);
							if (data?.downloadUrl) {
								window.open(data.downloadUrl);
							}
						}}
						actionIconProps={{
							size: "xs",
							variant: "subtle",
							children: <Download size={12} />,
							title: "Download",
						}}
					>
						<input type="hidden" name="entryId" value={entry.id} />
					</ReusableFormButton>
				)}

				<ReusableFormButton
					action={deletePath}
					actionIcon={true}
					actionIconProps={{
						size: "xs",
						variant: "subtle",
						children: <Trash size={12} />,
						title: "Delete",
					}}
				>
					<input type="hidden" name="entryId" value={entry.id} />
				</ReusableFormButton>
			</div>
		</>
	);
}

export default DriveEntryOptions;
