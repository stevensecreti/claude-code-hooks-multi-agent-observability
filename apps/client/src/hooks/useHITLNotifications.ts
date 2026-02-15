import { useState, useCallback } from "react";
import type { HookEvent } from "../types";

export function useHITLNotifications() {
	const [hasPermission, setHasPermission] = useState(false);

	const requestPermission = useCallback(async () => {
		if ("Notification" in window) {
			const permission = await Notification.requestPermission();
			setHasPermission(permission === "granted");
		}
	}, []);

	const notifyHITLRequest = useCallback((event: HookEvent) => {
		if (!hasPermission || !event.humanInTheLoop) return;

		const notification = new Notification("Agent Needs Your Input", {
			body: event.humanInTheLoop.question.slice(0, 100),
			icon: "/vite.svg",
			tag: `hitl-${event.id}`,
			requireInteraction: true,
		});

		notification.onclick = () => {
			window.focus();
			notification.close();
		};
	}, [hasPermission]);

	return {
		hasPermission,
		requestPermission,
		notifyHITLRequest,
	};
}
