# Claude Code Multi Agent Observability

## Instructions
> Follow these instructions as you work through the project.

### REMEMBER: Use source_app + session_id to uniquely identify an agent.

Every hook event will include a source_app and session_id. Use these to uniquely identify an agent.
For display purposes, we want to show the agent ID as "source_app:session_id" with session_id truncated to the first 8 characters.

### Zero API Keys Required

This system runs entirely locally with zero external API dependencies. No API keys are needed for the core observability pipeline (hooks → HTTP → SQLite → WebSocket → Vue dashboard). API keys are only needed for optional features like AI-generated summaries (Anthropic) or TTS notifications (OpenAI/ElevenLabs).