import React from "react";
import { LoaderCircle } from "lucide-react";

const Loading = (props: {
	loadingClassNames?: string;
	wrapperClassNames?: string;
}) => {
	return (
		<div
			className={`h-full min-h-screen flex justify-center items-center w-full ${props.wrapperClassNames}`}
		>
			<LoaderCircle
				className={`animate-spin text-brand-foreground w-8 h-8 ${props.loadingClassNames}`}
			/>
		</div>
	);
};

export default Loading;
