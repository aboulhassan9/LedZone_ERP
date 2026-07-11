-- 0080_ai_assistant_permissions: Module 13 (AI Assistant). No LLM provider is configured in
-- this environment (no ANTHROPIC_API_KEY/OPENAI_API_KEY-equivalent, no AI SDK dependency in
-- package.json) -- natural-language queries and report summarization are deliberately NOT
-- built as a fake chat interface that would return canned or non-functional responses. That
-- would violate this project's standing rule against fabricated functionality, the same
-- discipline applied to Documents' e-signature (an internal record, not a faked DocuSign
-- integration) and Finance (no fake double-entry ledger). What ships instead is the one piece
-- that's real without an LLM: structured cross-module search ("equipment lookup... queries
-- across modules" from the module's own scope note). Gated by a single permission, same
-- single-gate pattern Reports used for reports.view.

insert into public.permissions (key, module, action, description) values
  ('ai_assistant.view', 'ai_assistant', 'view', 'Use cross-module search');
