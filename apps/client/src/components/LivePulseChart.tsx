import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import {
	BarChart,
	Bar,
	XAxis,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from "recharts";
import type { HookEvent, TimeRange, ChartDataPoint } from "../types";
import { useChartData } from "../hooks/useChartData";
import { getHexColorForSession } from "../utils/eventColors";

interface LivePulseChartProps {
	events: HookEvent[]
	filters: { sourceApp: string; sessionId: string; eventType: string }
	onUpdateUniqueApps: (apps: string[]) => void
	onUpdateAllApps: (apps: string[]) => void
	onUpdateTimeRange: (range: TimeRange) => void
}

const TIME_RANGES: TimeRange[] = ["1m", "3m", "5m", "10m"];

function formatGap(gapMs: number): string {
	if (gapMs === 0) return "\u2014";
	if (gapMs < 1000) return `${Math.round(gapMs)}ms`;
	return `${(gapMs / 1000).toFixed(1)}s`;
}

function getDominantSessionColor(point: ChartDataPoint): string {
	if (!point.sessions || Object.keys(point.sessions).length === 0) {
		return "var(--theme-primary)";
	}
	const dominant = Object.entries(point.sessions).reduce((a, b) =>
		b[1] > a[1] ? b : a,
	);
	return getHexColorForSession(dominant[0]);
}

interface TooltipProps {
	active?: boolean;
	payload?: Array<{
		payload: ChartDataPoint;
	}>;
}

function CustomTooltipContent({ active, payload }: TooltipProps) {
	if (!active || !payload?.[0]) return null;
	const point: ChartDataPoint = payload[0].payload;
	if (point.count === 0) return null;

	const eventTypesText = Object.entries(point.eventTypes || {})
		.map(([type, count]) => `${type}: ${count}`)
		.join(", ");

	return (
		<Box
			bgGradient="to-r"
			gradientFrom="var(--theme-primary)"
			gradientTo="var(--theme-primary-dark)"
			color="white"
			px="2"
			py="1.5"
			borderRadius="lg"
			fontSize="xs"
			fontWeight="bold"
			boxShadow="lg"
			border="1px solid"
			borderColor="var(--theme-primary-light)"
		>
			{point.count} events{eventTypesText ? ` (${eventTypesText})` : ""}
		</Box>
	);
}

export function LivePulseChart({
	events,
	filters,
	onUpdateUniqueApps,
	onUpdateAllApps,
	onUpdateTimeRange,
}: LivePulseChartProps) {
	const processedEventIds = useRef<Set<string>>(new Set());
	const [windowHeight, setWindowHeight] = useState(
		typeof window !== "undefined" ? window.innerHeight : 600,
	);

	const {
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
	} = useChartData();

	const chartHeight = windowHeight <= 400 ? 210 : 96;

	// Emit uniqueApps updates
	useEffect(() => {
		onUpdateUniqueApps(uniqueAgentIdsInWindow);
	}, [uniqueAgentIdsInWindow, onUpdateUniqueApps]);

	// Emit allApps updates
	useEffect(() => {
		onUpdateAllApps(allUniqueAgentIds);
	}, [allUniqueAgentIds, onUpdateAllApps]);

	// Emit timeRange updates
	useEffect(() => {
		onUpdateTimeRange(timeRange);
	}, [timeRange, onUpdateTimeRange]);

	// Window resize handler
	useEffect(() => {
		const handleResize = () => setWindowHeight(window.innerHeight);
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	// Filter check
	const isEventFiltered = useCallback(
		(event: HookEvent): boolean => {
			if (filters.sourceApp && event.source_app !== filters.sourceApp)
				return false;
			if (filters.sessionId && event.session_id !== filters.sessionId)
				return false;
			if (filters.eventType && event.hook_event_type !== filters.eventType)
				return false;
			return true;
		},
		[filters],
	);

	// Process new events
	useEffect(() => {
		if (events.length === 0) {
			clearData();
			processedEventIds.current.clear();
			return;
		}

		const newEvents: HookEvent[] = [];
		events.forEach((event) => {
			const key = `${event.id}-${event.timestamp}`;
			if (!processedEventIds.current.has(key)) {
				processedEventIds.current.add(key);
				newEvents.push(event);
			}
		});

		newEvents.forEach((event) => {
			if (
				event.hook_event_type !== "refresh" &&
        event.hook_event_type !== "initial" &&
        isEventFiltered(event)
			) {
				addEvent(event);
			}
		});

		// Clean up old IDs
		const currentIds = new Set(events.map((e) => `${e.id}-${e.timestamp}`));
		processedEventIds.current.forEach((id) => {
			if (!currentIds.has(id)) processedEventIds.current.delete(id);
		});
	}, [events, isEventFiltered, addEvent, clearData]);

	// Re-process on filter change
	useEffect(() => {
		clearData();
		processedEventIds.current.clear();
		// Events will be re-processed by the events useEffect above
		// since clearData changes dataPoints, triggering a re-render
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters.sourceApp, filters.sessionId, filters.eventType]);

	const chartData = getChartData();
	const hasData = dataPoints.some((dp) => dp.count > 0);
	const totalEventCount = dataPoints.reduce((sum, dp) => sum + dp.count, 0);

	const handleTimeRangeKeyDown = useCallback(
		(e: React.KeyboardEvent, currentIndex: number) => {
			let newIndex = currentIndex;
			switch (e.key) {
				case "ArrowLeft":
					newIndex = Math.max(0, currentIndex - 1);
					break;
				case "ArrowRight":
					newIndex = Math.min(TIME_RANGES.length - 1, currentIndex + 1);
					break;
				case "Home":
					newIndex = 0;
					break;
				case "End":
					newIndex = TIME_RANGES.length - 1;
					break;
				default:
					return;
			}
			if (newIndex !== currentIndex) {
				e.preventDefault();
				setTimeRange(TIME_RANGES[newIndex]);
				const buttons = (
					e.currentTarget as HTMLElement
				).parentElement?.querySelectorAll("button");
				if (buttons?.[newIndex]) {
					;(buttons[newIndex] as HTMLButtonElement).focus();
				}
			}
		},
		[setTimeRange],
	);

	const rangeLabel = useMemo(() => {
		const map: Record<TimeRange, string> = {
			"1m": "1 minute",
			"3m": "3 minutes",
			"5m": "5 minutes",
			"10m": "10 minutes",
		};
		return map[timeRange];
	}, [timeRange]);

	return (
		<Box
			bgGradient="to-r"
			gradientFrom="var(--theme-bg-primary)"
			gradientTo="var(--theme-bg-secondary)"
			px="3"
			py="4"
			boxShadow="lg"
		>
			{/* Header Row */}
			<Flex
				align="center"
				justify="space-between"
				mb="3"
				flexWrap="wrap"
				gap="2"
			>
				<HStack gap="3" flexWrap="wrap">
					<Text
						fontSize="md"
						fontWeight="bold"
						color="var(--theme-primary)"
						display="flex"
						alignItems="center"
					>
						<Box as="span" mr="1.5" fontSize="xl">
							📊
						</Box>
						<Box as="span" display={{ base: "none", md: "inline" }}>
							Live Activity Pulse
						</Box>
					</Text>

					<HStack gap="1.5" flexWrap="wrap">
						{/* Agent count */}
						<HStack
							gap="1.5"
							px="2"
							py="1"
							bgGradient="to-r"
							gradientFrom="var(--theme-primary)/10"
							gradientTo="var(--theme-primary-light)/10"
							borderRadius="lg"
							border="1px solid"
							borderColor="var(--theme-primary)/30"
							boxShadow="sm"
							title={`${uniqueAgentCount} active agent${uniqueAgentCount !== 1 ? "s" : ""}`}
						>
							<Text fontSize="lg">👥</Text>
							<Text fontSize="sm" fontWeight="bold" color="var(--theme-primary)">
								{uniqueAgentCount}
							</Text>
							<Text
								fontSize="xs"
								color="var(--theme-text-tertiary)"
								fontWeight="medium"
								display={{ base: "none", md: "inline" }}
							>
								agents
							</Text>
						</HStack>

						{/* Event count */}
						<HStack
							gap="1.5"
							px="2"
							py="1"
							bg="var(--theme-bg-tertiary)"
							borderRadius="lg"
							border="1px solid"
							borderColor="var(--theme-border-primary)"
							boxShadow="sm"
							title={`Total events in the last ${rangeLabel}`}
						>
							<Text fontSize="lg">⚡</Text>
							<Text
								fontSize="sm"
								fontWeight="bold"
								color="var(--theme-text-primary)"
							>
								{totalEventCount}
							</Text>
							<Text
								fontSize="xs"
								color="var(--theme-text-tertiary)"
								fontWeight="medium"
								display={{ base: "none", md: "inline" }}
							>
								events
							</Text>
						</HStack>

						{/* Tool calls */}
						<HStack
							gap="1.5"
							px="2"
							py="1"
							bg="var(--theme-bg-tertiary)"
							borderRadius="lg"
							border="1px solid"
							borderColor="var(--theme-border-primary)"
							boxShadow="sm"
							title={`Total tool calls in the last ${rangeLabel}`}
						>
							<Text fontSize="lg">🔧</Text>
							<Text
								fontSize="sm"
								fontWeight="bold"
								color="var(--theme-text-primary)"
							>
								{toolCallCount}
							</Text>
							<Text
								fontSize="xs"
								color="var(--theme-text-tertiary)"
								fontWeight="medium"
								display={{ base: "none", md: "inline" }}
							>
								tools
							</Text>
						</HStack>

						{/* Avg gap */}
						<HStack
							gap="1.5"
							px="2"
							py="1"
							bg="var(--theme-bg-tertiary)"
							borderRadius="lg"
							border="1px solid"
							borderColor="var(--theme-border-primary)"
							boxShadow="sm"
							title={`Average time between events in the last ${rangeLabel}`}
						>
							<Text fontSize="lg">🕐</Text>
							<Text
								fontSize="sm"
								fontWeight="bold"
								color="var(--theme-text-primary)"
							>
								{formatGap(eventTimingMetrics.avgGap)}
							</Text>
							<Text
								fontSize="xs"
								color="var(--theme-text-tertiary)"
								fontWeight="medium"
								display={{ base: "none", md: "inline" }}
							>
								avg gap
							</Text>
						</HStack>
					</HStack>
				</HStack>

				{/* Time range selector */}
				<HStack gap="1.5" role="tablist" aria-label="Time range selector">
					{TIME_RANGES.map((range, index) => (
						<Box
							as="button"
							key={range}
							onClick={() => setTimeRange(range)}
							onKeyDown={(e: React.KeyboardEvent) =>
								handleTimeRangeKeyDown(e, index)
							}
							px="3"
							py="1.5"
							fontSize="sm"
							fontWeight="bold"
							borderRadius="lg"
							transition="all 0.2s"
							minW="30px"
							minH="30px"
							display="flex"
							alignItems="center"
							justifyContent="center"
							boxShadow="md"
							border="1px solid"
							cursor="pointer"
							_hover={{
								boxShadow: "lg",
								transform: "scale(1.05)",
							}}
							{...(timeRange === range
								? {
									bgGradient: "to-r",
									gradientFrom: "var(--theme-primary)",
									gradientTo: "var(--theme-primary-light)",
									color: "white",
									borderColor: "var(--theme-primary-dark)",
								}
								: {
									bg: "var(--theme-bg-tertiary)",
									color: "var(--theme-text-primary)",
									borderColor: "var(--theme-border-primary)",
									_hover: {
										bg: "var(--theme-bg-quaternary)",
										borderColor: "var(--theme-primary)",
										boxShadow: "lg",
										transform: "scale(1.05)",
									},
								})}
							role="tab"
							aria-selected={timeRange === range}
							aria-label={`Show ${range === "1m" ? "1 minute" : range === "3m" ? "3 minutes" : range === "5m" ? "5 minutes" : "10 minutes"} of activity`}
							tabIndex={timeRange === range ? 0 : -1}
						>
							{range}
						</Box>
					))}
				</HStack>
			</Flex>

			{/* Chart */}
			<Box position="relative" w="full" style={{ height: chartHeight }}>
				<ResponsiveContainer width="100%" height="100%">
					<BarChart
						data={chartData}
						margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
					>
						<XAxis dataKey="timestamp" hide />
						<Tooltip
							content={<CustomTooltipContent />}
							cursor={{ fill: "var(--theme-primary)", opacity: 0.08 }}
						/>
						<Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={12}>
							{chartData.map((point, index) => (
								<Cell
									key={`cell-${index}`}
									fill={
										point.count > 0
											? getDominantSessionColor(point)
											: "transparent"
									}
									opacity={point.count > 0 ? 0.85 : 0}
								/>
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>

				{!hasData && (
					<Flex
						position="absolute"
						inset="0"
						align="center"
						justify="center"
						pointerEvents="none"
					>
						<Text
							color="var(--theme-text-tertiary)"
							fontSize="md"
							fontWeight="semibold"
						>
							<Box as="span" mr="1.5">
								⏳
							</Box>
							Waiting for events...
						</Text>
					</Flex>
				)}
			</Box>
		</Box>
	);
}
