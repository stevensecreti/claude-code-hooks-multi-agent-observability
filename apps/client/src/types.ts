// New interface for human-in-the-loop requests
export interface HumanInTheLoop {
	question: string;
	responseWebSocketUrl: string;
	type: "question" | "permission" | "choice";
	choices?: string[]; // For multiple choice questions
	timeout?: number; // Optional timeout in seconds
	requiresResponse?: boolean; // Whether response is required or optional
}

// Response interface
export interface HumanInTheLoopResponse {
	response?: string;
	permission?: boolean;
	choice?: string; // Selected choice from options
	hookEvent: HookEvent;
	respondedAt: number;
	respondedBy?: string; // Optional user identifier
}

// Status tracking interface
export interface HumanInTheLoopStatus {
	status: "pending" | "responded" | "timeout" | "error";
	respondedAt?: number;
	response?: HumanInTheLoopResponse;
}

export interface EventPayload {
	tool_name?: string;
	tool_input?: EventToolInput;
	prompt?: string;
	trigger?: string;
	source?: string;
	[key: string]: unknown;
}

export interface EventToolInput {
	command?: string;
	file_path?: string;
	pattern?: string;
	url?: string;
	query?: string;
	notebook_path?: string;
	recipient?: string;
	summary?: string;
	subject?: string;
	taskId?: string;
	status?: string;
	description?: string;
	subagent_type?: string;
	task_id?: string;
	team_name?: string;
	skill?: string;
	[key: string]: unknown;
}

export interface HookEvent {
	id?: number;
	source_app: string;
	session_id: string;
	hook_event_type: string;
	payload: EventPayload;
	chat?: ChatItem[];
	summary?: string;
	timestamp?: number;
	model_name?: string;

	// HITL data
	humanInTheLoop?: HumanInTheLoop;
	humanInTheLoopStatus?: HumanInTheLoopStatus;
}

export interface FilterOptions {
	source_apps: string[];
	session_ids: string[];
	hook_event_types: string[];
}

export interface WebSocketMessage {
	type: "initial" | "event" | "hitl_response";
	data: HookEvent | HookEvent[] | HumanInTheLoopResponse;
}

export type TimeRange = "1m" | "3m" | "5m" | "10m";

export interface ChartDataPoint {
	timestamp: number;
	count: number;
	eventTypes: Record<string, number>; // event type -> count
	toolEvents?: Record<string, number>; // "EventType:ToolName" -> count (e.g., "PreToolUse:Bash" -> 3)
	sessions: Record<string, number>; // session id -> count
}

export interface ChartConfig {
	maxDataPoints: number;
	animationDuration: number;
	barWidth: number;
	barGap: number;
	colors: {
		primary: string;
		glow: string;
		axis: string;
		text: string;
	};
}

// Chat message types
export interface ChatContentText {
	type: "text";
	text: string;
}

export interface ChatContentToolUse {
	type: "tool_use";
	id?: string;
	name: string;
	input: Record<string, unknown>;
}

export interface ChatContentToolResult {
	type: "tool_result";
	tool_use_id?: string;
	content: string | unknown;
}

export type ChatContent = ChatContentText | ChatContentToolUse | ChatContentToolResult;

export interface ChatMessageData {
	role: "user" | "assistant" | "system";
	content: string | ChatContent[];
	usage?: {
		input_tokens: number;
		output_tokens: number;
	};
}

export interface ChatItem {
	type?: "user" | "assistant" | "system";
	role?: "user" | "assistant" | "system";
	content?: string;
	message?: ChatMessageData;
	timestamp?: string;
	toolUseID?: string;
	toolUseResult?: unknown;
	uuid?: string;
	sessionId?: string;
}
