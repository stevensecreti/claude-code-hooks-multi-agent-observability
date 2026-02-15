import { Box, Flex, HStack, Text, IconButton } from "@chakra-ui/react";

interface HeaderProps {
	isConnected: boolean
	eventCount: number
	showFilters: boolean
	onClearEvents: () => void
	onToggleFilters: () => void
	onOpenThemeManager: () => void
}

export function Header({
	isConnected,
	eventCount,
	showFilters,
	onClearEvents,
	onToggleFilters,
	onOpenThemeManager,
}: HeaderProps) {
	return (
		<Box
			as="header"
			bgGradient="to-r"
			gradientFrom="var(--theme-primary)"
			gradientTo="var(--theme-primary-light)"
			shadow="lg"
			borderBottomWidth="2px"
			borderBottomColor="var(--theme-primary-dark)"
		>
			<Flex
				px="3"
				py="4"
				alignItems="center"
				justifyContent="space-between"
			>
				{/* Title */}
				<Box display={{ base: "none", md: "block" }}>
					<Text
						fontSize="2xl"
						fontWeight="bold"
						color="white"
						textShadow="0 1px 3px rgba(0,0,0,0.3)"
					>
						Multi-Agent Observability
					</Text>
				</Box>

				{/* Connection Status */}
				<HStack gap="1.5">
					{isConnected ? (
						<HStack gap="1.5">
							<Box position="relative" display="flex" h="3" w="3">
								<Box
									as="span"
									position="absolute"
									display="inline-flex"
									h="full"
									w="full"
									borderRadius="full"
									bg="green.400"
									opacity="0.75"
									animation="ping 1s cubic-bezier(0, 0, 0.2, 1) infinite"
								/>
								<Box
									as="span"
									position="relative"
									display="inline-flex"
									borderRadius="full"
									h="3"
									w="3"
									bg="green.500"
								/>
							</Box>
							<Text
								fontSize="md"
								color="white"
								fontWeight="semibold"
								textShadow="0 1px 2px rgba(0,0,0,0.2)"
								display={{ base: "none", md: "inline" }}
							>
								Connected
							</Text>
						</HStack>
					) : (
						<HStack gap="1.5">
							<Box position="relative" display="flex" h="3" w="3">
								<Box
									as="span"
									position="relative"
									display="inline-flex"
									borderRadius="full"
									h="3"
									w="3"
									bg="red.500"
								/>
							</Box>
							<Text
								fontSize="md"
								color="white"
								fontWeight="semibold"
								textShadow="0 1px 2px rgba(0,0,0,0.2)"
								display={{ base: "none", md: "inline" }}
							>
								Disconnected
							</Text>
						</HStack>
					)}
				</HStack>

				{/* Event Count and Action Buttons */}
				<HStack gap="2">
					{/* Event Count Badge */}
					<Text
						fontSize="md"
						color="white"
						fontWeight="semibold"
						textShadow="0 1px 2px rgba(0,0,0,0.2)"
						bg="var(--theme-primary-dark)"
						px="3"
						py="1.5"
						borderRadius="full"
						borderWidth="1px"
						borderColor="rgba(255,255,255,0.3)"
					>
						{eventCount}
					</Text>

					{/* Clear Button */}
					<IconButton
						aria-label="Clear events"
						onClick={onClearEvents}
						variant="ghost"
						borderRadius="lg"
						bg="rgba(255,255,255,0.2)"
						_hover={{ bg: "rgba(255,255,255,0.3)", borderColor: "rgba(255,255,255,0.5)" }}
						borderWidth="1px"
						borderColor="rgba(255,255,255,0.3)"
						shadow="lg"
						size="md"
					>
						<Text fontSize="2xl">🗑️</Text>
					</IconButton>

					{/* Filters Toggle Button */}
					<IconButton
						aria-label={showFilters ? "Hide filters" : "Show filters"}
						onClick={onToggleFilters}
						variant="ghost"
						borderRadius="lg"
						bg="rgba(255,255,255,0.2)"
						_hover={{ bg: "rgba(255,255,255,0.3)", borderColor: "rgba(255,255,255,0.5)" }}
						borderWidth="1px"
						borderColor="rgba(255,255,255,0.3)"
						shadow="lg"
						size="md"
					>
						<Text fontSize="2xl">📊</Text>
					</IconButton>

					{/* Theme Manager Button */}
					<IconButton
						aria-label="Open theme manager"
						onClick={onOpenThemeManager}
						variant="ghost"
						borderRadius="lg"
						bg="rgba(255,255,255,0.2)"
						_hover={{ bg: "rgba(255,255,255,0.3)", borderColor: "rgba(255,255,255,0.5)" }}
						borderWidth="1px"
						borderColor="rgba(255,255,255,0.3)"
						shadow="lg"
						size="md"
					>
						<Text fontSize="2xl">🎨</Text>
					</IconButton>
				</HStack>
			</Flex>
		</Box>
	);
}
