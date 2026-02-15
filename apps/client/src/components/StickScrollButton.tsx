import { IconButton } from "@chakra-ui/react";

interface StickScrollButtonProps {
	stickToBottom: boolean
	onToggle: () => void
}

export function StickScrollButton({ stickToBottom, onToggle }: StickScrollButtonProps) {
	return (
		<IconButton
			aria-label={stickToBottom ? "Disable auto-scroll" : "Enable auto-scroll"}
			onClick={onToggle}
			position="fixed"
			bottom={{ base: "4", md: "6" }}
			right={{ base: "4", md: "6" }}
			borderRadius="full"
			shadow="lg"
			_hover={{ shadow: "xl", transform: "scale(1.1)" }}
			transition="all 0.2s"
			minW="44px"
			minH="44px"
			size={{ base: "md", md: "lg" }}
			borderWidth="2px"
			bg={
				stickToBottom
					? "var(--theme-primary)"
					: "var(--theme-bg-primary)"
			}
			color={stickToBottom ? "white" : "var(--theme-text-primary)"}
			borderColor={
				stickToBottom
					? "var(--theme-primary-dark)"
					: "var(--theme-border-primary)"
			}
			_active={{ bg: stickToBottom ? "var(--theme-primary-dark)" : "var(--theme-bg-secondary)" }}
			zIndex="10"
		>
			<svg
				width="20"
				height="20"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				{stickToBottom ? (
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M19 14l-7 7m0 0l-7-7m7 7V3"
					/>
				) : (
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6v.01"
					/>
				)}
			</svg>
		</IconButton>
	);
}
