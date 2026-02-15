import { useCallback } from "react";
import { Box, Flex } from "@chakra-ui/react";
import type { HookEvent, TimeRange } from "../types";
import { AgentSwimLane } from "./AgentSwimLane";

interface AgentSwimLaneContainerProps {
	selectedAgents: string[]
	events: HookEvent[]
	timeRange: TimeRange
	onUpdateSelectedAgents: (agents: string[]) => void
}

export function AgentSwimLaneContainer({
	selectedAgents,
	events,
	timeRange,
	onUpdateSelectedAgents,
}: AgentSwimLaneContainerProps) {
	const removeAgent = useCallback(
		(agent: string) => {
			onUpdateSelectedAgents(selectedAgents.filter((a) => a !== agent));
		},
		[selectedAgents, onUpdateSelectedAgents],
	);

	if (selectedAgents.length === 0) return null;

	return (
		<Box
			w="full"
			css={{
				animation: "slideIn 0.3s ease",
				"@keyframes slideIn": {
					from: { opacity: 0, transform: "translateY(-10px)" },
					to: { opacity: 1, transform: "translateY(0)" },
				},
			}}
		>
			<Flex direction="column" gap="2" w="full">
				{selectedAgents.map((agent) => (
					<AgentSwimLane
						key={agent}
						agentName={agent}
						events={events}
						timeRange={timeRange}
						onClose={() => removeAgent(agent)}
					/>
				))}
			</Flex>
		</Box>
	);
}
