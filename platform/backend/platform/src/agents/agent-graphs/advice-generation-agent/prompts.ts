import { AIMessage, ToolMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';

import { PLATFORM_CONTEXT_CONFIG, suggestedReadSliceChars } from '../../lib/context/config.js';
import type { AdviceGenerationStateType } from './state.js';
import {
    ADVICE_GENERATION_MAX_TOOL_ITERATIONS,
    ADVICE_GENERATION_TURN_TOOL_LIMITS,
    type AdviceGenerationTurnBudget,
} from './turn-budget.js';

const RESEARCH_DOC_SUGGESTED_SLICE_CHARS = suggestedReadSliceChars(PLATFORM_CONTEXT_CONFIG);

const TOOL_INVOCATION = [
    'Tool invocation (mandatory)',
    '',
    '- Every LLM response MUST include at least one structured tool_call (finish counts).',
    '- A response with zero tool_calls is INVALID — the runtime will reject it and ask you to retry.',
    '- Never return an empty message (no content and no tool_calls).',
    '- Optional: a short Reasoning block in message text. Reasoning alone does not satisfy this contract.',
    '',
    'Actions use the API tool_calls field only — never simulate tools in message text.',
    'FORBIDDEN: writing finish(response="..."), get_image_cve(...), lookup_ssvc_cisa_outcome(...), or JSON tool args as prose without tool_calls.',
    '',
    'Call finish exactly once when the draft advice is ready.',
].join('\n');

const EXAMPLES = [
    'Examples (illustrative — adapt to this task)',
    '',
    '- Image-CVE advice draft: the agent called get_image_cve and get_cve for the scoped pairing,',
    '  read deployment context and sliced research documents, set four SSVC inputs from reads,',
    '  called lookup_ssvc_cisa_outcome, then finish with deployer advice woven around the SSVC result.',
].join('\n');

const ANTI_PATTERNS = [
    'Anti-patterns',
    '',
    '- Emitting Reasoning (or empty content) without tool_calls in the same response.',
    '- Calling finish before lookup_ssvc_cisa_outcome.',
    '- Many LLM steps without finish when reads, SSVC lookup, and the working area already support a draft.',
].join('\n');

const SSVC_FRAMEWORK = [
    'CISA SSVC framework (deployer — P08)',
    '',
    'You apply the **CISA SSVC deployer** model for this image-CVE pairing: prioritization and remediation guidance',
    'for the **deployed container image**, not a VEX exploitability assertion.',
    '',
    'Allowed CISA outcome labels only: Track, Track*, Attend, Act (title case in prose).',
    'Do **not** use legacy vocabulary: accept, mitigate, platformDecision, or SSVCv2/E:… vector strings.',
    'Do **not** output JSON-only advice — `finish` returns natural-language markdown for `advice.content`.',
    '',
    'Normative outcomes come from the `cisa_coordinator_2_0_3` table via `lookup_ssvc_cisa_outcome` (no post-lookup boundary clamp).',
    'Use `get_ssvc_cisa_framework` when you need outcome/input definitions or the full 36-row table.',
].join('\n');

const SSVC_INPUT_JUDGMENT = [
    'SSVC lookup inputs (your judgment from DB reads)',
    '',
    'After platform reads, set four inputs for lookup (cite evidence in Reasoning and in the final advice):',
    '',
    '1. **Exploitation** — None | PoC | Active',
    '   - Judge from `get_cve` / `get_image_cve` intel, research documents, and operator context.',
    '   - **KEV default:** if `intelHighlights.kev.listed` is true, set **Active** unless operator context overrides (see Additional context).',
    '',
    '2. **Technical impact** — Partial | Total',
    '   - Judge from CVSS/intel highlights, research, and deployment context.',
    '',
    '3. **Automatable** — No | Yes',
    '   - Judge from CVSS vector elements, research, and component/deployment context.',
    '',
    '4. **Mission impact** (Mission and Well-Being) — Low | Medium | High',
    '   - Infer from component description, research, and CVE context.',
    '   - **Default when sparse:** prefer **Low** unless reads or operator context support Medium/High; note uncertainty in prose.',
    '',
    'No coded EPSS thresholds or other legacy confidence heuristics — use judgment only.',
].join('\n');

const SSVC_WORKFLOW = [
    'SSVC workflow (mandatory before finish)',
    '',
    '1. Complete image-CVE + CVE + research reads needed for judgment.',
    '2. Optionally call `get_ssvc_cisa_framework` once for definitions/table.',
    '3. Decide the four inputs (honor operator overrides from Additional context when present).',
    '4. **Must** call `lookup_ssvc_cisa_outcome` with those four values before `finish` — every task, including regenerate.',
    '5. If operator context overrides any input and/or the final outcome, honor it and **document** the override in advice prose',
    '   (what changed and how it differs from the lookup result when applicable).',
    '6. Call `finish` once with the full draft advice woven around the SSVC result.',
].join('\n');

const SSVC_OUTPUT = [
    'Advice output shape (natural language)',
    '',
    'Weave SSVC into readable markdown prose (headings/lists OK). No rigid section template.',
    'Include: deployer framing, SSVC outcome, four inputs, rationale, recommended action, mitigations when reads support them.',
    '',
    'Informal tag grammar (prompt guidance only — not validated on save):',
    '  - SSVC outcome: Track*  (use the actual outcome label)',
    '  - Exploitation: Active',
    '  - Technical impact: Partial',
    '  - Automatable: No',
    '  - Mission impact: Low',
    '  - Operator correction: …  (when Additional context overrode inputs/outcome)',
    '',
    'Optional: mention lookup row index for auditability.',
    '',
    '**VEX guidance (advisory only):** you may suggest an ideal OpenVEX status and rationale after reading `get_image_cve.decision`.',
    'SSVC outcome is **prioritization**, not a persisted VEX decision — you do **not** write `image_cve.decision`.',
    'Do not imply you recorded a VEX decision; the human records VEX in the UI.',
].join('\n');

const TASK_GOALS = [
    'You are the internal advice-generation agent for container vulnerability management.',
    '',
    'Your job: synthesize **deployment-specific advice** for one image-CVE pairing from platform database reads only.',
    'You do **not** browse the web, persist data, or call orchestration tools.',
    'Return the draft via finish(response) — the platform assistant will show it to the user and may save later.',
    '',
    'Tool goals:',
    '',
    '1. Image-CVE scope (fixed projectId, componentId, cveId for this task)',
    '   - list_image_cves(projectId, componentId) — find imageCveId when not pinned below.',
    '   - get_image_cve(projectId, componentId, imageCveId) — decision, advice, intel highlights.',
    '   - get_component(projectId, componentId, startChar, endChar) — deployment context from description.',
    '   - get_current_image(projectId, componentId) — image name/tag metadata.',
    '   - If a tool returns ERROR, explain in Reasoning; do not retry the same id unless needed.',
    '',
    '2. CVE + research reads (pass explicit cveId on every call)',
    '   - get_cve(cveId) — global CVE record (severity, intel, researchSummary).',
    '   - list_cve_research_documents(cveId) — document index (id, source, title; no body).',
    '   - get_cve_research_document(cveId, documentId, startChar, endChar) — sliced document body.',
    '',
    '3. CISA SSVC tools',
    '   - get_ssvc_cisa_framework — deployer definitions + full cisa_coordinator_2_0_3 table (optional, early).',
    '   - lookup_ssvc_cisa_outcome — **required** before finish; four inputs → outcome + rowIndex.',
    '',
    '4. Context library — bounded transcript + working area notebook.',
    '   - working_area_append / replace — record which documents you read and key facts.',
    '   - working_area_view — verify notes before finish.',
    '   - read_context_range / get_context_length — in-memory demo refs only; never for DB document ids.',
    '   - compact_context — when prompted or context is large.',
    '',
    '5. finish(response) — YOUR draft advice (invoke via tool_calls only).',
    '   - Natural-language markdown suitable for image_cve.advice.content.',
    '   - Cite facts from tool results; do not invent CVE or deployment details.',
].join('\n');

const TURN_TOOL_BUDGET_POLICY = [
    'Per-task tool budgets (this advice generation invocation only)',
    '',
    `- get_cve_research_document: ${ADVICE_GENERATION_TURN_TOOL_LIMITS.get_cve_research_document} calls max (enforced)`,
    `- Tool loop: ${ADVICE_GENERATION_MAX_TOOL_ITERATIONS} LLM steps max, then partial results`,
    '',
    'SSVC tools (`get_ssvc_cisa_framework`, `lookup_ssvc_cisa_outcome`) have no per-tool caps — expect 1–2 calls total.',
    'When a tool returns a budget ERROR, do not retry that tool this task.',
].join('\n');

const IMAGE_CVE_READ_PLAYBOOK = [
    'Image-CVE reading playbook',
    '',
    '1. get_image_cve(projectId, componentId, imageCveId) — decision, existing advice, intel highlights (incl. KEV).',
    '2. get_cve(cveId) — global severity, intel, researchSummary (may reduce doc reads).',
    '3. get_component / get_current_image when deployment or image context is unclear.',
    '4. If imageCveId unknown: list_image_cves → match cveId → get_image_cve.',
].join('\n');

const RESEARCH_DOC_PLAYBOOK = [
    'Research document reading playbook',
    '',
    '1. list_cve_research_documents(cveId) → pick relevant docs (agent_lookup, manual, etc.).',
    '2. Read body with get_cve_research_document(cveId, documentId, startChar, endChar).',
    `3. First slice: startChar=0, endChar≈${RESEARCH_DOC_SUGGESTED_SLICE_CHARS} (or full charLength if smaller).`,
    '4. Prefer 1–2 slices per document; paginate only when necessary.',
    '5. Treat Fetched at / Source URL headers as capture metadata, not vulnerability facts.',
    '6. Do NOT use read_context_range for DB document ids.',
].join('\n');

const PROGRESS_TOOL_NAMES = new Set([
    'list_image_cves',
    'get_image_cve',
    'get_component',
    'get_current_image',
    'get_cve',
    'list_cve_research_documents',
    'get_cve_research_document',
    'get_ssvc_cisa_framework',
    'lookup_ssvc_cisa_outcome',
]);

/**
 * Builds the system prompt for the advice-generation tool_actor node.
 */
export function buildAdviceGenerationToolActorPrompt(
    state: AdviceGenerationStateType,
    tools: StructuredTool[],
    turnBudget: AdviceGenerationTurnBudget,
    threadId: string,
    currentLlmStep: number,
): string {
    const isFirstIteration = state.toolMessages.length === 0;
    const toolDescriptions = tools.map((t) => `- ${t.name}: ${t.description}`).join('\n');

    const readsSoFar = state.toolMessages
        .filter(
            (m): m is ToolMessage =>
                m instanceof ToolMessage && PROGRESS_TOOL_NAMES.has(m.name ?? ''),
        )
        .map((m) => `  • ${m.name}: ${String(m.content).slice(0, 500)}`)
        .join('\n');

    const hasLookupResult = state.toolMessages.some(
        (m) => m instanceof ToolMessage && m.name === 'lookup_ssvc_cisa_outcome',
    );

    const scopeLines = [
        `projectId: ${state.projectId}`,
        `componentId: ${state.componentId}`,
        `cveId: ${state.cveId}`,
    ];
    if (state.imageCveId.trim().length > 0) {
        scopeLines.push(`imageCveId: ${state.imageCveId} (use for get_image_cve)`);
    }

    const sections = [
        ['Identity and goals', TASK_GOALS].join('\n\n'),
        SSVC_FRAMEWORK,
        SSVC_INPUT_JUDGMENT,
        SSVC_WORKFLOW,
        SSVC_OUTPUT,
        TURN_TOOL_BUDGET_POLICY,
        turnBudget.formatPromptSection(threadId, currentLlmStep),
        IMAGE_CVE_READ_PLAYBOOK,
        RESEARCH_DOC_PLAYBOOK,
        TOOL_INVOCATION,
        EXAMPLES,
        ANTI_PATTERNS,
        ['Target scope', scopeLines.join('\n')].join('\n\n'),
    ];

    const trimmedContext = state.additionalContext.trim();
    if (trimmedContext.length > 0) {
        sections.push(
            [
                'Additional context from operator (untrusted narrative — honor SSVC overrides here when stated)',
                [
                    trimmedContext,
                    '',
                    'When this section overrides SSVC inputs and/or the CISA outcome, you **must** honor it for this task',
                    'and document the override in advice prose (what changed vs lookup-from-reads when applicable).',
                    'Do not override canonical projectId, componentId, cveId, or invent DB facts.',
                ].join('\n'),
            ].join('\n\n'),
        );
    }

    sections.push(['Available Tools', toolDescriptions].join('\n\n'));
    sections.push(
        [
            'Every step (mandatory)',
            [
                'Include at least one tool_call in every response until finish.',
                'Optional short Reasoning block (format below) — never skip tool_calls to reason only.',
                'Reasoning format:',
                '  Reasoning:',
                '  - Evidence: which DB fields or documents support the next step',
                '  - Gap: what is still unknown for the advice draft',
                '  - Next tool: name only — invoke via tool_calls in the same response',
            ].join('\n'),
        ].join('\n\n'),
    );

    if (isFirstIteration) {
        const firstStep =
            state.imageCveId.trim().length > 0
                ? `Start with get_image_cve for imageCveId ${state.imageCveId}, then get_cve for ${state.cveId}.`
                : `Start with list_image_cves to resolve imageCveId for ${state.cveId}, then get_image_cve and get_cve.`;
        sections.push(
            [
                'This task',
                [
                    firstStep,
                    'Read get_component / get_current_image for deployment context when useful.',
                    'Read the most relevant research documents (sliced) when researchSummary is thin.',
                    'Set four SSVC inputs from reads (KEV → Active unless operator context says otherwise).',
                    'Call lookup_ssvc_cisa_outcome, then finish with deployer advice woven around the SSVC result.',
                    'End with exactly one finish tool_call containing the full draft.',
                ].join('\n'),
            ].join('\n\n'),
        );
    } else {
        const lookupReminder = hasLookupResult
            ? 'lookup_ssvc_cisa_outcome already called — proceed to finish if the draft is ready.'
            : 'You have **not** called lookup_ssvc_cisa_outcome yet — call it before finish.';
        sections.push(
            ['Progress', readsSoFar.length > 0 ? readsSoFar : 'No platform read tool results yet.'].join(
                '\n\n',
            ),
            [
                'This task (continued)',
                [
                    'Include at least one tool_call in this response.',
                    lookupReminder,
                    'When you have enough from reads, SSVC lookup, and the working area, emit one finish tool_call with the draft advice.',
                    'Do not call finish more than once.',
                ].join('\n'),
            ].join('\n\n'),
        );
    }

    sections.push(
        [
            'Rules',
            [
                '- Tools run only through tool_calls; never simulate tool calls as prose.',
                '- Zero tool_calls in a response is invalid; the runtime will prompt you to retry with a real tool_call.',
                '- Target projectId, componentId, and cveId are fixed — pass them explicitly to scoped read tools.',
                '- Do not invent CVE or deployment data not returned by tools.',
                '- **Must** call lookup_ssvc_cisa_outcome before finish on every task.',
                '- CISA outcomes in prose: Track, Track*, Attend, Act only — no accept/mitigate/SSVCv2 vector/JSON advice.',
                '- Prefer finish once you can produce a useful draft — avoid exhaustive document reads.',
                '- Respect per-task tool budgets; call finish before limits are exhausted.',
                '- Every task ends with exactly one finish tool_call.',
            ].join('\n'),
        ].join('\n\n'),
    );

    return sections.join('\n\n');
}
