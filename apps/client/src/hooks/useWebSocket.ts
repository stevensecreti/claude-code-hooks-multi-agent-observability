import { useState, useReducer, useRef, useEffect, useCallback } from "react";
import type { HookEvent, WebSocketMessage } from "../types";

const maxEvents = parseInt(import.meta.env.VITE_MAX_EVENTS_TO_DISPLAY || "300");

type EventAction =
  | { type: "SET_INITIAL"; events: HookEvent[] }
  | { type: "ADD_EVENT"; event: HookEvent }
  | { type: "CLEAR" };

interface EventState {
	events: HookEvent[];
}

function eventReducer(state: EventState, action: EventAction): EventState {
	switch (action.type) {
		case "SET_INITIAL":
			return { events: action.events.slice(-maxEvents) };
		case "ADD_EVENT": {
			// Check if event already exists (deduplicate by ID)
			const eventExists = state.events.some((e) => e.id === action.event.id);
			if (eventExists) {
				return state; // Skip duplicate
			}

			const newEvents = [...state.events, action.event];
			if (newEvents.length > maxEvents) {
				return { events: newEvents.slice(newEvents.length - maxEvents + 10) };
			}
			return { events: newEvents };
		}
		case "CLEAR":
			return { events: [] };
		default:
			return state;
	}
}

export function useWebSocket(url: string) {
	const [state, dispatch] = useReducer(eventReducer, { events: [] });
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<number | null>(null);

	const disconnect = useCallback(() => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}
		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}
	}, []);

	useEffect(() => {
		function connect() {
			try {
				const ws = new WebSocket(url);
				wsRef.current = ws;

				ws.onopen = () => {
					setIsConnected(true);
					setError(null);
				};

				ws.onmessage = (event) => {
					try {
						const message: WebSocketMessage = JSON.parse(event.data);
						if (message.type === "initial") {
							const initialEvents = Array.isArray(message.data) ? message.data as HookEvent[] : [];
							dispatch({ type: "SET_INITIAL", events: initialEvents });
						} else if (message.type === "event") {
							const newEvent = message.data as HookEvent;
							dispatch({ type: "ADD_EVENT", event: newEvent });
						}
					} catch (err) {
						console.error("Failed to parse WebSocket message:", err);
					}
				};

				ws.onerror = () => {
					setError("WebSocket connection error");
				};

				ws.onclose = () => {
					setIsConnected(false);
					reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
				};
			} catch (err) {
				console.error("Failed to connect:", err);
				setError("Failed to connect to server");
			}
		}

		connect();
		return () => {
			disconnect();
		};
	}, [url, disconnect]);

	const clearEvents = useCallback(() => {
		dispatch({ type: "CLEAR" });
	}, []);

	return {
		events: state.events,
		isConnected,
		error,
		clearEvents,
	};
}
