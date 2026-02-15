const eventTypeToEmoji: Record<string, string> = {
	"PreToolUse": "🔧",
	"PostToolUse": "✅",
	"PostToolUseFailure": "❌",
	"PermissionRequest": "🔐",
	"Notification": "🔔",
	"Stop": "🛑",
	"SubagentStart": "🟢",
	"SubagentStop": "👥",
	"PreCompact": "📦",
	"UserPromptSubmit": "💬",
	"SessionStart": "🚀",
	"SessionEnd": "🏁",
	"default": "❓",
};

const toolNameToEmoji: Record<string, string> = {
	"Bash": "💻",
	"Read": "📖",
	"Write": "✍️",
	"Edit": "✏️",
	"MultiEdit": "✏️",
	"Glob": "🔍",
	"Grep": "🔎",
	"WebFetch": "🌐",
	"WebSearch": "🔍",
	"NotebookEdit": "📓",
	"Task": "🤖",
	"TaskCreate": "📋",
	"TaskGet": "📄",
	"TaskUpdate": "📝",
	"TaskList": "📑",
	"TaskOutput": "📤",
	"TaskStop": "⏹️",
	"TeamCreate": "👥",
	"TeamDelete": "🗑️",
	"SendMessage": "💬",
	"EnterPlanMode": "🗺️",
	"ExitPlanMode": "🚪",
	"AskUserQuestion": "❓",
	"Skill": "⚡",
	"default": "🔧",
};

export function getEmojiForEventType(eventType: string): string {
	return eventTypeToEmoji[eventType] || eventTypeToEmoji.default;
}

export function getEmojiForToolName(toolName: string): string {
	if (toolNameToEmoji[toolName]) return toolNameToEmoji[toolName];
	if (toolName.startsWith("mcp__")) return "🔌";
	return toolNameToEmoji.default;
}

export function formatEventTypeLabel(eventTypes: Record<string, number>, toolEvents?: Record<string, number>): string {
	if (toolEvents && Object.keys(toolEvents).length > 0) {
		const allEntries: Array<[string, number, string]> = [];

		for (const [key, count] of Object.entries(toolEvents)) {
			const [eventType, toolName] = key.split(":");
			const combo = `${getEmojiForEventType(eventType)}+${getEmojiForToolName(toolName)}`;
			allEntries.push([key, count, combo]);
		}

		const toolEventTypes = new Set(Object.keys(toolEvents).map((k) => k.split(":")[0]));
		for (const [type, count] of Object.entries(eventTypes)) {
			if (!toolEventTypes.has(type)) {
				allEntries.push([type, count, getEmojiForEventType(type)]);
			}
		}

		allEntries.sort((a, b) => b[1] - a[1]);
		const topEntries = allEntries.slice(0, 3);

		return topEntries
			.map(([, count, emoji]) => count > 1 ? `${emoji}×${count}` : emoji)
			.join("");
	}

	const entries = Object.entries(eventTypes)
		.sort((a, b) => b[1] - a[1]);

	if (entries.length === 0) return "";

	const topEntries = entries.slice(0, 3);

	return topEntries
		.map(([type, count]) => {
			const emoji = getEmojiForEventType(type);
			return count > 1 ? `${emoji}×${count}` : emoji;
		})
		.join("");
}
