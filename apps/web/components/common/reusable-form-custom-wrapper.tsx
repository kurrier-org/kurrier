import React, { useState, useEffect } from "react";

function ReusableFormCustomWrapper({
	component,
	...rest
}: {
	component: React.ElementType;
	[key: string]: any;
}) {
	const Component = component;

	const [value, setValue] = useState(rest.defaultValue ?? "");

	useEffect(() => {
		if (rest.defaultValue !== undefined) {
			setValue(rest.defaultValue);
		}
	}, [rest.defaultValue]);

	return (
		<>
			<Component {...rest} value={value} onChange={(v: any) => setValue(v)} />

			<input type="hidden" value={value} name={rest.name} />
		</>
	);
}

export default ReusableFormCustomWrapper;
