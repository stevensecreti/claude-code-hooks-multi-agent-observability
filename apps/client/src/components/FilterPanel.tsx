import { useState, useEffect } from "react";
import { Flex, Box, Text, Button } from "@chakra-ui/react";
import { NativeSelectRoot, NativeSelectField } from "@/components/ui/native-select";
import { API_BASE_URL } from "@/config";
import type { FilterOptions } from "@/types";

interface Filters {
	sourceApp: string
	sessionId: string
	eventType: string
}

interface FilterPanelProps {
	filters: Filters
	onUpdateFilters: (filters: Filters) => void
}

export function FilterPanel({ filters, onUpdateFilters }: FilterPanelProps) {
	const [filterOptions, setFilterOptions] = useState<FilterOptions>({
		source_apps: [],
		session_ids: [],
		hook_event_types: [],
	});

	useEffect(() => {
		let cancelled = false;
		const doFetch = async () => {
			try {
				const response = await fetch(`${API_BASE_URL}/events/filter-options`);
				if (response.ok && !cancelled) {
					setFilterOptions(await response.json());
				}
			} catch (error) {
				console.error("Failed to fetch filter options:", error);
			}
		};
		doFetch();
		const interval = setInterval(doFetch, 10000);
		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, []);

	const hasActiveFilters = filters.sourceApp || filters.sessionId || filters.eventType;

	const handleChange = (field: keyof Filters, value: string) => {
		onUpdateFilters({ ...filters, [field]: value });
	};

	const clearFilters = () => {
		onUpdateFilters({ sourceApp: "", sessionId: "", eventType: "" });
	};

	return (
		<Box
			bgGradient="to-r"
			gradientFrom="var(--theme-bg-primary)"
			gradientTo="var(--theme-bg-secondary)"
			borderBottomWidth="2px"
			borderBottomColor="var(--theme-primary)"
			px="3"
			py="4"
			shadow="lg"
		>
			<Flex
				flexWrap="wrap"
				gap="3"
				alignItems="center"
				direction={{ base: "column", md: "row" }}
			>
				<Box flex="1" minW="0" w={{ base: "full", md: "auto" }}>
					<Text
						fontSize={{ base: "sm", md: "md" }}
						fontWeight="bold"
						color="var(--theme-primary)"
						mb="1.5"
					>
						Source App
					</Text>
					<NativeSelectRoot
						size="md"
					>
						<NativeSelectField
							value={filters.sourceApp}
							onChange={(e) => handleChange("sourceApp", e.target.value)}
							bg="var(--theme-bg-primary)"
							color="var(--theme-text-primary)"
							borderColor="var(--theme-primary)"
							borderRadius="lg"
							_focus={{ outline: "2px solid", outlineColor: "var(--theme-primary)", borderColor: "var(--theme-primary-dark)" }}
						>
							<option value="">All Sources</option>
							{filterOptions.source_apps.map((app) => (
								<option key={app} value={app}>
									{app}
								</option>
							))}
						</NativeSelectField>
					</NativeSelectRoot>
				</Box>

				<Box flex="1" minW="0" w={{ base: "full", md: "auto" }}>
					<Text
						fontSize={{ base: "sm", md: "md" }}
						fontWeight="bold"
						color="var(--theme-primary)"
						mb="1.5"
					>
						Session ID
					</Text>
					<NativeSelectRoot
						size="md"
					>
						<NativeSelectField
							value={filters.sessionId}
							onChange={(e) => handleChange("sessionId", e.target.value)}
							bg="var(--theme-bg-primary)"
							color="var(--theme-text-primary)"
							borderColor="var(--theme-primary)"
							borderRadius="lg"
							_focus={{ outline: "2px solid", outlineColor: "var(--theme-primary)", borderColor: "var(--theme-primary-dark)" }}
						>
							<option value="">All Sessions</option>
							{filterOptions.session_ids.map((session) => (
								<option key={session} value={session}>
									{session.slice(0, 8)}...
								</option>
							))}
						</NativeSelectField>
					</NativeSelectRoot>
				</Box>

				<Box flex="1" minW="0" w={{ base: "full", md: "auto" }}>
					<Text
						fontSize={{ base: "sm", md: "md" }}
						fontWeight="bold"
						color="var(--theme-primary)"
						mb="1.5"
					>
						Event Type
					</Text>
					<NativeSelectRoot
						size="md"
					>
						<NativeSelectField
							value={filters.eventType}
							onChange={(e) => handleChange("eventType", e.target.value)}
							bg="var(--theme-bg-primary)"
							color="var(--theme-text-primary)"
							borderColor="var(--theme-primary)"
							borderRadius="lg"
							_focus={{ outline: "2px solid", outlineColor: "var(--theme-primary)", borderColor: "var(--theme-primary-dark)" }}
						>
							<option value="">All Types</option>
							{filterOptions.hook_event_types.map((type) => (
								<option key={type} value={type}>
									{type}
								</option>
							))}
						</NativeSelectField>
					</NativeSelectRoot>
				</Box>

				{hasActiveFilters && (
					<Button
						onClick={clearFilters}
						variant="outline"
						size="md"
						w={{ base: "full", md: "auto" }}
						alignSelf={{ base: "stretch", md: "flex-end" }}
						color="var(--theme-text-secondary)"
						bg="var(--theme-bg-tertiary)"
						_hover={{ bg: "var(--theme-bg-quaternary)" }}
						borderRadius="md"
					>
						Clear Filters
					</Button>
				)}
			</Flex>
		</Box>
	);
}
