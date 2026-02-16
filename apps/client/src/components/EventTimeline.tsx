import { useRef, useEffect, useCallback, useMemo } from "react";
import { Box, Flex, Text, Input } from "@chakra-ui/react";
import type { HookEvent } from "@/types";
import { useEventSearch } from "@/hooks/useEventSearch";
import { getHexColorForApp } from "@/utils/eventColors";
import { EventRow } from "@/components/EventRow";

interface EventTimelineProps {
	events: HookEvent[]
	filters: { sourceApp: string; sessionId: string; eventType: string }
	stickToBottom: boolean
	onStickToBottomChange: (value: boolean) => void
	uniqueAppNames?: string[]
	allAppNames?: string[]
	onSelectAgent: (agentName: string) => void
}

function getAppNameFromAgentId(agentId: string): string {
	return agentId.split(":")[0];
}

export function EventTimeline({
	events,
	filters,
	stickToBottom,
	onStickToBottomChange,
	uniqueAppNames = [],
	allAppNames = [],
	onSelectAgent,
}: EventTimelineProps) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const { searchPattern, searchError, searchEvents, updateSearchPattern, clearSearch } =
		useEventSearch();

	const displayedAgentIds = useMemo(
		() => (allAppNames.length > 0 ? allAppNames : uniqueAppNames),
		[allAppNames, uniqueAppNames],
	);

	const isAgentActive = useCallback(
		(agentId: string): boolean => uniqueAppNames.includes(agentId),
		[uniqueAppNames],
	);

	const filteredEvents = useMemo(() => {
		let filtered = events.filter((event) => {
			if (filters.sourceApp && event.source_app !== filters.sourceApp) return false;
			if (filters.sessionId && event.session_id !== filters.sessionId) return false;
			if (filters.eventType && event.hook_event_type !== filters.eventType) return false;
			return true;
		});

		if (searchPattern) {
			filtered = searchEvents(filtered, searchPattern);
		}

		return filtered;
	}, [events, filters, searchPattern, searchEvents]);

	const scrollToBottom = useCallback(() => {
		if (scrollContainerRef.current) {
			scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
		}
	}, []);

	const handleScroll = useCallback(() => {
		if (!scrollContainerRef.current) return;
		const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
		const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
		if (isAtBottom !== stickToBottom) {
			onStickToBottomChange(isAtBottom);
		}
	}, [stickToBottom, onStickToBottomChange]);

	// Auto-scroll when new events arrive
	useEffect(() => {
		if (stickToBottom) {
			scrollToBottom();
		}
	}, [events.length, stickToBottom, scrollToBottom]);

	// Scroll when stickToBottom is toggled on
	useEffect(() => {
		if (stickToBottom) {
			scrollToBottom();
		}
	}, [stickToBottom, scrollToBottom]);

	return (
		<Flex flex="1" overflow="hidden" flexDirection="column" css={{ "@media (max-width: 768px)": { height: "50vh" } }}>
			{/* Fixed Header */}
			<Box
				px="3"
				py={{ base: "2", md: "4" }}
				bg="linear-gradient(to right, var(--theme-bg-primary), var(--theme-bg-secondary))"
				position="relative"
				zIndex="10"
				boxShadow="0 4px 20px -2px rgba(0,0,0,0.3), 0 8px 25px -5px rgba(0,0,0,0.2)"
			>
				<Text
					fontSize={{ base: "lg", md: "2xl" }}
					fontWeight="bold"
					color="var(--theme-primary)"
					textAlign="center"
					textShadow="0 1px 2px rgba(0,0,0,0.1)"
				>
					Agent Event Stream
				</Text>

				{/* Agent/App Tags Row */}
				{displayedAgentIds.length > 0 && (
					<Flex mt="3" flexWrap="wrap" gap={{ base: "1.5", md: "2" }} justifyContent="flex-start">
						{displayedAgentIds.map((agentId) => {
							const agentAppColor = getHexColorForApp(getAppNameFromAgentId(agentId));
							const active = isAgentActive(agentId);
							return (
								<Box
									as="button"
									key={agentId}
									onClick={() => onSelectAgent(agentId)}
									fontSize={{ base: "sm", md: "md" }}
									fontWeight="bold"
									px={{ base: "2", md: "3" }}
									py="1"
									borderRadius="full"
									borderWidth="2px"
									borderColor={agentAppColor}
									bg={agentAppColor + (active ? "33" : "1a")}
									color={active ? "var(--theme-text-primary)" : "var(--theme-text-tertiary)"}
									opacity={active ? 1 : 0.5}
									shadow="lg"
									transition="all 0.2s"
									cursor="pointer"
									_hover={{ shadow: "xl", transform: "scale(1.05)", opacity: active ? 1 : 0.75 }}
									title={`${active ? "Active: Click to add" : "Sleeping: No recent events. Click to add"} ${agentId} to comparison lanes`}
								>
									<Text as="span" mr="2">
										{active ? "\u2728" : "\uD83D\uDE34"}
									</Text>
									<Text as="span" fontFamily="mono" fontSize="sm">
										{agentId}
									</Text>
								</Box>
							);
						})}
					</Flex>
				)}

				{/* Search Bar */}
				<Box mt={{ base: "2", md: "3" }} w="full">
					<Flex alignItems="center" gap={{ base: "1", md: "2" }}>
						<Box position="relative" flex="1">
							<Input
								value={searchPattern}
								onChange={(e) => updateSearchPattern(e.target.value)}
								placeholder="Search events (regex enabled)... e.g., 'tool.*error' or '^GET'"
								px={{ base: "2", md: "3" }}
								py={{ base: "1.5", md: "2" }}
								borderRadius="lg"
								fontSize={{ base: "xs", md: "sm" }}
								fontFamily="mono"
								borderWidth="2px"
								bg="var(--theme-bg-tertiary)"
								color="var(--theme-text-primary)"
								borderColor={searchError ? "var(--theme-accent-error)" : "var(--theme-border-primary)"}
								_focus={{ borderColor: "var(--theme-primary)", outline: "none", ring: "2px", ringColor: "color-mix(in srgb, var(--theme-primary) 20%, transparent)" }}
								_placeholder={{ color: "var(--theme-text-quaternary)" }}
								transition="all 0.2s"
								aria-label="Search events with regex pattern"
							/>
							{searchPattern && (
								<Box
									as="button"
									position="absolute"
									right="2"
									top="50%"
									transform="translateY(-50%)"
									color="var(--theme-text-tertiary)"
									_hover={{ color: "var(--theme-primary)" }}
									transition="colors 0.2s"
									onClick={clearSearch}
									title="Clear search"
									aria-label="Clear search"
								>
									{"\u2715"}
								</Box>
							)}
						</Box>
					</Flex>
					{searchError && (
						<Box
							mt={{ base: "1", md: "1.5" }}
							px="2"
							py={{ base: "1", md: "1.5" }}
							bg="color-mix(in srgb, var(--theme-accent-error) 10%, transparent)"
							borderWidth="1px"
							borderColor="var(--theme-accent-error)"
							borderRadius="lg"
							fontSize={{ base: "11px", md: "xs" }}
							color="var(--theme-accent-error)"
							fontWeight="semibold"
							role="alert"
						>
							{"\u26A0\uFE0F"} {searchError}
						</Box>
					)}
				</Box>
			</Box>

			{/* Scrollable Event List */}
			<Box
				ref={scrollContainerRef}
				flex="1"
				overflowY="auto"
				px={{ base: "2", md: "3" }}
				py={{ base: "1.5", md: "3" }}
				position="relative"
				onScroll={handleScroll}
			>
				<Flex flexDirection="column" gap={{ base: "1.5", md: "2" }}>
					{filteredEvents.map((event) => (
						<Box
							key={event.id}
							css={{
								animation: "eventEnter 0.3s ease",
							}}
						>
							<EventRow
								event={event}
								appHexColor={getHexColorForApp(event.source_app)}
							/>
						</Box>
					))}
				</Flex>

				{filteredEvents.length === 0 && (
					<Box textAlign="center" py={{ base: "6", md: "8" }} color="var(--theme-text-tertiary)">
						<Text fontSize={{ base: "3xl", md: "4xl" }} mb="3">
							{"\uD83D\uDD33"}
						</Text>
						<Text
							fontSize={{ base: "md", md: "lg" }}
							fontWeight="semibold"
							color="var(--theme-primary)"
							mb="1.5"
						>
							No events to display
						</Text>
						<Text fontSize={{ base: "sm", md: "md" }}>
							Events will appear here as they are received
						</Text>
					</Box>
				)}
			</Box>
		</Flex>
	);
}
