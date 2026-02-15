import { useState, useCallback, useEffect, useRef } from "react";
import { Box } from "@chakra-ui/react";
import type { TimeRange } from "./types";
import { useWebSocket } from "./hooks/useWebSocket";
import { useThemes } from "./hooks/useThemes";
import { Header } from "./components/layout/Header";
import { FilterPanel } from "./components/FilterPanel";
import { LivePulseChart } from "./components/LivePulseChart";
import { AgentSwimLaneContainer } from "./components/AgentSwimLaneContainer";
import { EventTimeline } from "./components/EventTimeline";
import { StickScrollButton } from "./components/StickScrollButton";
import { ThemeManager } from "./components/ThemeManager";
import { toaster } from "@/components/ui/toaster";
import { WS_URL } from "./config";

export default function App() {
	// WebSocket connection
	const { events, isConnected, error, clearEvents } = useWebSocket(WS_URL);

	// Theme management (sets up theme system)
	useThemes();

	// Filters
	const [filters, setFilters] = useState({
		sourceApp: "",
		sessionId: "",
		eventType: "",
	});

	// UI state
	const [stickToBottom, setStickToBottom] = useState(true);
	const [showThemeManager, setShowThemeManager] = useState(false);
	const [showFilters, setShowFilters] = useState(false);
	const [uniqueAppNames, setUniqueAppNames] = useState<string[]>([]);
	const [allAppNames, setAllAppNames] = useState<string[]>([]);
	const [selectedAgentLanes, setSelectedAgentLanes] = useState<string[]>([]);
	const [currentTimeRange, setCurrentTimeRange] = useState<TimeRange>("1m");

	// Toast notifications for new agents
	const seenAgents = useRef(new Set<string>());

	// Watch for new agents and show toast
	useEffect(() => {
		uniqueAppNames.forEach((appName) => {
			if (!seenAgents.current.has(appName)) {
				seenAgents.current.add(appName);
				toaster.create({
					title: `New Agent "${appName}" Joined`,
					type: "info",
					duration: 4000,
				});
			}
		});
	}, [uniqueAppNames]);

	// Handle agent tag clicks for swim lanes
	const toggleAgentLane = useCallback((agentName: string) => {
		setSelectedAgentLanes((prev) => {
			const index = prev.indexOf(agentName);
			if (index >= 0) {
				return prev.filter((_, i) => i !== index);
			}
			return [...prev, agentName];
		});
	}, []);

	// Handle clear button click
	const handleClearEvents = useCallback(() => {
		clearEvents();
		setSelectedAgentLanes([]);
	}, [clearEvents]);

	// Handle theme manager open
	const handleOpenThemeManager = useCallback(() => {
		setShowThemeManager(true);
	}, []);

	// Handle filters toggle
	const handleToggleFilters = useCallback(() => {
		setShowFilters((prev) => !prev);
	}, []);

	return (
		<Box
			h="100vh"
			display="flex"
			flexDirection="column"
			bg="var(--theme-bg-secondary)"
		>
			<Header
				isConnected={isConnected}
				eventCount={events.length}
				showFilters={showFilters}
				onClearEvents={handleClearEvents}
				onToggleFilters={handleToggleFilters}
				onOpenThemeManager={handleOpenThemeManager}
			/>

			{showFilters && (
				<FilterPanel filters={filters} onUpdateFilters={setFilters} />
			)}

			<LivePulseChart
				events={events}
				filters={filters}
				onUpdateUniqueApps={setUniqueAppNames}
				onUpdateAllApps={setAllAppNames}
				onUpdateTimeRange={setCurrentTimeRange}
			/>

			{selectedAgentLanes.length > 0 && (
				<Box
					w="full"
					bg="var(--theme-bg-secondary)"
					px="3"
					py="4"
					overflow="hidden"
				>
					<AgentSwimLaneContainer
						selectedAgents={selectedAgentLanes}
						events={events}
						timeRange={currentTimeRange}
						onUpdateSelectedAgents={setSelectedAgentLanes}
					/>
				</Box>
			)}

			<Box flex="1" overflow="hidden" display="flex" flexDirection="column">
				<EventTimeline
					events={events}
					filters={filters}
					uniqueAppNames={uniqueAppNames}
					allAppNames={allAppNames}
					stickToBottom={stickToBottom}
					onStickToBottomChange={setStickToBottom}
					onSelectAgent={toggleAgentLane}
				/>
			</Box>

			<StickScrollButton
				stickToBottom={stickToBottom}
				onToggle={() => setStickToBottom((prev) => !prev)}
			/>

			{error && (
				<Box
					position="fixed"
					bottom="4"
					left="4"
					bg="red.100"
					borderWidth="1px"
					borderColor="red.400"
					color="red.700"
					px="3"
					py="2"
					borderRadius="md"
					fontSize="sm"
				>
					{error}
				</Box>
			)}

			<ThemeManager
				isOpen={showThemeManager}
				onClose={() => setShowThemeManager(false)}
			/>
		</Box>
	);
}
