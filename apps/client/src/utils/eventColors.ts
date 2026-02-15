const HEX_PALETTE = [
	"#3B82F6", "#22C55E", "#EAB308", "#A855F7", "#EC4899",
	"#6366F1", "#EF4444", "#F97316", "#14B8A6", "#06B6D4",
];

function hashString(str: string): number {
	let hash = 7151;
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) + hash) + str.charCodeAt(i);
	}
	return Math.abs(hash >>> 0);
}

export function getHexColorForSession(sessionId: string): string {
	const hash = hashString(sessionId);
	const index = hash % HEX_PALETTE.length;
	return HEX_PALETTE[index];
}

export function getHexColorForApp(appName: string): string {
	const hash = hashString(appName);
	const hue = hash % 360;
	return `hsl(${hue}, 70%, 50%)`;
}
