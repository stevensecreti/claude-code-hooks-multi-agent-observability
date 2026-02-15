import { useState, useCallback, useEffect, useMemo } from "react";
import { Box, Flex, Text, Button, Input } from "@chakra-ui/react";
import {
	DialogBody,
	DialogCloseTrigger,
	DialogContent,
	DialogHeader,
	DialogRoot,
	DialogTitle,
} from "@/components/ui/dialog";
import { ChatTranscript } from "./ChatTranscript";
import type { ChatItem } from "../types";

interface ChatTranscriptModalProps {
	isOpen: boolean
	onClose: () => void
	chat: ChatItem[]
}

const FILTERS = [
	{ type: "user", label: "User" },
	{ type: "assistant", label: "Assistant" },
	{ type: "system", label: "System" },
	{ type: "tool_use", label: "Tool Use" },
	{ type: "tool_result", label: "Tool Result" },
	{ type: "Read", label: "Read" },
	{ type: "Write", label: "Write" },
	{ type: "Edit", label: "Edit" },
	{ type: "Glob", label: "Glob" },
];

export function ChatTranscriptModal({ isOpen, onClose, chat }: ChatTranscriptModalProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeSearchQuery, setActiveSearchQuery] = useState("");
	const [activeFilters, setActiveFilters] = useState<string[]>([]);
	const [copyAllText, setCopyAllText] = useState("Copy All");

	const toggleFilter = useCallback((type: string) => {
		setActiveFilters((prev) =>
			prev.includes(type) ? prev.filter((f) => f !== type) : [...prev, type],
		);
	}, []);

	const executeSearch = useCallback(() => {
		setActiveSearchQuery(searchQuery);
	}, [searchQuery]);

	const clearSearch = useCallback(() => {
		setSearchQuery("");
		setActiveSearchQuery("");
		setActiveFilters([]);
	}, []);

	const copyAllMessages = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(JSON.stringify(chat, null, 2));
			setCopyAllText("Copied!");
			setTimeout(() => setCopyAllText("Copy All"), 2000);
		} catch (err) {
			console.error("Failed to copy all messages:", err);
			setCopyAllText("Failed");
			setTimeout(() => setCopyAllText("Copy All"), 2000);
		}
	}, [chat]);

	// Reset on close — use onOpenChange callback instead of effect
	const handleOpenChange = useCallback((details: { open: boolean }) => {
		if (!details.open) {
			clearSearch();
			onClose();
		}
	}, [clearSearch, onClose]);

	// ESC key handler
	useEffect(() => {
		const handleKeydown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};
		document.addEventListener("keydown", handleKeydown);
		return () => document.removeEventListener("keydown", handleKeydown);
	}, [isOpen, onClose]);

	const matchesSearch = useCallback((item: ChatItem, query: string): boolean => {
		const lowerQuery = query.toLowerCase().trim();

		if (typeof item.content === "string") {
			// eslint-disable-next-line no-control-regex
			const cleanContent = item.content.replace(/\u001b\[[0-9;]*m/g, "").toLowerCase();
			if (cleanContent.includes(lowerQuery)) return true;
		}

		if (item.role && item.role.toLowerCase().includes(lowerQuery)) return true;

		if (item.message) {
			if (item.message.role && item.message.role.toLowerCase().includes(lowerQuery)) return true;
			if (item.message.content) {
				if (typeof item.message.content === "string" && item.message.content.toLowerCase().includes(lowerQuery)) return true;
				if (Array.isArray(item.message.content)) {
					for (const content of item.message.content) {
						if (content.type === "text" && content.text.toLowerCase().includes(lowerQuery)) return true;
						if (content.type === "tool_use") {
							if (content.name.toLowerCase().includes(lowerQuery)) return true;
							if (JSON.stringify(content.input).toLowerCase().includes(lowerQuery)) return true;
						}
						if (content.type === "tool_result") {
							const contentStr = typeof content.content === "string" ? content.content : JSON.stringify(content.content);
							if (contentStr.toLowerCase().includes(lowerQuery)) return true;
						}
					}
				}
			}
		}

		if (item.type && item.type.toLowerCase().includes(lowerQuery)) return true;
		if (item.uuid && item.uuid.toLowerCase().includes(lowerQuery)) return true;
		if (item.sessionId && item.sessionId.toLowerCase().includes(lowerQuery)) return true;
		if (item.toolUseResult && JSON.stringify(item.toolUseResult).toLowerCase().includes(lowerQuery)) return true;

		return false;
	}, []);

	const matchesFilters = useCallback((item: ChatItem): boolean => {
		if (activeFilters.length === 0) return true;

		if (item.type && activeFilters.includes(item.type)) return true;
		if (item.role && activeFilters.includes(item.role)) return true;

		if (item.type === "system" && item.content) {
			const toolNames = ["Read", "Write", "Edit", "Glob"];
			for (const tool of toolNames) {
				if (item.content.includes(tool) && activeFilters.includes(tool)) return true;
			}
		}

		if (item.message?.content && Array.isArray(item.message.content)) {
			for (const content of item.message.content) {
				if (content.type === "tool_use") {
					if (activeFilters.includes("tool_use")) return true;
					if (activeFilters.includes(content.name)) return true;
				}
				if (content.type === "tool_result" && activeFilters.includes("tool_result")) return true;
			}
		}

		return false;
	}, [activeFilters]);

	const filteredChat = useMemo(() => {
		if (!activeSearchQuery && activeFilters.length === 0) return chat;
		return chat.filter((item) => {
			const matchesQueryCondition = !activeSearchQuery || matchesSearch(item, activeSearchQuery);
			const matchesFilterCondition = matchesFilters(item);
			return matchesQueryCondition && matchesFilterCondition;
		});
	}, [chat, activeSearchQuery, activeFilters, matchesSearch, matchesFilters]);

	const hasActiveSearch = searchQuery || activeSearchQuery || activeFilters.length > 0;

	return (
		<DialogRoot
			open={isOpen}
			onOpenChange={handleOpenChange}
			size="xl"
		>
			<DialogContent
				style={{ width: "85vw", height: "85vh" }}
				overflow="hidden"
			>
				<DialogHeader pb="0">
					<DialogTitle fontSize={{ base: "lg", md: "3xl" }} fontWeight="semibold">
						Chat Transcript
					</DialogTitle>
				</DialogHeader>
				<DialogCloseTrigger />

				{/* Search and Filters */}
				<Box px="6" pt="4" pb="2" spaceY="3" flexShrink={0}>
					{/* Search Input */}
					<Flex gap="2">
						<Input
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && executeSearch()}
							placeholder="Search transcript..."
							flex="1"
							size="lg"
							borderColor="var(--theme-border-secondary)"
							bg="var(--theme-bg-primary)"
							color="var(--theme-text-primary)"
							_focus={{ borderColor: "blue.500", outline: "2px solid", outlineColor: "blue.500", outlineOffset: "0" }}
						/>
						<Button
							onClick={executeSearch}
							colorPalette="blue"
							size="lg"
							minW="44px"
						>
							Search
						</Button>
						<Button
							onClick={copyAllMessages}
							variant="outline"
							size="lg"
							minW="44px"
							color="var(--theme-text-secondary)"
						>
							{copyAllText}
						</Button>
					</Flex>

					{/* Filter Buttons */}
					<Flex
						flexWrap="wrap"
						gap="2"
						maxH="24"
						overflowY="auto"
						p="2"
						bg="var(--theme-bg-tertiary)"
						borderRadius="lg"
					>
						{FILTERS.map((filter) => (
							<Button
								key={filter.type}
								onClick={() => toggleFilter(filter.type)}
								size="sm"
								borderRadius="full"
								fontWeight="medium"
								minH="36px"
								whiteSpace="nowrap"
								bg={
									activeFilters.includes(filter.type)
										? "blue.500"
										: "var(--theme-bg-primary)"
								}
								color={
									activeFilters.includes(filter.type)
										? "white"
										: "var(--theme-text-secondary)"
								}
								_hover={{
									bg: activeFilters.includes(filter.type)
										? "blue.600"
										: "var(--theme-bg-secondary)",
								}}
							>
								{filter.label}
							</Button>
						))}

						{hasActiveSearch && (
							<Button
								onClick={clearSearch}
								size="sm"
								borderRadius="full"
								fontWeight="medium"
								minH="36px"
								whiteSpace="nowrap"
								bg="red.100"
								color="red.700"
								_hover={{ bg: "red.200" }}
							>
								Clear All
							</Button>
						)}
					</Flex>

					{/* Results Count */}
					{(activeSearchQuery || activeFilters.length > 0) && (
						<Text fontSize="sm" color="var(--theme-text-tertiary)">
							Showing {filteredChat.length} of {chat.length} messages
							{activeSearchQuery && (
								<Text as="span" ml="2" fontWeight="medium">
									(searching for &quot;{activeSearchQuery}&quot;)
								</Text>
							)}
						</Text>
					)}
				</Box>

				{/* Chat Content */}
				<DialogBody flex="1" overflow="hidden" display="flex" flexDirection="column" pt="2">
					<ChatTranscript chat={filteredChat} />
				</DialogBody>
			</DialogContent>
		</DialogRoot>
	);
}
