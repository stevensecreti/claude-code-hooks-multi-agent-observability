import { Box, Flex, Text, SimpleGrid } from "@chakra-ui/react";
import type { CustomTheme, CreateThemeFormData } from "@/types/theme";

interface ThemePreviewProps {
	theme: CustomTheme | CreateThemeFormData
}

export function ThemePreview({ theme }: ThemePreviewProps) {
	const colors = theme.colors || {};

	const displayColors: Record<string, string | undefined> = {
		primary: colors.primary,
		bgPrimary: colors.bgPrimary,
		bgSecondary: colors.bgSecondary,
		bgTertiary: colors.bgTertiary,
		textPrimary: colors.textPrimary,
		textSecondary: colors.textSecondary,
		accentSuccess: colors.accentSuccess,
		accentError: colors.accentError,
	};

	const formatColorLabel = (key: string) =>
		key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());

	return (
		<Box
			bg="var(--theme-bg-tertiary)"
			borderRadius="lg"
			p="6"
			borderWidth="1px"
			borderColor="var(--theme-border-secondary)"
		>
			{/* Preview Window */}
			<Box
				borderWidth="2px"
				borderColor="var(--theme-border-secondary)"
				borderRadius="lg"
				overflow="hidden"
			>
				{/* Mini header */}
				<Flex
					px="4"
					py="3"
					borderBottomWidth="1px"
					alignItems="center"
					justifyContent="space-between"
					style={{
						backgroundColor: colors.bgPrimary || "#ffffff",
						borderColor: colors.borderPrimary || "#e5e7eb",
					}}
				>
					<Text
						fontWeight="semibold"
						style={{ color: colors.textPrimary || "#111827" }}
					>
						{theme.displayName || "Theme Preview"}
					</Text>
					<Flex alignItems="center" gap="2">
						<Box
							w="3"
							h="3"
							borderRadius="full"
							style={{ backgroundColor: colors.accentSuccess || "#10b981" }}
						/>
						<Text
							fontSize="sm"
							style={{ color: colors.textTertiary || "#6b7280" }}
						>
							Connected
						</Text>
					</Flex>
				</Flex>

				{/* Content area */}
				<Box
					p="4"
					spaceY="4"
					style={{ backgroundColor: colors.bgSecondary || "#f9fafb" }}
				>
					{/* Simulated event card */}
					<Box
						borderRadius="lg"
						p="4"
						borderWidth="1px"
						shadow="sm"
						style={{
							backgroundColor: colors.bgPrimary || "#ffffff",
							borderColor: colors.borderPrimary || "#e5e7eb",
						}}
					>
						<Flex alignItems="center" justifyContent="space-between" mb="2">
							<Flex alignItems="center" gap="3">
								<Text
									as="span"
									px="3"
									py="1"
									borderRadius="full"
									fontSize="sm"
									fontWeight="medium"
									borderWidth="2px"
									style={{
										backgroundColor: (colors.primary || "#3b82f6") + "20",
										color: colors.primary || "#3b82f6",
										borderColor: colors.primary || "#3b82f6",
									}}
								>
									demo-app
								</Text>
								<Text
									as="span"
									px="2"
									py="1"
									borderRadius="full"
									fontSize="sm"
									borderWidth="1px"
									style={{
										color: colors.textSecondary || "#374151",
										borderColor: colors.borderSecondary || "#d1d5db",
									}}
								>
									abc123
								</Text>
								<Text
									as="span"
									px="3"
									py="1"
									borderRadius="full"
									fontSize="sm"
									fontWeight="medium"
									style={{
										backgroundColor: (colors.accentInfo || "#3b82f6") + "20",
										color: colors.accentInfo || "#3b82f6",
									}}
								>
									PreToolUse
								</Text>
							</Flex>
							<Text
								fontSize="sm"
								style={{ color: colors.textQuaternary || "#9ca3af" }}
							>
								2:34 PM
							</Text>
						</Flex>
					</Box>

					{/* Simulated filter panel */}
					<Flex
						borderRadius="lg"
						p="3"
						borderWidth="1px"
						alignItems="center"
						gap="4"
						style={{
							backgroundColor: colors.bgTertiary || "#f3f4f6",
							borderColor: colors.borderSecondary || "#d1d5db",
						}}
					>
						<Box
							as="select"
							px="3"
							py="1"
							borderRadius="md"
							fontSize="sm"
							borderWidth="1px"
							style={{
								backgroundColor: colors.bgPrimary || "#ffffff",
								borderColor: colors.borderPrimary || "#e5e7eb",
								color: colors.textSecondary || "#374151",
							}}
						>
							<option>All Apps</option>
						</Box>
						<Box
							as="select"
							px="3"
							py="1"
							borderRadius="md"
							fontSize="sm"
							borderWidth="1px"
							style={{
								backgroundColor: colors.bgPrimary || "#ffffff",
								borderColor: colors.borderPrimary || "#e5e7eb",
								color: colors.textSecondary || "#374151",
							}}
						>
							<option>All Events</option>
						</Box>
						<Box
							as="button"
							px="3"
							py="1"
							borderRadius="md"
							fontSize="sm"
							fontWeight="medium"
							color="white"
							style={{
								backgroundColor: colors.primary || "#3b82f6",
							}}
						>
							Apply Filters
						</Box>
					</Flex>

					{/* Color palette */}
					<SimpleGrid columns={8} gap="2">
						{Object.entries(displayColors).map(([key, color]) =>
							color ? (
								<Box
									key={key}
									h="8"
									borderRadius="md"
									borderWidth="1px"
									title={`${formatColorLabel(key)}: ${color}`}
									cursor="pointer"
									_hover={{ opacity: 0.9 }}
									style={{
										backgroundColor: color,
										borderColor: colors.borderPrimary || "#e5e7eb",
									}}
								/>
							) : null,
						)}
					</SimpleGrid>

					{/* Status indicators */}
					<Flex
						alignItems="center"
						justifyContent="space-between"
						fontSize="sm"
					>
						<Flex alignItems="center" gap="4">
							<Flex alignItems="center" gap="2">
								<Box
									w="2"
									h="2"
									borderRadius="full"
									style={{ backgroundColor: colors.accentSuccess || "#10b981" }}
								/>
								<Text style={{ color: colors.textSecondary || "#374151" }}>
									Success
								</Text>
							</Flex>
							<Flex alignItems="center" gap="2">
								<Box
									w="2"
									h="2"
									borderRadius="full"
									style={{ backgroundColor: colors.accentWarning || "#f59e0b" }}
								/>
								<Text style={{ color: colors.textSecondary || "#374151" }}>
									Warning
								</Text>
							</Flex>
							<Flex alignItems="center" gap="2">
								<Box
									w="2"
									h="2"
									borderRadius="full"
									style={{ backgroundColor: colors.accentError || "#ef4444" }}
								/>
								<Text style={{ color: colors.textSecondary || "#374151" }}>
									Error
								</Text>
							</Flex>
						</Flex>
						<Text style={{ color: colors.textTertiary || "#6b7280" }}>
							156 events
						</Text>
					</Flex>
				</Box>
			</Box>
		</Box>
	);
}
