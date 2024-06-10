"use client";
import JsonView from "@uiw/react-json-view";

export default function Wrapper({ value }: { value: any }) {
	return <JsonView value={value}></JsonView>;
}
