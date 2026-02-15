import { useState } from "react";
import { Box, Flex, HStack, Text, Badge, Textarea, Button, Card } from "@chakra-ui/react";
import type { HookEvent, HumanInTheLoopResponse } from "@/types";
import { API_BASE_URL } from "@/config";

interface HitlResponseCardProps {
	event: HookEvent
	sessionIdShort: string
	appHexColor: string
}

const hitlTypeConfig: Record<string, { emoji: string; label: string }> = {
	question: { emoji: "\u2753", label: "Agent Question" },
	permission: { emoji: "\uD83D\uDD10", label: "Permission Request" },
	choice: { emoji: "\uD83C\uDFAF", label: "Choice Required" },
};

function formatTime(timestamp?: number): string {
	if (!timestamp) return "";
	return new Date(timestamp).toLocaleTimeString();
}

export function HitlResponseCard({ event, sessionIdShort, appHexColor }: HitlResponseCardProps) {
	const [responseText, setResponseText] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [hasSubmittedResponse, setHasSubmittedResponse] = useState(false);
	const [localResponse, setLocalResponse] = useState<HumanInTheLoopResponse | null>(null);

	const hitl = event.humanInTheLoop!;
	const status = event.humanInTheLoopStatus?.status;
	const isResponded = hasSubmittedResponse || status === "responded";
	const typeConfig = hitlTypeConfig[hitl.type] || hitlTypeConfig.question;

	const displayResponse = localResponse || event.humanInTheLoopStatus?.response;

	const sendResponse = async (body: HumanInTheLoopResponse) => {
		setIsSubmitting(true);
		try {
			const res = await fetch(`${API_BASE_URL}/events/${event.id}/respond`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!res.ok) throw new Error("Failed to submit response");
		} catch (error) {
			console.error("Error submitting response:", error);
			// Rollback
			setLocalResponse(null);
			setHasSubmittedResponse(false);
			alert("Failed to submit response. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const submitResponse = async () => {
		if (!responseText.trim() || !event.id) return;
		const response: HumanInTheLoopResponse = {
			response: responseText.trim(),
			hookEvent: event,
			respondedAt: Date.now(),
		};
		setLocalResponse(response);
		setHasSubmittedResponse(true);
		const savedText = responseText;
		setResponseText("");
		try {
			await sendResponse(response);
		} catch {
			setResponseText(savedText);
		}
	};

	const submitPermission = async (approved: boolean) => {
		if (!event.id) return;
		const response: HumanInTheLoopResponse = {
			permission: approved,
			hookEvent: event,
			respondedAt: Date.now(),
		};
		setLocalResponse(response);
		setHasSubmittedResponse(true);
		await sendResponse(response);
	};

	const submitChoice = async (choice: string) => {
		if (!event.id) return;
		const response: HumanInTheLoopResponse = {
			choice,
			hookEvent: event,
			respondedAt: Date.now(),
		};
		setLocalResponse(response);
		setHasSubmittedResponse(true);
		await sendResponse(response);
	};

	const borderColor = isResponded ? "var(--theme-accent-success)" : "#EAB308";
	const bgFrom = isResponded ? "rgba(34,197,94,0.08)" : "rgba(234,179,8,0.08)";
	const bgTo = isResponded ? "rgba(34,197,94,0.12)" : "rgba(234,179,8,0.12)";

	return (
		<Card.Root
			mb="4"
			p="4"
			borderRadius="lg"
			borderWidth="2px"
			borderColor={borderColor}
			background={`linear-gradient(to right, ${bgFrom}, ${bgTo})`}
			shadow="lg"
			css={!isResponded ? { animation: "pulse-slow 2s ease-in-out infinite" } : undefined}
			onClick={(e: React.MouseEvent) => e.stopPropagation()}
		>
			{/* Question Header */}
			<Box mb="3">
				<Flex alignItems="center" justifyContent="space-between" mb="2">
					<HStack gap="2">
						<Text fontSize="2xl">{typeConfig.emoji}</Text>
						<Text
							fontSize="lg"
							fontWeight="bold"
							color={isResponded ? "var(--theme-accent-success)" : "#A16207"}
						>
							{typeConfig.label}
						</Text>
						{typeof event.payload?.permission_type === "string" && (
							<Badge
								fontSize="xs"
								fontFamily="mono"
								fontWeight="semibold"
								px="2"
								py="1"
								borderRadius="md"
								borderWidth="2px"
								borderColor="var(--theme-accent-info)"
								bg="rgba(59,130,246,0.1)"
								color="var(--theme-accent-info)"
							>
								{String(event.payload.permission_type)}
							</Badge>
						)}
					</HStack>
					{!isResponded && (
						<Text fontSize="xs" fontWeight="semibold" color="#A16207">
							{"\u23F1\uFE0F"} Waiting for response...
						</Text>
					)}
				</Flex>

				{/* Agent badges */}
				<HStack gap="2" ml="9">
					<Badge
						fontSize="xs"
						fontWeight="semibold"
						color="var(--theme-text-primary)"
						px="1.5"
						py="0.5"
						borderRadius="full"
						borderWidth="2px"
						borderColor={appHexColor}
						bg={appHexColor + "33"}
						shadow="sm"
					>
						{event.source_app}
					</Badge>
					<Badge
						fontSize="xs"
						color="var(--theme-text-secondary)"
						px="1.5"
						py="0.5"
						borderRadius="full"
						borderWidth="1px"
						borderColor="var(--theme-border-primary)"
						bg="var(--theme-bg-tertiary)"
						shadow="sm"
					>
						{sessionIdShort}
					</Badge>
					<Text fontSize="xs" color="var(--theme-text-tertiary)" fontWeight="medium">
						{formatTime(event.timestamp)}
					</Text>
				</HStack>
			</Box>

			{/* Question Text */}
			<Box
				mb="4"
				p="3"
				bg="var(--theme-bg-primary)"
				borderRadius="lg"
				borderWidth="1px"
				borderColor={isResponded ? "var(--theme-accent-success)" : "#FDE68A"}
			>
				<Text fontSize="md" fontWeight="medium" color="var(--theme-text-primary)">
					{hitl.question}
				</Text>
			</Box>

			{/* Response Display (Optimistic UI) */}
			{displayResponse && (
				<Box
					mb="4"
					p="3"
					bg="var(--theme-bg-primary)"
					borderRadius="lg"
					borderWidth="1px"
					borderColor="var(--theme-accent-success)"
				>
					<HStack mb="2">
						<Text fontSize="xl">{"\u2705"}</Text>
						<Text fontWeight="bold" color="var(--theme-accent-success)">
							Your Response:
						</Text>
					</HStack>
					{(displayResponse.response) && (
						<Text ml="7" color="var(--theme-text-primary)">
							{displayResponse.response}
						</Text>
					)}
					{displayResponse.permission !== undefined && (
						<Text ml="7" color="var(--theme-text-primary)">
							{displayResponse.permission ? "Approved \u2705" : "Denied \u274C"}
						</Text>
					)}
					{displayResponse.choice && (
						<Text ml="7" color="var(--theme-text-primary)">
							{displayResponse.choice}
						</Text>
					)}
				</Box>
			)}

			{/* Response UI */}
			{hitl.type === "question" && (
				<Box>
					<Textarea
						value={responseText}
						onChange={(e) => setResponseText(e.target.value)}
						placeholder="Type your response here..."
						rows={3}
						borderWidth="2px"
						borderColor="#EAB308"
						borderRadius="lg"
						resize="none"
						bg="var(--theme-bg-primary)"
						color="var(--theme-text-primary)"
						_focus={{ borderColor: "var(--theme-primary)", ring: "2px", ringColor: "var(--theme-primary)" }}
						onClick={(e: React.MouseEvent) => e.stopPropagation()}
					/>
					<Flex justifyContent="flex-end" mt="2">
						<Button
							onClick={submitResponse}
							disabled={!responseText.trim() || isSubmitting || hasSubmittedResponse}
							bg="var(--theme-accent-success)"
							color="white"
							fontWeight="bold"
							borderRadius="lg"
							shadow="md"
							_hover={{ opacity: 0.9, shadow: "lg" }}
							_disabled={{ bg: "gray.400", cursor: "not-allowed" }}
						>
							{isSubmitting ? "\u23F3 Sending..." : "\u2705 Submit Response"}
						</Button>
					</Flex>
				</Box>
			)}

			{hitl.type === "permission" && (
				<Flex justifyContent="flex-end" alignItems="center" gap="3">
					{isResponded && (
						<Box
							px="3"
							py="2"
							bg="rgba(34,197,94,0.1)"
							borderRadius="lg"
							borderWidth="1px"
							borderColor="var(--theme-accent-success)"
						>
							<Text fontSize="sm" fontWeight="bold" color="var(--theme-accent-success)">
								Responded
							</Text>
						</Box>
					)}
					<Button
						onClick={() => submitPermission(false)}
						disabled={isSubmitting || hasSubmittedResponse}
						bg="#DC2626"
						color="white"
						fontWeight="bold"
						borderRadius="lg"
						px="6"
						shadow="md"
						_hover={{ bg: "#B91C1C", shadow: "lg" }}
						opacity={hasSubmittedResponse ? 0.4 : 1}
					>
						{isSubmitting ? "\u23F3" : "\u274C Deny"}
					</Button>
					<Button
						onClick={() => submitPermission(true)}
						disabled={isSubmitting || hasSubmittedResponse}
						bg="var(--theme-accent-success)"
						color="white"
						fontWeight="bold"
						borderRadius="lg"
						px="6"
						shadow="md"
						_hover={{ opacity: 0.9, shadow: "lg" }}
						opacity={hasSubmittedResponse ? 0.4 : 1}
					>
						{isSubmitting ? "\u23F3" : "\u2705 Approve"}
					</Button>
				</Flex>
			)}

			{hitl.type === "choice" && (
				<Flex flexWrap="wrap" gap="2" justifyContent="flex-end">
					{hitl.choices?.map((choice) => (
						<Button
							key={choice}
							onClick={() => submitChoice(choice)}
							disabled={isSubmitting || hasSubmittedResponse}
							bg="var(--theme-accent-info)"
							color="white"
							fontWeight="bold"
							borderRadius="lg"
							px="4"
							shadow="md"
							_hover={{ opacity: 0.9, shadow: "lg" }}
							_disabled={{ bg: "gray.400", cursor: "not-allowed" }}
						>
							{isSubmitting ? "\u23F3" : choice}
						</Button>
					))}
				</Flex>
			)}
		</Card.Root>
	);
}
