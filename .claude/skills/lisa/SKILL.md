---
name: lisa
description: "Interactive PRD generation through customer interviews. Lisa conducts in-depth feature interviews, generates comprehensive markdown PRDs, and prepares them for Ralph execution. Use /lisa to start an interactive session where all commands and options are presented interactively. Commands: (1) plan - start specification interview for a feature, (2) resume - continue an interrupted interview, (3) cleanup - remove Lisa interview state files, (4) help - show Lisa documentation."
---

# Lisa - Interactive PRD Generation

**Lisa plans. Ralph does.**

Lisa conducts structured interviews to gather requirements and generate comprehensive Product Requirement Documents (PRDs) in both markdown and JSON formats.

## When to Use Lisa

Use Lisa when you:
- Need to plan a new feature from scratch
- Want to explore requirements through guided questions
- Need to convert rough ideas into structured specifications
- Want to validate your approach with first-principles thinking

## Invocation

### Skill (Claude Code)

Use `/lisa` to start an interactive session. All commands (plan, resume, cleanup, help) and options are presented interactively.

### Bash

```bash
lisa/lisa.sh plan "feature name"   # Start interview
lisa/lisa.sh resume                 # Resume interrupted interview
lisa/lisa.sh cleanup                # Clean up state files
lisa/lisa.sh help                   # Show documentation
```

**Options (bash only, for `plan` command):**

| Option | Description | Default |
|--------|-------------|---------|
| `--context <file>` | Initial context file (PRD, requirements, docs) | none |
| `--output-dir <dir>` | Output directory | `ralph/tasks` |
| `--max-questions <n>` | Maximum question rounds | unlimited |
| `--first-principles` | Challenge assumptions before detailed gathering | false |

**Examples:**
```bash
lisa/lisa.sh plan "user authentication"
lisa/lisa.sh plan "payment processing" --context docs/requirements.md
lisa/lisa.sh plan "new dashboard" --first-principles
lisa/lisa.sh plan "api gateway" --max-questions 15
```

## How Lisa Works

### 1. Interview Process

Lisa asks probing, non-obvious questions about:
- **Scope:** What's in/out, MVP vs full vision
- **User Stories:** Discrete, implementable chunks
- **Technical Design:** Data models, APIs, integrations
- **UX:** User flows, edge cases, accessibility
- **Trade-offs:** Performance, security, scalability
- **Verification:** How to test each story

### 2. Adaptive Questioning

Questions are tailored based on your answers. Lisa probes deeper when needed and moves on when clarity is achieved.

### 3. Draft Updates

Every 2-3 questions, Lisa updates a running draft at `.claude/lisa-draft.md` so nothing is lost.

### 4. Completion

When you say "done", "finalize", or "finished", Lisa generates:
- **Markdown PRD** - Human-readable specification
- **JSON PRD** - Ralph-compatible format (via `/prd` skill)
- **Progress file** - Empty file for Ralph to track learnings

## First-Principles Mode

Via bash, use `--first-principles` to challenge your assumptions before diving into details. Via the `/lisa` skill, this option is offered interactively.

**Phase 1:** Lisa asks 3-5 foundational questions:
- "What specific problem led to this idea?"
- "What happens if we don't build this?"
- "What's the simplest thing that might solve this?"
- "What would make this the wrong approach?"
- "Is there an existing solution we could use?"

**Phase 2:** Only after validating the approach, Lisa proceeds with detailed specification gathering.

## Output Files

Lisa generates:

| File | Location | Purpose |
|------|----------|---------|
| Markdown PRD | `{output-dir}/{feature-slug}.md` | Human-readable spec |
| JSON PRD | `{output-dir}/{feature-slug}.json` | Ralph execution format |
| Progress file | `{output-dir}/{feature-slug}-progress.txt` | Ralph learnings tracker |
| Draft | `.claude/lisa-draft.md` | Running draft during interview |
| State | `.claude/lisa-{feature-slug}.md` | Interview state for resume |

## Complete Workflow: Lisa → Ralph

```
1. Lisa plans
   /lisa (skill) or lisa/lisa.sh plan "my feature" (bash)
   → Conducts interview
   → Generates markdown PRD

2. Convert to JSON
   /prd
   → Uses existing PRD skill
   → Creates prd.json

3. Ralph implements
   ralph/ralph.sh
   → Reads prd.json
   → Implements stories
   → Runs quality gates
```

## PRD Quality

Lisa ensures PRDs are:
- **Right-sized:** Each story fits in one Ralph iteration
- **Verifiable:** Acceptance criteria are specific and testable
- **Ordered:** Dependencies respected (schema → backend → UI)
- **Complete:** Technical design, UX, edge cases covered
- **Actionable:** Clear enough for autonomous execution

## Integration with Ralph

Lisa outputs are designed for Ralph:
- **Story sizing:** Each story completable in one context window
- **Verification:** Built-in typecheck, lint, test criteria
- **Phases:** Incremental milestones Ralph can execute
- **Format:** JSON matches Ralph's prd.json schema exactly

## Tips for Great PRDs

1. **Be specific about scope:** Explicitly state what's out of scope
2. **Answer honestly:** Don't say "I don't know"—explore the unknowns together
3. **Challenge yourself:** Use first-principles mode for complex features
4. **Provide context:** Give Lisa existing docs (via `--context` in bash, or interactively via `/lisa`)
5. **Break it down:** If Lisa suggests splitting stories, consider it seriously

## Related Skills

- **[/prd](.claude/skills/prd/SKILL.md)** - Convert markdown PRDs to Ralph JSON format
- **[/brainstorming](.claude/skills/brainstorming/SKILL.md)** - Explore ideas before specification

## Troubleshooting

**Q: Interview was interrupted, how do I continue?**
A: Use `/lisa` and select resume, or run `lisa/lisa.sh resume` from bash.

**Q: Lisa keeps asking questions, how do I stop?**
A: Say "done", "finalize", "finished", or "that's all" to complete the interview.

**Q: How do I create multiple PRDs without conflicts?**
A: Lisa checks for existing PRDs and suggests unique names automatically.

**Q: Can I edit the PRD after Lisa finishes?**
A: Yes! Edit the markdown file, then run `/prd` to regenerate the JSON.

---

**Lisa plans. Ralph does. Ship faster.**
