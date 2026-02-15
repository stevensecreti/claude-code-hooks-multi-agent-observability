import { useState, useCallback, useMemo } from "react";
import type { HookEvent } from "../types";

function validateRegex(pattern: string): { valid: boolean; error?: string } {
	if (!pattern || pattern.trim() === "") {
		return { valid: true };
	}

	try {
		new RegExp(pattern);
		return { valid: true };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Invalid regex pattern";
		return { valid: false, error: errorMessage };
	}
}

function getSearchableText(event: HookEvent): string {
	const parts: string[] = [];

	if (event.hook_event_type) {
		parts.push(event.hook_event_type);
	}

	if (event.source_app) {
		parts.push(event.source_app);
	}
	if (event.session_id) {
		parts.push(event.session_id);
	}

	if (event.payload.model && typeof event.payload.model === "string") {
		parts.push(event.payload.model);
	}

	if (event.payload.tool_name && typeof event.payload.tool_name === "string") {
		parts.push(event.payload.tool_name);
	}
	if (event.payload.tool_command && typeof event.payload.tool_command === "string") {
		parts.push(event.payload.tool_command);
	}
	if (
		event.payload.tool_file &&
		typeof event.payload.tool_file === "object" &&
		event.payload.tool_file !== null &&
		"path" in event.payload.tool_file &&
		typeof event.payload.tool_file.path === "string"
	) {
		parts.push(event.payload.tool_file.path);
	}

	if (event.summary) {
		parts.push(event.summary);
	}

	if (event.payload.hitl_question && typeof event.payload.hitl_question === "string") {
		parts.push(event.payload.hitl_question);
	}
	if (event.payload.hitl_permission && typeof event.payload.hitl_permission === "string") {
		parts.push(event.payload.hitl_permission);
	}

	return parts.join(" ").toLowerCase();
}

function matchesPattern(event: HookEvent, pattern: string): boolean {
	if (!pattern || pattern.trim() === "") {
		return true;
	}

	const validation = validateRegex(pattern);
	if (!validation.valid) {
		return false;
	}

	try {
		const regex = new RegExp(pattern, "i");
		const searchableText = getSearchableText(event);
		return regex.test(searchableText);
	} catch {
		return false;
	}
}

function searchEvents(events: HookEvent[], pattern: string): HookEvent[] {
	if (!pattern || pattern.trim() === "") {
		return events;
	}

	return events.filter((event) => matchesPattern(event, pattern));
}

export function useEventSearch() {
	const [searchPattern, setSearchPattern] = useState<string>("");
	const [searchError, setSearchError] = useState<string>("");

	const hasError = useMemo(() => searchError.length > 0, [searchError]);

	const updateSearchPattern = useCallback((pattern: string) => {
		setSearchPattern(pattern);

		if (!pattern || pattern.trim() === "") {
			setSearchError("");
			return;
		}

		const validation = validateRegex(pattern);
		if (!validation.valid) {
			setSearchError(validation.error || "Invalid regex pattern");
		} else {
			setSearchError("");
		}
	}, []);

	const clearSearch = useCallback(() => {
		setSearchPattern("");
		setSearchError("");
	}, []);

	return {
		searchPattern,
		searchError,
		hasError,
		validateRegex,
		matchesPattern,
		searchEvents,
		updateSearchPattern,
		clearSearch,
		getSearchableText,
	};
}
