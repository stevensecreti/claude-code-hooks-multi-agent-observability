import { useChartData } from "./useChartData";

/**
 * Hook for rendering chart data specific to a single agent.
 * Delegates to useChartData with agent filtering applied.
 */
export function useAgentChartData(agentName: string) {
	return useChartData(agentName);
}
