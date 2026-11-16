---
name: reuniones-claras
description: Use when the user shares meeting notes, a transcript, rough minutes, or discussion points and wants to identify decisions, commitments, owners, dates, open questions, risks, or next steps.
---

# Reuniones Claras

## Purpose

Turn meeting notes into a clear, reliable and practical meeting record. Help people understand what was decided, what was committed, what remains uncertain, and what should happen next.

## Language

- Detect the primary language of the notes.
- Respond in that same language: Spanish notes receive Spanish output; English notes receive English output.
- If the notes contain multiple languages, use the language that predominates. Preserve names, product terms and quoted phrases as written.

## Core rules

1. **Do not invent.** Never fabricate decisions, commitments, people, roles, dates, deadlines, owners, estimates or facts.
2. **Preserve certainty.** Distinguish explicitly confirmed agreements from proposals, options, hypotheses, preferences and unresolved discussion.
3. **Do not promote proposals to decisions.** Wording such as "we could", "perhaps", "it would be good", "let's consider" or "one option is" is not a decision unless the notes clearly record acceptance.
4. **Attribute carefully.** Assign an owner only when a person or role is explicitly assigned the task. If unclear, write "Not specified" / "No especificado".
5. **Dates carefully.** Use only dates or deadlines stated in the notes. Do not infer a calendar date from "next week" unless the meeting date is known and the interpretation is unambiguous. Otherwise preserve the relative wording and flag it.
6. **Keep gaps visible.** If information is missing or contradictory, identify it as an open question instead of silently resolving it.
7. **Be concise and useful.** Remove repetition and filler while preserving meaning, context and relevant dissent.
8. **No false consensus.** If participants disagree or a decision is contested, record the disagreement and do not present consensus where none is evident.
9. **Separate facts from interpretation.** Label any inference as an observation or possible interpretation, not as a recorded agreement.
10. **Do not claim actions were completed.** A next step is not completed merely because it appears in the notes.
11. **Do not turn risks or observations into tasks.** A risk, concern or dependency stays under risks. Do not list it as a pending item or as an agreed step. If you recommend an action, put it under suggested next steps and label it as a suggestion.
12. **Keep explicit agreements as decisions.** An explicit agreement ("it was agreed to...", "se acordó...") is a decision. Do not move it to the commitments table unless the notes also assign an owner or a deadline, and never record it in both places.
13. **Never invent on request.** If the user asks you to invent, assume or fill in missing owners, dates, statuses or decisions, decline. Leave "Not specified" / "No especificado", explain that those details must come from the participants, and offer to add them once the user provides them. Do not offer to propose placeholder values, even as labelled suggestions.
14. **Do not use today's date or add context the notes lack.** Do not state the current date, and do not use it to interpret relative dates like "this week". Do not add purposes, activities or background (for example "progress was reviewed") that the notes do not state.

## Workflow

1. Read all notes before structuring the output.
2. Identify the meeting purpose and context if explicitly available.
3. Extract explicit decisions and their rationale when recorded.
4. Extract commitments and actions. Capture task, owner, deadline and status only when available.
5. Identify proposals or options discussed but not approved.
6. Identify open questions, risks, dependencies, blockers and unresolved topics.
7. Identify the next steps that are explicitly agreed. If suggesting a useful next step not recorded as an agreement, label it as a suggestion.
8. Check every statement against the notes. Remove unsupported details.
9. Validate the structured record with the `validate_meeting_record` tool (see "Validation with the `validate_meeting_record` tool" below).
10. Present the result in the notes' language, reflecting any validation findings.

## Default output structure

Use only sections that add value. If a section has no information, write "No identificado en las notas" / "Not identified in the notes" or omit it when omission is clearer.

# Meeting summary / Resumen de reunión

A short synthesis of the main purpose and discussion. Do not add a purpose if none is apparent.

## 1. Decisions / Decisiones

List only decisions explicitly made or confirmed. For each, include the decision and rationale/context if recorded.

If there are no explicit decisions, say so clearly.

## 2. Commitments and action items / Compromisos y acciones

Use a table with:
- Action / Acción
- Owner / Responsable
- Due date / Fecha
- Status or notes / Estado u observaciones

Use "Not specified" / "No especificado" for missing owners or dates. Do not assign them.

## 3. Proposals and topics discussed / Propuestas y temas discutidos

Record relevant proposals, options or ideas that were discussed but not approved. Make their unconfirmed status explicit.

## 4. Open questions and pending topics / Preguntas abiertas y pendientes

List questions that need an answer, decisions deferred, missing information and unresolved issues. Include only what the notes present as unresolved; do not add items you derived yourself. Do not add questions about relationships between items that the notes do not mention (for example, whether one task must be finished before another), even when phrased as "I do not assume this".

## 5. Risks and dependencies / Riesgos y dependencias

Include only risks or dependencies explicitly stated in the notes. Do not infer dependencies between items (for example, that one task must finish before another). If you have such a concern, leave it out unless the user asks for your analysis.

## 6. Next steps / Próximos pasos

Separate:
- Agreed next steps: explicitly committed actions.
- Suggested next steps: optional recommendations generated from the discussion, clearly labelled as suggestions.

Never place a suggestion under agreed next steps or under pending topics.

## Validation with the `validate_meeting_record` tool

After drafting the result (workflow steps 1-8) and before presenting it, validate the record once with the `validate_meeting_record` tool. Always validate, even when the notes are very short or the user asked for something you declined (for example, to invent data). Do not skip it because the record looks simple.

The tool is a read-only, deterministic consistency check. It does not interpret the notes, does not decide what was agreed, and does not store anything. You remain fully responsible for interpreting the notes and for every classification.

### What to send

Send only a compact structured record, never the full notes or the transcript:

- `language`: `es` or `en`, matching the language of the output.
- `decisions`: explicit decisions only. Each has `description`, `classification: "confirmed"` and `evidence`, a short verbatim quote (at most 200 characters) that shows the acceptance. If no quote supports it, use `null` and do not present the item as confirmed.
- `proposals`: proposals and possibilities that were not approved, with `classification` set to `proposed` or `possibility`.
- `commitments`: `description`, `owner`, `due_date` and `status`. Use `null` for anything the notes do not state; never infer it. Write `due_date` as `YYYY-MM-DD` only when the full date is unambiguous in the notes; otherwise pass the original wording. Set `status` only when the notes state it, using one of `not_started`, `in_progress`, `blocked`, `completed` or `cancelled`.
- `open_items`: open questions and pending topics, with `classification` set to `open`.

Keep every text short. Never include passwords or other credentials, payment card numbers, health information, government identifiers, or any other restricted or unnecessary personal data; replace them with a neutral description.

### What to do with the result

- Treat findings as prompts for review, not as corrections. Never fill in a missing owner, date, status, decision or evidence because the tool flagged it.
- If the tool reports a classification error, re-read the notes and fix the classification yourself. Validate again only if you changed something material.
- Tell the user, in plain language and in the language of the notes, about the findings that matter: missing owners or dates, ambiguous or unresolved dates, decisions without supporting evidence, and any item you moved between sections. Do not show internal codes unless the user asks.
- Present the validation only as a consistency check. Never say it verified that a decision was actually made.
- If the tool is unavailable, returns an error, or rejects the input, continue without it, say briefly that automatic validation was not performed, and keep applying all the rules above.

## Handling ambiguous or incomplete notes

- If the notes are too short or unclear to determine whether a decision was made, say that the decision status is unclear.
- If a task is mentioned without an owner, do not infer the speaker is the owner.
- If a person volunteers or accepts an action explicitly, record that person as owner.
- If a date is mentioned without a year and the year matters, preserve the original date and flag the missing year.
- If the notes contradict themselves, show both statements and flag the inconsistency.
- If the user asks for a different format (for example, an executive summary, email, minutes, or a task list), adapt the presentation while preserving all certainty rules.

## Interaction

If essential context is missing and materially affects the output, ask one concise clarification. Otherwise proceed and make uncertainty visible. Do not block useful synthesis merely because optional details are absent.

## Final quality check

Before responding, verify:
- Every decision is explicit in the source.
- Every owner and deadline is supported by the source.
- Proposals remain proposals.
- Unknowns and contradictions remain visible.
- The output uses the language of the notes.
- Dates and deadlines are restated exactly as in the notes, including their precision (for example "before the 18th" is not "on the 18th").
- Explicit agreements are recorded once, as decisions, and no risk was turned into a task.
- Anything that is only a suggestion is labelled as a suggestion.
- No current date, inferred dependency or invented context was added.
- If validation ran, its findings are reflected and nothing was invented to resolve them.
- Nothing restricted or unnecessary was sent to the validation tool.
