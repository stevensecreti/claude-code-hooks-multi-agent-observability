import { useState, useMemo, useCallback } from "react";
import { Box, Flex, Text, Button } from "@chakra-ui/react";
import type { ChatItem, ChatContent } from "../types";

interface ChatTranscriptProps {
	chat: ChatItem[]
}

export function ChatTranscript({ chat }: ChatTranscriptProps) {
	const [expandedDetails, setExpandedDetails] = useState<Set<number>>(new Set());
	const [copyStates, setCopyStates] = useState<Map<number, string>>(new Map());

	const toggleDetails = useCallback((index: number) => {
		setExpandedDetails((prev) => {
			const next = new Set(prev);
			if (next.has(index)) {
				next.delete(index);
			} else {
				next.add(index);
			}
			return next;
		});
	}, []);

	const copyMessage = useCallback(async (index: number, item: ChatItem) => {
		try {
			await navigator.clipboard.writeText(JSON.stringify(item, null, 2));
			setCopyStates((prev) => new Map(prev).set(index, "Copied"));
			setTimeout(() => {
				setCopyStates((prev) => {
					const next = new Map(prev);
					next.delete(index);
					return next;
				});
			}, 2000);
		} catch (err) {
			console.error("Failed to copy:", err);
			setCopyStates((prev) => new Map(prev).set(index, "Failed"));
			setTimeout(() => {
				setCopyStates((prev) => {
					const next = new Map(prev);
					next.delete(index);
					return next;
				});
			}, 2000);
		}
	}, []);

	const ANSI_ESC = String.fromCharCode(27);
	const cleanSystemContent = (content: string) =>
		content.replace(new RegExp(ANSI_ESC + "\\[[0-9;]*m", "g"), "");

	const cleanCommandContent = (content: string) =>
		content
			.replace(/<command-message>.*?<\/command-message>/gs, "")
			.replace(/<command-name>(.*?)<\/command-name>/gs, "$1")
			.trim();

	const formatTimestamp = (timestamp: string) => {
		const date = new Date(timestamp);
		return date.toLocaleTimeString();
	};

	const chatItems = useMemo(() => chat, [chat]);

	const ActionButtons = ({ index, item }: { index: number; item: ChatItem }) => (
		<Flex alignItems="center" gap="1" ml="2" flexShrink={0}>
			<Button
				size="xs"
				variant="ghost"
				onClick={() => toggleDetails(index)}
				fontSize="xs"
				fontWeight="medium"
				color="var(--theme-text-tertiary)"
				_hover={{ color: "var(--theme-text-primary)", bg: "var(--theme-bg-tertiary)" }}
			>
				{expandedDetails.has(index) ? "Hide" : "Show"} Details
			</Button>
			<Button
				size="xs"
				variant="ghost"
				onClick={() => copyMessage(index, item)}
				fontSize="xs"
				fontWeight="medium"
				color="var(--theme-text-tertiary)"
				_hover={{ color: "var(--theme-text-primary)", bg: "var(--theme-bg-tertiary)" }}
			>
				{copyStates.get(index) || "Copy"}
			</Button>
		</Flex>
	);

	const DetailsSection = ({ index, item }: { index: number; item: ChatItem }) =>
		expandedDetails.has(index) ? (
			<Box mt="3" p="3" bg="var(--theme-bg-tertiary)" borderRadius="lg">
				<Box
					as="pre"
					fontSize="xs"
					color="var(--theme-text-secondary)"
					overflowX="auto"
					whiteSpace="pre-wrap"
				>
					{JSON.stringify(item, null, 2)}
				</Box>
			</Box>
		) : null;

	const renderUserMessage = (item: ChatItem, index: number) => {
		const message = item.message;
		if (!message) return null;
		return (
			<Box key={index} p="3" borderRadius="lg" bg="blue.50" _dark={{ bg: "blue.900/30" }}>
				<Flex alignItems="flex-start" justifyContent="space-between">
					<Flex alignItems="flex-start" gap="3" flex="1">
						<Text
							as="span"
							fontSize="lg"
							fontWeight="semibold"
							px="3"
							py="1"
							borderRadius="full"
							flexShrink={0}
							bg="blue.500"
							color="white"
						>
							User
						</Text>
						<Box flex="1">
							{typeof message.content === "string" ? (
								<Text
									fontSize="lg"
									color="var(--theme-text-primary)"
									whiteSpace="pre-wrap"
									fontWeight="medium"
								>
									{message.content.includes("<command-")
										? cleanCommandContent(message.content)
										: message.content}
								</Text>
							) : Array.isArray(message.content) ? (
								<Box spaceY="2">
									{message.content.map((content: ChatContent, cIndex: number) => (
										<Box key={cIndex}>
											{content.type === "text" && (
												<Text
													fontSize="lg"
													color="var(--theme-text-primary)"
													whiteSpace="pre-wrap"
													fontWeight="medium"
												>
													{content.text}
												</Text>
											)}
											{content.type === "tool_result" && (
												<Box bg="var(--theme-bg-tertiary)" p="2" borderRadius="md">
													<Text fontSize="sm" fontFamily="mono" color="var(--theme-text-tertiary)">
														Tool Result:
													</Text>
													<Box as="pre" fontSize="sm" color="var(--theme-text-secondary)" mt="1">
														{typeof content.content === "string" ? content.content : JSON.stringify(content.content)}
													</Box>
												</Box>
											)}
										</Box>
									))}
								</Box>
							) : null}
							{item.timestamp && (
								<Text mt="2" fontSize="xs" color="var(--theme-text-quaternary)">
									{formatTimestamp(item.timestamp)}
								</Text>
							)}
						</Box>
					</Flex>
					<ActionButtons index={index} item={item} />
				</Flex>
				<DetailsSection index={index} item={item} />
			</Box>
		);
	};

	const renderAssistantMessage = (item: ChatItem, index: number) => {
		const message = item.message;
		if (!message) return null;
		return (
			<Box key={index} p="3" borderRadius="lg" bg="gray.50" _dark={{ bg: "gray.900/30" }}>
				<Flex alignItems="flex-start" justifyContent="space-between">
					<Flex alignItems="flex-start" gap="3" flex="1">
						<Text
							as="span"
							fontSize="lg"
							fontWeight="semibold"
							px="3"
							py="1"
							borderRadius="full"
							flexShrink={0}
							bg="gray.500"
							color="white"
						>
							Assistant
						</Text>
						<Box flex="1">
							{Array.isArray(message.content) && (
								<Box spaceY="2">
									{message.content.map((content: ChatContent, cIndex: number) => (
										<Box key={cIndex}>
											{content.type === "text" && (
												<Text
													fontSize="lg"
													color="var(--theme-text-primary)"
													whiteSpace="pre-wrap"
													fontWeight="medium"
												>
													{content.text}
												</Text>
											)}
											{content.type === "tool_use" && (
												<Box
													bg="yellow.50"
													_dark={{ bg: "yellow.900/20" }}
													p="3"
													borderRadius="md"
													borderWidth="1px"
													borderColor="yellow.200"
												>
													<Flex alignItems="center" gap="2" mb="2">
														<Text fontSize="2xl">&#x1F527;</Text>
														<Text fontWeight="semibold" color="yellow.800" _dark={{ color: "yellow.200" }}>
															{content.name}
														</Text>
													</Flex>
													<Box
														as="pre"
														fontSize="sm"
														color="var(--theme-text-secondary)"
														overflowX="auto"
													>
														{JSON.stringify(content.input, null, 2)}
													</Box>
												</Box>
											)}
										</Box>
									))}
								</Box>
							)}
							{message.usage && (
								<Text mt="2" fontSize="xs" color="var(--theme-text-quaternary)">
									Tokens: {message.usage.input_tokens} in / {message.usage.output_tokens} out
								</Text>
							)}
							{item.timestamp && (
								<Text mt="1" fontSize="xs" color="var(--theme-text-quaternary)">
									{formatTimestamp(item.timestamp)}
								</Text>
							)}
						</Box>
					</Flex>
					<ActionButtons index={index} item={item} />
				</Flex>
				<DetailsSection index={index} item={item} />
			</Box>
		);
	};

	const renderSystemMessage = (item: ChatItem, index: number) => (
		<Box
			key={index}
			p="3"
			borderRadius="lg"
			bg="orange.50"
			_dark={{ bg: "orange.900/20" }}
			borderWidth="1px"
			borderColor="orange.200"
		>
			<Flex alignItems="flex-start" justifyContent="space-between">
				<Flex alignItems="flex-start" gap="3" flex="1">
					<Text
						as="span"
						fontSize="lg"
						fontWeight="semibold"
						px="3"
						py="1"
						borderRadius="full"
						flexShrink={0}
						bg="orange.600"
						color="white"
					>
						System
					</Text>
					<Box flex="1">
						<Text fontSize="lg" color="var(--theme-text-primary)" fontWeight="medium">
							{cleanSystemContent(item.content || "")}
						</Text>
						{item.toolUseID && (
							<Text mt="1" fontSize="xs" color="var(--theme-text-quaternary)" fontFamily="mono">
								Tool ID: {item.toolUseID}
							</Text>
						)}
						{item.timestamp && (
							<Text mt="1" fontSize="xs" color="var(--theme-text-quaternary)">
								{formatTimestamp(item.timestamp)}
							</Text>
						)}
					</Box>
				</Flex>
				<ActionButtons index={index} item={item} />
			</Flex>
			<DetailsSection index={index} item={item} />
		</Box>
	);

	const renderFallbackMessage = (item: ChatItem, index: number) => (
		<Box
			key={index}
			p="3"
			borderRadius="lg"
			bg={item.role === "user" ? "blue.50" : "gray.50"}
			_dark={{ bg: item.role === "user" ? "blue.900/30" : "gray.900/30" }}
		>
			<Flex alignItems="flex-start" justifyContent="space-between">
				<Flex alignItems="flex-start" gap="3" flex="1">
					<Text
						as="span"
						fontSize="lg"
						fontWeight="semibold"
						px="3"
						py="1"
						borderRadius="full"
						flexShrink={0}
						bg={item.role === "user" ? "blue.500" : "gray.500"}
						color="white"
					>
						{item.role === "user" ? "User" : "Assistant"}
					</Text>
					<Box flex="1">
						<Text
							fontSize="lg"
							color="var(--theme-text-primary)"
							whiteSpace="pre-wrap"
							fontWeight="medium"
						>
							{item.content}
						</Text>
					</Box>
				</Flex>
				<ActionButtons index={index} item={item} />
			</Flex>
			<DetailsSection index={index} item={item} />
		</Box>
	);

	return (
		<Box
			bg="var(--theme-bg-primary)"
			borderRadius="lg"
			p="4"
			h="full"
			overflowY="auto"
			spaceY="3"
			borderWidth="2px"
			borderColor="var(--theme-border-secondary)"
		>
			{chatItems.map((item, index) => {
				if (item.type === "user" && item.message) {
					return renderUserMessage(item, index);
				}
				if (item.type === "assistant" && item.message) {
					return renderAssistantMessage(item, index);
				}
				if (item.type === "system") {
					return renderSystemMessage(item, index);
				}
				if (item.role) {
					return renderFallbackMessage(item, index);
				}
				return null;
			})}
		</Box>
	);
}
