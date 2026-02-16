import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { HookEvent, ChartDataPoint, TimeRange } from "../types";
import { API_BASE_URL } from "../config";

const TIME_RANGE_CONFIG = {
	"1m": { duration: 60_000, bucketSize: 1_000, maxPoints: 60 },
	"3m": { duration: 180_000, bucketSize: 3_000, maxPoints: 60 },
	"5m": { duration: 300_000, bucketSize: 5_000, maxPoints: 60 },
	"10m": { duration: 600_000, bucketSize: 10_000, maxPoints: 60 },
} as const;

export function useChartData(agentIdFilter?: string) {
	const [timeRange, setTimeRangeState] = useState<TimeRange>("1m");
	const [dataPoints, setDataPoints] = useState<ChartDataPoint[]>([]);
	const pollIntervalRef = useRef<number | null>(null);

	const currentConfig = useMemo(() => TIME_RANGE_CONFIG[timeRange], [timeRange]);

	const fetchChartData = useCallback(
		async (range: TimeRange) => {
			try {
				const params = new URLSearchParams({ range });
				if (agentIdFilter) {
					params.set("agentId", agentIdFilter);
				}
				const res = await fetch(`${API_BASE_URL}/api/chart-data?${params}`);
				if (!res.ok) return;
				const json = await res.json();
				setDataPoints(json.dataPoints || []);
			} catch {
				// Silently ignore fetch errors (server may be restarting)
			}
		},
		[agentIdFilter],
	);

	// Poll every 2 seconds
	useEffect(() => {
		fetchChartData(timeRange);
		pollIntervalRef.current = window.setInterval(() => {
			fetchChartData(timeRange);
		}, 2000);

		return () => {
			if (pollIntervalRef.current !== null) {
				clearInterval(pollIntervalRef.current);
			}
		};
	}, [timeRange, fetchChartData]);

	// No-op: chart data comes from server now
	const addEvent = useCallback((_event: HookEvent) => {}, []);

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

	const setTimeRange = useCallback(
		(range: TimeRange) => {
			setTimeRangeState(range);
			fetchChartData(range);
		},
		[fetchChartData],
	);

	const clearData = useCallback(() => {
		setDataPoints([]);
	}, []);

	// Derived metrics from data points
	const uniqueAgentIdsInWindow = useMemo(() => {
		const agents = new Set<string>();
		for (const dp of dataPoints) {
			if (dp.sessions) {
				for (const sid of Object.keys(dp.sessions)) {
					agents.add(sid.slice(0, 8));
				}
			}
		}
		return Array.from(agents);
	}, [dataPoints]);

	const allUniqueAgentIds = useMemo(() => uniqueAgentIdsInWindow, [uniqueAgentIdsInWindow]);

	const uniqueAgentCount = uniqueAgentIdsInWindow.length;

	const toolCallCount = useMemo(
		() =>
			dataPoints.reduce(
				(sum, dp) => sum + (dp.eventTypes?.["PreToolUse"] || 0),
				0,
			),
		[dataPoints],
	);

	const eventTimingMetrics = useMemo(
		() => ({ minGap: 0, maxGap: 0, avgGap: 0 }),
		[],
	);

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
