import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import type { HookEvent, ChartDataPoint, TimeRange } from "../types";

const TIME_RANGE_CONFIG = {
	"1m": { duration: 60_000, bucketSize: 1_000, maxPoints: 60 },
	"3m": { duration: 180_000, bucketSize: 3_000, maxPoints: 60 },
	"5m": { duration: 300_000, bucketSize: 5_000, maxPoints: 60 },
	"10m": { duration: 600_000, bucketSize: 10_000, maxPoints: 60 },
} as const;

function parseAgentId(agentId: string): { app: string; session: string } | null {
	const parts = agentId.split(":");
	return parts.length === 2 ? { app: parts[0], session: parts[1] } : null;
}

function createAgentId(sourceApp: string, sessionId: string): string {
	return `${sourceApp}:${sessionId.slice(0, 8)}`;
}

export function useChartData(agentIdFilter?: string) {
	const [timeRange, setTimeRangeState] = useState<TimeRange>("1m");
	const [dataPoints, setDataPoints] = useState<ChartDataPoint[]>([]);
	const allEventsRef = useRef<HookEvent[]>([]);
	const eventBufferRef = useRef<HookEvent[]>([]);
	const debounceTimerRef = useRef<number | null>(null);
	const cleanupIntervalRef = useRef<number | null>(null);
	const agentIdParsed = agentIdFilter ? parseAgentId(agentIdFilter) : null;

	const currentConfig = useMemo(() => TIME_RANGE_CONFIG[timeRange], [timeRange]);

	const getBucketTimestamp = useCallback(
		(timestamp: number): number => Math.floor(timestamp / currentConfig.bucketSize) * currentConfig.bucketSize,
		[currentConfig.bucketSize],
	);

	const cleanOldData = useCallback(
		(points: ChartDataPoint[]): ChartDataPoint[] => {
			const cutoff = Date.now() - currentConfig.duration;
			let cleaned = points.filter((dp) => dp.timestamp >= cutoff);
			if (cleaned.length > currentConfig.maxPoints) {
				cleaned = cleaned.slice(-currentConfig.maxPoints);
			}
			return cleaned;
		},
		[currentConfig.duration, currentConfig.maxPoints],
	);

	const cleanOldEvents = useCallback(() => {
		const cutoff = Date.now() - 600_000; // 10 min max
		allEventsRef.current = allEventsRef.current.filter(
			(e) => e.timestamp && e.timestamp >= cutoff,
		);
	}, []);

	const processEventBuffer = useCallback(() => {
		const events = [...eventBufferRef.current];
		eventBufferRef.current = [];
		allEventsRef.current.push(...events);

		setDataPoints((prev) => {
			const updated = [...prev];

			events.forEach((event) => {
				if (!event.timestamp) return;
				if (agentIdParsed) {
					if (event.source_app !== agentIdParsed.app) return;
					if (event.session_id.slice(0, 8) !== agentIdParsed.session) return;
				}

				const bucketTime = getBucketTimestamp(event.timestamp);
				const bucket = updated.find((dp) => dp.timestamp === bucketTime);

				if (bucket) {
					bucket.count++;
					bucket.eventTypes[event.hook_event_type] =
						(bucket.eventTypes[event.hook_event_type] || 0) + 1;
					if (event.payload?.tool_name) {
						if (!bucket.toolEvents) bucket.toolEvents = {};
						const key = `${event.hook_event_type}:${event.payload.tool_name}`;
						bucket.toolEvents[key] = (bucket.toolEvents[key] || 0) + 1;
					}
					if (!bucket.sessions) bucket.sessions = {};
					bucket.sessions[event.session_id] =
						(bucket.sessions[event.session_id] || 0) + 1;
				} else {
					const toolEvents: Record<string, number> = {};
					if (event.payload?.tool_name) {
						toolEvents[`${event.hook_event_type}:${event.payload.tool_name}`] = 1;
					}
					updated.push({
						timestamp: bucketTime,
						count: 1,
						eventTypes: { [event.hook_event_type]: 1 },
						toolEvents,
						sessions: { [event.session_id]: 1 },
					});
				}
			});

			const cleaned = cleanOldData(updated);
			cleanOldEvents();
			return cleaned;
		});
	}, [agentIdParsed, getBucketTimestamp, cleanOldData, cleanOldEvents]);

	const addEvent = useCallback(
		(event: HookEvent) => {
			eventBufferRef.current.push(event);
			if (debounceTimerRef.current !== null) {
				clearTimeout(debounceTimerRef.current);
			}
			debounceTimerRef.current = window.setTimeout(() => {
				processEventBuffer();
				debounceTimerRef.current = null;
			}, 50);
		},
		[processEventBuffer],
	);

	const getChartData = useCallback((): ChartDataPoint[] => {
		const now = Date.now();
		const startTime = now - currentConfig.duration;
		const buckets: ChartDataPoint[] = [];

		for (let time = startTime; time <= now; time += currentConfig.bucketSize) {
			const bucketTime =
				Math.floor(time / currentConfig.bucketSize) * currentConfig.bucketSize;
			const existing = dataPoints.find((dp) => dp.timestamp === bucketTime);
			buckets.push({
				timestamp: bucketTime,
				count: existing?.count || 0,
				eventTypes: existing?.eventTypes || {},
				toolEvents: existing?.toolEvents || {},
				sessions: existing?.sessions || {},
			});
		}

		return buckets.slice(-currentConfig.maxPoints);
	}, [dataPoints, currentConfig]);

	const reaggregateData = useCallback(
		(range: TimeRange) => {
			const config = TIME_RANGE_CONFIG[range];
			const cutoff = Date.now() - config.duration;

			let relevant = allEventsRef.current.filter(
				(e) => e.timestamp && e.timestamp >= cutoff,
			);
			if (agentIdParsed) {
				relevant = relevant.filter(
					(e) =>
						e.source_app === agentIdParsed.app &&
            e.session_id.slice(0, 8) === agentIdParsed.session,
				);
			}

			const newPoints: ChartDataPoint[] = [];
			relevant.forEach((event) => {
				if (!event.timestamp) return;
				const bucketTime =
					Math.floor(event.timestamp / config.bucketSize) * config.bucketSize;

				const bucket = newPoints.find((dp) => dp.timestamp === bucketTime);
				if (bucket) {
					bucket.count++;
					bucket.eventTypes[event.hook_event_type] =
						(bucket.eventTypes[event.hook_event_type] || 0) + 1;
					if (event.payload?.tool_name) {
						if (!bucket.toolEvents) bucket.toolEvents = {};
						const key = `${event.hook_event_type}:${event.payload.tool_name}`;
						bucket.toolEvents[key] = (bucket.toolEvents[key] || 0) + 1;
					}
					bucket.sessions[event.session_id] =
						(bucket.sessions[event.session_id] || 0) + 1;
				} else {
					const toolEvents: Record<string, number> = {};
					if (event.payload?.tool_name) {
						toolEvents[`${event.hook_event_type}:${event.payload.tool_name}`] = 1;
					}
					newPoints.push({
						timestamp: bucketTime,
						count: 1,
						eventTypes: { [event.hook_event_type]: 1 },
						toolEvents,
						sessions: { [event.session_id]: 1 },
					});
				}
			});

			setDataPoints(newPoints);
		},
		[agentIdParsed],
	);

	const setTimeRange = useCallback(
		(range: TimeRange) => {
			setTimeRangeState(range);
			reaggregateData(range);
		},
		[reaggregateData],
	);

	const clearData = useCallback(() => {
		setDataPoints([]);
		allEventsRef.current = [];
		eventBufferRef.current = [];
		if (debounceTimerRef.current !== null) {
			clearTimeout(debounceTimerRef.current);
			debounceTimerRef.current = null;
		}
	}, []);

	// Unique agent IDs within current time window
	const uniqueAgentIdsInWindow = useMemo(() => {
		const cutoff = Date.now() - currentConfig.duration;
		const agents = new Set<string>();
		allEventsRef.current.forEach((e) => {
			if (e.timestamp && e.timestamp >= cutoff) {
				agents.add(createAgentId(e.source_app, e.session_id));
			}
		});
		return Array.from(agents);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentConfig.duration, dataPoints]);

	// All unique agent IDs ever seen
	const allUniqueAgentIds = useMemo(() => {
		const agents = new Set<string>();
		allEventsRef.current.forEach((e) => {
			agents.add(createAgentId(e.source_app, e.session_id));
		});
		return Array.from(agents);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dataPoints]);

	const uniqueAgentCount = uniqueAgentIdsInWindow.length;

	const toolCallCount = useMemo(
		() =>
			dataPoints.reduce(
				(sum, dp) => sum + (dp.eventTypes?.["PreToolUse"] || 0),
				0,
			),
		[dataPoints],
	);

	const eventTimingMetrics = useMemo(() => {
		const cutoff = Date.now() - currentConfig.duration;
		const windowEvents = allEventsRef.current
			.filter((e) => e.timestamp && e.timestamp >= cutoff)
			.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

		if (windowEvents.length < 2) return { minGap: 0, maxGap: 0, avgGap: 0 };

		const gaps: number[] = [];
		for (let i = 1; i < windowEvents.length; i++) {
			const gap =
				(windowEvents[i].timestamp || 0) - (windowEvents[i - 1].timestamp || 0);
			if (gap > 0) gaps.push(gap);
		}
		if (gaps.length === 0) return { minGap: 0, maxGap: 0, avgGap: 0 };

		return {
			minGap: Math.min(...gaps),
			maxGap: Math.max(...gaps),
			avgGap: gaps.reduce((a, b) => a + b, 0) / gaps.length,
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentConfig.duration, dataPoints]);

	// Auto-clean old data every second
	useEffect(() => {
		cleanupIntervalRef.current = window.setInterval(() => {
			setDataPoints((prev) => cleanOldData(prev));
			cleanOldEvents();
		}, 1000);

		return () => {
			if (cleanupIntervalRef.current !== null) {
				clearInterval(cleanupIntervalRef.current);
			}
			if (debounceTimerRef.current !== null) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, [cleanOldData, cleanOldEvents]);

	return {
		timeRange,
		dataPoints,
		addEvent,
		getChartData,
		setTimeRange,
		clearData,
		uniqueAgentCount,
		uniqueAgentIdsInWindow,
		allUniqueAgentIds,
		toolCallCount,
		eventTimingMetrics,
	};
}
