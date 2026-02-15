import { useState, useMemo } from "react";
import { Box, Flex, HStack, Text, Badge, Card, IconButton, Code } from "@chakra-ui/react";
import type { HookEvent } from "@/types";
import { getEmojiForEventType, getEmojiForToolName } from "@/utils/eventEmojis";
import { HitlResponseCard } from "@/components/HitlResponseCard";
import { ChatTranscriptModal } from "@/components/ChatTranscriptModal";

interface EventRowProps {
	event: HookEvent
	appHexColor: string
}

function formatTime(timestamp?: number): string {
	if (!timestamp) return "";
	return new Date(timestamp).toLocaleTimeString();
}

function formatModelName(name: string | null | undefined): string {
	if (!name) return "";
	const parts = name.split("-");
	if (parts.length >= 4) {
		return `${parts[1]}-${parts[2]}-${parts[3]}`;
	}
	return name;
}

function getToolName(event: HookEvent): string | null {
	const toolEvents = ["PreToolUse", "PostToolUse", "PostToolUseFailure", "PermissionRequest"];
	if (toolEvents.includes(event.hook_event_type) && event.payload?.tool_name) {
		return event.payload.tool_name;
	}
	return null;
}

function getToolInfo(event: HookEvent): { tool: string; detail?: string } | null {
	const payload = event.payload;

	if (event.hook_event_type === "UserPromptSubmit" && payload.prompt) {
		const prompt = payload.prompt as string;
		return {
			tool: "Prompt:",
			detail: `"${prompt.slice(0, 100)}${prompt.length > 100 ? "..." : ""}"`,
		};
	}

	if (event.hook_event_type === "PreCompact") {
		const trigger = payload.trigger || "unknown";
		return {
			tool: "Compaction:",
			detail: trigger === "manual" ? "Manual compaction" : "Auto-compaction (full context)",
		};
	}

	if (event.hook_event_type === "SessionStart") {
		const source = payload.source || "unknown";
		const sourceLabels: Record<string, string> = {
			startup: "New session",
			resume: "Resuming session",
			clear: "Fresh session",
		};
		return { tool: "Session:", detail: sourceLabels[source] || source };
	}

	if (payload.tool_name) {
		const info: { tool: string; detail?: string } = { tool: payload.tool_name };
		const input = payload.tool_input;
		if (input) {
			if (input.command) {
				info.detail = input.command.slice(0, 50) + (input.command.length > 50 ? "..." : "");
			} else if (input.file_path) {
				info.detail = input.file_path.split("/").pop();
			} else if (input.pattern) {
				info.detail = input.pattern;
			} else if (input.url) {
				info.detail = input.url.slice(0, 60) + (input.url.length > 60 ? "..." : "");
			} else if (input.query) {
				info.detail = `"${input.query.slice(0, 50)}${input.query.length > 50 ? "..." : ""}"`;
			} else if (input.notebook_path) {
				info.detail = input.notebook_path.split("/").pop();
			} else if (input.recipient) {
				info.detail = `\u2192 ${input.recipient}${input.summary ? ": " + input.summary : ""}`;
			} else if (input.subject) {
				info.detail = input.subject;
			} else if (input.taskId) {
				info.detail = `#${input.taskId}${input.status ? " \u2192 " + input.status : ""}`;
			} else if (input.description && input.subagent_type) {
				info.detail = `${input.subagent_type}: ${input.description}`;
			} else if (input.task_id) {
				info.detail = `task: ${input.task_id}`;
			} else if (input.team_name) {
				info.detail = input.team_name;
			} else if (input.skill) {
				info.detail = input.skill;
			}
		}
		return info;
	}

	return null;
}

export function EventRow({ event, appHexColor }: EventRowProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [showChatModal, setShowChatModal] = useState(false);
	const [copyButtonText, setCopyButtonText] = useState("\uD83D\uDCCB Copy");

	const sessionIdShort = event.session_id.slice(0, 8);
	const toolName = getToolName(event);
	const toolInfo = getToolInfo(event);

	const hookEmoji = useMemo(() => {
		const baseEmoji = getEmojiForEventType(event.hook_event_type);
		const toolEventTypes = ["PreToolUse", "PostToolUse", "PostToolUseFailure", "PermissionRequest"];
		if (toolEventTypes.includes(event.hook_event_type) && event.payload?.tool_name) {
			return `${baseEmoji}${getEmojiForToolName(event.payload.tool_name)}`;
		}
		return baseEmoji;
	}, [event.hook_event_type, event.payload.tool_name]);

	const toolEmoji = toolName ? getEmojiForToolName(toolName) : "";

	const formattedPayload = useMemo(
		() => JSON.stringify(event.payload, null, 2),
		[event.payload],
	);

	const copyPayload = async () => {
		try {
			await navigator.clipboard.writeText(formattedPayload);
			setCopyButtonText("\u2705 Copied!");
			setTimeout(() => setCopyButtonText("\uD83D\uDCCB Copy"), 2000);
		} catch (err) {
			console.error("Failed to copy:", err);
			setCopyButtonText("\u274C Failed");
			setTimeout(() => setCopyButtonText("\uD83D\uDCCB Copy"), 2000);
		}
	};

	// If HITL event, render the response card
	if (event.humanInTheLoop) {
		const isPendingOrResponded =
			event.humanInTheLoopStatus?.status === "pending" ||
      event.humanInTheLoopStatus?.status === "responded";
		if (isPendingOrResponded) {
			return (
				<HitlResponseCard
					event={event}
					sessionIdShort={sessionIdShort}
					appHexColor={appHexColor}
				/>
			);
		}
	}

	return (
		<>
			<Card.Root
				position="relative"
				p={{ base: "2", md: "4" }}
				borderRadius="lg"
				shadow="lg"
				cursor="pointer"
				borderWidth="1px"
				borderColor={isExpanded ? "var(--theme-primary)" : "var(--theme-border-primary)"}
				bg="linear-gradient(to right, var(--theme-bg-primary), var(--theme-bg-secondary))"
				_hover={{ shadow: "xl", borderColor: "var(--theme-primary)" }}
				css={isExpanded ? { ring: "2px", ringColor: "var(--theme-primary)", shadow: "0 25px 50px -12px rgba(0,0,0,0.25)" } : undefined}
				onClick={() => setIsExpanded(!isExpanded)}
				transition="all 0.3s"
			>
				{/* App color indicator bar */}
				<Box
					position="absolute"
					left="0"
					top="0"
					bottom="0"
					w="3"
					borderLeftRadius="lg"
					bg={appHexColor}
				/>

				{/* Session color indicator */}
				<Box
					position="absolute"
					left="3"
					top="0"
					bottom="0"
					w="1.5"
					bg={appHexColor}
					opacity="0.4"
				/>

				<Box ml="4">
					{/* Mobile Layout */}
					<Box display={{ base: "block", md: "none" }} mb="2">
						{/* Mobile: App + Time on first row */}
						<Flex alignItems="center" justifyContent="space-between" mb="1">
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
								shadow="md"
							>
								{event.source_app}
							</Badge>
							<Text fontSize="xs" color="var(--theme-text-tertiary)" fontWeight="medium">
								{formatTime(event.timestamp)}
							</Text>
						</Flex>

						{/* Mobile: Session + Event Type on second row */}
						<HStack gap="2">
							<Badge
								fontSize="xs"
								color="var(--theme-text-secondary)"
								px="1.5"
								py="0.5"
								borderRadius="full"
								borderWidth="1px"
								borderColor="var(--theme-border-primary)"
								bg="var(--theme-bg-tertiary)"
							>
								{sessionIdShort}
							</Badge>
							{event.model_name && (
								<Badge
									fontSize="xs"
									color="var(--theme-text-secondary)"
									px="1.5"
									py="0.5"
									borderRadius="full"
									borderWidth="1px"
									bg="var(--theme-bg-tertiary)"
									shadow="sm"
									title={`Model: ${event.model_name}`}
								>
									{"\uD83E\uDDE0"} {formatModelName(event.model_name)}
								</Badge>
							)}
							<Badge
								fontSize="xs"
								fontWeight="bold"
								bg="var(--theme-primary)"
								color="white"
								px="1.5"
								py="0.5"
								borderRadius="full"
								shadow="md"
							>
								<Text as="span" mr="1" fontSize="sm">
									{hookEmoji}
								</Text>
								{event.hook_event_type}
							</Badge>
							{toolName && (
								<Badge
									fontSize="xs"
									fontWeight="semibold"
									borderWidth="2px"
									borderColor="var(--theme-primary)"
									color="var(--theme-primary)"
									bg="var(--theme-primary-light)"
									px="1.5"
									py="0.5"
									borderRadius="full"
									shadow="sm"
								>
									{toolEmoji} {toolName}
								</Badge>
							)}
						</HStack>
					</Box>

					{/* Desktop Layout */}
					<Flex
						display={{ base: "none", md: "flex" }}
						alignItems="center"
						justifyContent="space-between"
						mb="2"
					>
						<HStack gap="4">
							<Badge
								fontSize="md"
								fontWeight="bold"
								color="var(--theme-text-primary)"
								px="2"
								py="0.5"
								borderRadius="full"
								borderWidth="2px"
								borderColor={appHexColor}
								bg={appHexColor + "33"}
								shadow="lg"
							>
								{event.source_app}
							</Badge>
							<Badge
								fontSize="sm"
								color="var(--theme-text-secondary)"
								px="2"
								py="0.5"
								borderRadius="full"
								borderWidth="1px"
								borderColor="var(--theme-border-primary)"
								bg="var(--theme-bg-tertiary)"
								shadow="md"
							>
								{sessionIdShort}
							</Badge>
							{event.model_name && (
								<Badge
									fontSize="sm"
									color="var(--theme-text-secondary)"
									px="2"
									py="0.5"
									borderRadius="full"
									borderWidth="1px"
									bg="var(--theme-bg-tertiary)"
									shadow="md"
									title={`Model: ${event.model_name}`}
								>
									{"\uD83E\uDDE0"} {formatModelName(event.model_name)}
								</Badge>
							)}
							<Badge
								fontSize="sm"
								fontWeight="bold"
								bg="var(--theme-primary)"
								color="white"
								px="3"
								py="0.5"
								borderRadius="full"
								shadow="lg"
							>
								<Text as="span" mr="1.5" fontSize="md">
									{hookEmoji}
								</Text>
								{event.hook_event_type}
							</Badge>
							{toolName && (
								<Badge
									fontSize="sm"
									fontWeight="semibold"
									borderWidth="2px"
									borderColor="var(--theme-primary)"
									color="var(--theme-primary)"
									bg="var(--theme-primary-light)"
									px="2.5"
									py="0.5"
									borderRadius="full"
									shadow="sm"
								>
									{toolEmoji} {toolName}
								</Badge>
							)}
						</HStack>
						<Text fontSize="sm" color="var(--theme-text-tertiary)" fontWeight="semibold">
							{formatTime(event.timestamp)}
						</Text>
					</Flex>

					{/* Tool info and Summary - Desktop */}
					<Flex
						display={{ base: "none", md: "flex" }}
						alignItems="center"
						justifyContent="space-between"
						mb="2"
					>
						{toolInfo && (
							<Text fontSize="md" color="var(--theme-text-secondary)" fontWeight="semibold">
								<Text
									as="span"
									fontWeight="medium"
									fontStyle="italic"
									px="2"
									py="0.5"
									borderRadius="md"
									borderWidth="2px"
									borderColor="var(--theme-primary)"
									bg="var(--theme-primary-light)"
									shadow="sm"
								>
									{toolInfo.tool}
								</Text>
								{toolInfo.detail && (
									<Text
										as="span"
										ml="2"
										color="var(--theme-text-tertiary)"
										fontStyle={event.hook_event_type === "UserPromptSubmit" ? "italic" : "normal"}
									>
										{toolInfo.detail}
									</Text>
								)}
							</Text>
						)}

						{event.summary && (
							<Box
								maxW="50%"
								px="3"
								py="1.5"
								bg="color-mix(in srgb, var(--theme-primary) 10%, transparent)"
								borderWidth="1px"
								borderColor="color-mix(in srgb, var(--theme-primary) 30%, transparent)"
								borderRadius="lg"
								shadow="md"
							>
								<Text fontSize="sm" color="var(--theme-text-primary)" fontWeight="semibold">
									{"\uD83D\uDCDD"} {event.summary}
								</Text>
							</Box>
						)}
					</Flex>

					{/* Tool info and Summary - Mobile */}
					<Box display={{ base: "block", md: "none" }} mb="2">
						{toolInfo && (
							<Text fontSize="sm" color="var(--theme-text-secondary)" fontWeight="semibold" w="full">
								<Text
									as="span"
									fontWeight="medium"
									fontStyle="italic"
									px="1.5"
									py="0.5"
									borderRadius="md"
									borderWidth="2px"
									borderColor="var(--theme-primary)"
									bg="var(--theme-primary-light)"
									shadow="sm"
								>
									{toolInfo.tool}
								</Text>
								{toolInfo.detail && (
									<Text
										as="span"
										ml="2"
										color="var(--theme-text-tertiary)"
										fontStyle={event.hook_event_type === "UserPromptSubmit" ? "italic" : "normal"}
									>
										{toolInfo.detail}
									</Text>
								)}
							</Text>
						)}
						{event.summary && (
							<Box
								mt="2"
								w="full"
								px="2"
								py="1"
								bg="color-mix(in srgb, var(--theme-primary) 10%, transparent)"
								borderWidth="1px"
								borderColor="color-mix(in srgb, var(--theme-primary) 30%, transparent)"
								borderRadius="lg"
								shadow="md"
							>
								<Text fontSize="xs" color="var(--theme-text-primary)" fontWeight="semibold">
									{"\uD83D\uDCDD"} {event.summary}
								</Text>
							</Box>
						)}
					</Box>

					{/* Expanded content */}
					{isExpanded && (
						<Box
							mt="2"
							pt="2"
							borderTopWidth="2px"
							borderTopColor="var(--theme-primary)"
							bg="linear-gradient(to right, var(--theme-bg-primary), var(--theme-bg-secondary))"
							borderBottomRadius="lg"
							p="3"
						>
							{/* Payload */}
							<Box>
								<Flex alignItems="center" justifyContent="space-between" mb="2">
									<Text
										fontSize={{ base: "sm", md: "md" }}
										fontWeight="bold"
										color="var(--theme-primary)"
									>
										{"\uD83D\uDCE6"} Payload
									</Text>
									<IconButton
										aria-label="Copy payload"
										size={{ base: "xs", md: "sm" }}
										bg="var(--theme-primary)"
										color="white"
										borderRadius="lg"
										shadow="md"
										_hover={{ opacity: 0.9, shadow: "lg" }}
										onClick={(e) => {
											e.stopPropagation();
											copyPayload();
										}}
									>
										<Text fontSize={{ base: "xs", md: "sm" }} fontWeight="bold">
											{copyButtonText}
										</Text>
									</IconButton>
								</Flex>
								<Code
									display="block"
									whiteSpace="pre-wrap"
									fontSize={{ base: "xs", md: "sm" }}
									color="var(--theme-text-primary)"
									bg="var(--theme-bg-tertiary)"
									p={{ base: "2", md: "3" }}
									borderRadius="lg"
									overflowX="auto"
									maxH="64"
									overflowY="auto"
									fontFamily="mono"
									borderWidth="1px"
									borderColor="color-mix(in srgb, var(--theme-primary) 30%, transparent)"
									shadow="md"
									_hover={{ shadow: "lg" }}
									transition="shadow 0.2s"
								>
									{formattedPayload}
								</Code>
							</Box>

							{/* Chat transcript button */}
							{event.chat && event.chat.length > 0 && (
								<Flex justifyContent="flex-end" mt="3">
									<Box
										as="button"
										display="flex"
										alignItems="center"
										gap="1.5"
										px={{ base: "3", md: "4" }}
										py={{ base: "1.5", md: "2" }}
										fontWeight="bold"
										borderRadius="lg"
										shadow="md"
										bg="linear-gradient(to right, var(--theme-primary), var(--theme-primary-light))"
										color="white"
										borderWidth="1px"
										borderColor="var(--theme-primary-dark)"
										_hover={{ opacity: 0.9, shadow: "lg" }}
										transition="all 0.2s"
										onClick={(e: React.MouseEvent) => {
											e.stopPropagation();
											setShowChatModal(true);
										}}
									>
										<Text fontSize={{ base: "sm", md: "md" }}>{"\uD83D\uDCAC"}</Text>
										<Text fontSize={{ base: "xs", md: "sm" }} fontWeight="bold">
											View Chat Transcript ({event.chat.length} messages)
										</Text>
									</Box>
								</Flex>
							)}
						</Box>
					)}
				</Box>
			</Card.Root>

			{/* Chat Modal */}
			{event.chat && event.chat.length > 0 && (
				<ChatTranscriptModal
					isOpen={showChatModal}
					chat={event.chat}
					onClose={() => setShowChatModal(false)}
				/>
			)}
		</>
	);
}
