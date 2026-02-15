import { Box, Flex, Text, SimpleGrid, Button, Badge } from "@chakra-ui/react";
import {
	DialogBody,
	DialogCloseTrigger,
	DialogContent,
	DialogHeader,
	DialogRoot,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { useThemes } from "@/hooks/useThemes";

interface ThemeManagerProps {
	isOpen: boolean
	onClose: () => void
}

export function ThemeManager({ isOpen, onClose }: ThemeManagerProps) {
	const { state, predefinedThemes, setTheme } = useThemes();

	const selectTheme = (themeName: string) => {
		setTheme(themeName);
		onClose();
	};

	return (
		<DialogRoot
			open={isOpen}
			onOpenChange={(details) => {
				if (!details.open) onClose();
			}}
			size="xl"
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle fontSize="3xl" fontWeight="semibold">
						Theme Manager
					</DialogTitle>
				</DialogHeader>
				<DialogCloseTrigger />

				<DialogBody overflowY="auto">
					<SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="4" mb="6">
						{predefinedThemes.map((theme) => (
							<Box
								key={theme.name}
								onClick={() => selectTheme(theme.name)}
								cursor="pointer"
								borderRadius="lg"
								borderWidth="2px"
								borderColor={
									state.currentTheme === theme.name
										? "blue.500"
										: "var(--theme-border-secondary)"
								}
								bg={
									state.currentTheme === theme.name
										? "blue.50"
										: "transparent"
								}
								p="4"
								transition="all 0.2s"
								_hover={{
									shadow: "md",
									borderColor:
                    state.currentTheme === theme.name
                    	? "blue.500"
                    	: "var(--theme-border-tertiary)",
								}}
							>
								{/* Color Preview Strip */}
								<Flex h="16" borderRadius="md" overflow="hidden" mb="3">
									<Box flex="1" bg={theme.preview.primary} />
									<Box flex="1" bg={theme.preview.secondary} />
									<Box flex="1" bg={theme.preview.accent} />
								</Flex>

								{/* Theme Info */}
								<Text fontWeight="medium" color="var(--theme-text-primary)">
									{theme.displayName}
								</Text>
								<Text fontSize="sm" color="var(--theme-text-tertiary)" mt="1">
									{theme.description}
								</Text>

								{/* Current indicator */}
								{state.currentTheme === theme.name && (
									<Box mt="2">
										<Badge colorPalette="green" variant="subtle">
											Current
										</Badge>
									</Box>
								)}
							</Box>
						))}
					</SimpleGrid>
				</DialogBody>

				<DialogFooter>
					<Flex
						w="full"
						justifyContent="space-between"
						alignItems="center"
					>
						<Text fontSize="sm" color="var(--theme-text-tertiary)">
							{predefinedThemes.length} themes available
						</Text>
						<Button
							onClick={onClose}
							variant="outline"
							bg="var(--theme-bg-tertiary)"
							color="var(--theme-text-secondary)"
							_hover={{ bg: "var(--theme-bg-quaternary)" }}
						>
							Close
						</Button>
					</Flex>
				</DialogFooter>
			</DialogContent>
		</DialogRoot>
	);
}
