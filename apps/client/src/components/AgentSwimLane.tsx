import { useEffect, useRef, useMemo } from "react";
import { Box, Flex, HStack, Text, Badge } from "@chakra-ui/react";
import {
	BarChart,
	Bar,
	XAxis,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from "recharts";
import type { HookEvent, TimeRange, ChartDataPoint } from "../types";
import { useAgentChartData } from "../hooks/useAgentChartData";
import { getHexColorForSession, getHexColorForApp } from "../utils/eventColors";

interface AgentSwimLaneProps {
	agentName: string // Format: "app:session"
	events: HookEvent[]
	timeRange: TimeRange
	onClose: () => void
}

const CHART_HEIGHT = 80;

function formatGap(gapMs: number): string {
	if (gapMs === 0) return "\u2014";
	if (gapMs < 1000) return `${Math.round(gapMs)}ms`;
	return `${(gapMs / 1000).toFixed(1)}s`;
}

function formatModelName(name: string | null | undefined): string {
	if (!name) return "";
	const parts = name.split("-");
	if (parts.length >= 4) return `${parts[1]}-${parts[2]}-${parts[3]}`;
	return name;
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

function SwimLaneTooltip({ active, payload }: TooltipProps) {
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

export function AgentSwimLane({
	agentName,
	events,
	timeRange,
	onClose,
}: AgentSwimLaneProps) {
	const processedEventIds = useRef<Set<string>>(new Set());

	const appName = agentName.split(":")[0];
	const sessionId = agentName.split(":")[1];

	const {
		dataPoints,
		addEvent,
		getChartData,
		setTimeRange,
		eventTimingMetrics,
	} = useAgentChartData(agentName);

	// Get model name from most recent event for this agent
	const modelName = useMemo(() => {
		const [targetApp, targetSession] = agentName.split(":");
		const agentEvents = events
			.filter(
				(e) =>
					e.source_app === targetApp &&
          e.session_id.slice(0, 8) === targetSession,
			)
			.filter((e) => e.model_name);

		if (agentEvents.length === 0) return null;
		return agentEvents[agentEvents.length - 1].model_name;
	}, [agentName, events]);

	// Sync time range from parent
	useEffect(() => {
		setTimeRange(timeRange);
	}, [timeRange, setTimeRange]);

	// Process events
	useEffect(() => {
		const [targetApp, targetSession] = agentName.split(":");
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
        event.source_app === targetApp &&
        event.session_id.slice(0, 8) === targetSession
			) {
				addEvent(event);
			}
		});

		// Cleanup old IDs
		const currentIds = new Set(events.map((e) => `${e.id}-${e.timestamp}`));
		processedEventIds.current.forEach((id) => {
			if (!currentIds.has(id)) processedEventIds.current.delete(id);
		});
	}, [events, agentName, addEvent]);

	const chartData = getChartData();
	const hasData = dataPoints.some((dp) => dp.count > 0);
	const totalEventCount = dataPoints.reduce((sum, dp) => sum + dp.count, 0);
	const agentToolCallCount = dataPoints.reduce(
		(sum, dp) => sum + (dp.eventTypes?.["PreToolUse"] || 0),
		0,
	);

	return (
		<Box w="full" display="flex" flexDirection="column" gap="1">
			{/* Header */}
			<Flex
				justify="space-between"
				align="center"
				fontSize="xs"
				fontWeight="semibold"
				px="7px"
				gap="2"
			>
				<HStack gap="1.5" flexWrap="wrap">
					{/* App + Session badge pair */}
					<HStack gap="0">
						<Badge
							px="2"
							py="2"
							borderRadius="3px 0 0 3px"
							border="1px solid"
							borderColor={getHexColorForApp(appName)}
							bg={getHexColorForApp(appName)}
							color="white"
							fontSize="11px"
							fontWeight="700"
							textTransform="uppercase"
							letterSpacing="0.5px"
							fontFamily="mono"
							minH="28px"
							display="inline-flex"
							alignItems="center"
						>
							{appName}
						</Badge>
						<Badge
							px="2"
							py="2"
							borderRadius="0 3px 3px 0"
							border="1px solid"
							borderLeft="none"
							borderColor={getHexColorForSession(sessionId)}
							bg={getHexColorForSession(sessionId)}
							color="white"
							fontSize="11px"
							fontWeight="700"
							textTransform="uppercase"
							letterSpacing="0.5px"
							fontFamily="mono"
							minH="28px"
							display="inline-flex"
							alignItems="center"
						>
							{sessionId}
						</Badge>
					</HStack>

					{/* Model badge */}
					{modelName && (
						<HStack
							gap="1.5"
							px="2"
							py="2"
							bg="var(--theme-bg-tertiary)"
							border="1px solid"
							borderColor="var(--theme-border-primary)"
							borderRadius="lg"
							minH="28px"
							title={`Model: ${modelName}`}
						>
							<Text fontSize="md">🧠</Text>
							<Text fontSize="xs" fontWeight="bold">
								{formatModelName(modelName)}
							</Text>
						</HStack>
					)}

					{/* Event count */}
					<HStack
						gap="1.5"
						px="2"
						py="2"
						bg="var(--theme-bg-tertiary)"
						border="1px solid"
						borderColor="var(--theme-border-primary)"
						borderRadius="lg"
						minH="28px"
						title={"Total events"}
					>
						<Text fontSize="md" w="4" flexShrink={0}>
							⚡
						</Text>
						<Text fontSize="xs" fontWeight="bold">
							{totalEventCount}
						</Text>
					</HStack>

					{/* Tool calls */}
					<HStack
						gap="1.5"
						px="2"
						py="2"
						bg="var(--theme-bg-tertiary)"
						border="1px solid"
						borderColor="var(--theme-border-primary)"
						borderRadius="lg"
						minH="28px"
						title="Tool calls"
					>
						<Text fontSize="md" w="4" flexShrink={0}>
							🔧
						</Text>
						<Text fontSize="xs" fontWeight="bold">
							{agentToolCallCount}
						</Text>
					</HStack>

					{/* Avg gap */}
					<HStack
						gap="1.5"
						px="2"
						py="2"
						bg="var(--theme-bg-tertiary)"
						border="1px solid"
						borderColor="var(--theme-border-primary)"
						borderRadius="lg"
						minH="28px"
						title="Average gap between events"
					>
						<Text fontSize="lg" w="5" flexShrink={0}>
							🕐
						</Text>
						<Text
							fontSize="sm"
							fontWeight="bold"
							color="var(--theme-text-primary)"
						>
							{formatGap(eventTimingMetrics.avgGap)}
						</Text>
					</HStack>
				</HStack>

				{/* Close button */}
				<Box
					as="button"
					onClick={onClose}
					bg="none"
					border="none"
					cursor="pointer"
					fontSize="14px"
					color="var(--theme-text-tertiary)"
					p="0"
					w="20px"
					h="20px"
					display="flex"
					alignItems="center"
					justifyContent="center"
					borderRadius="3px"
					transition="all 0.2s"
					flexShrink={0}
					_hover={{
						bg: "var(--theme-bg-quaternary)",
						color: "var(--theme-text-primary)",
						transform: "scale(1.1)",
					}}
					title="Remove this swim lane"
				>
					✕
				</Box>
			</Flex>

			{/* Chart */}
			<Box
				position="relative"
				w="full"
				border="1px solid"
				borderColor="var(--theme-border-primary)"
				borderRadius="md"
				overflow="hidden"
				bg="var(--theme-bg-tertiary)"
				style={{ height: CHART_HEIGHT }}
			>
				<ResponsiveContainer width="100%" height="100%">
					<BarChart
						data={chartData}
						margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
					>
						<XAxis dataKey="timestamp" hide />
						<Tooltip
							content={<SwimLaneTooltip />}
							cursor={{ fill: "var(--theme-primary)", opacity: 0.08 }}
						/>
						<Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={10}>
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
							fontSize="sm"
							fontWeight="semibold"
						>
							<Box as="span" mr="1">
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
