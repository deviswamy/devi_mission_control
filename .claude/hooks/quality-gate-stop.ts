#!/usr/bin/env bun
import Anthropic from "@anthropic-ai/sdk";
import { $ } from "bun";

// Stop hook input: { session_id, transcript_path, stop_hook_active }
await Bun.stdin.text(); // consume stdin (not used)

// ── 1. Check for file changes ─────────────────────────────────────────────────
const changed = (await $`git diff --name-only HEAD`.text()).trim();
if (!changed) process.exit(0);

// ── 2. Biome auto-fix ─────────────────────────────────────────────────────────
try {
  await $`~/.bun/bin/bun run biome:check`.quiet();
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  process.stdout.write(`Biome errors remain after --apply. Fix manually:\n${msg}\n`);
  process.exit(2);
}

// ── Helper: run tsc and return { ok, output } ─────────────────────────────────
async function runTsc(): Promise<{ ok: boolean; output: string }> {
  try {
    await $`~/.bun/bin/bun build`.quiet();
    return { ok: true, output: "" };
  } catch (err) {
    const output = err instanceof Error ? err.message : String(err);
    return { ok: false, output };
  }
}

// ── Helper: Haiku agentic loop ────────────────────────────────────────────────
const tools: Anthropic.Tool[] = [
  {
    name: "read_file",
    description: "Read the full content of a source file",
    input_schema: {
      type: "object" as const,
      properties: { path: { type: "string", description: "Relative file path" } },
      required: ["path"],
    },
  },
  {
    name: "edit_file",
    description: "Overwrite a file with new content",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string" },
        content: { type: "string", description: "Complete updated file content" },
      },
      required: ["path", "content"],
    },
  },
];

async function runAgentLoop(system: string, userMessage: string): Promise<void> {
  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  while (true) {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      system,
      tools,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") break;

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      const input = block.input as Record<string, string>;
      let result: string;
      if (block.name === "read_file") {
        result = await Bun.file(input.path).text();
      } else {
        await Bun.write(input.path, input.content);
        result = "ok";
      }
      results.push({ type: "tool_result", tool_use_id: block.id, content: result });
    }
    messages.push({ role: "user", content: results });
  }
}

// ── 3. tsc check — auto-fix with Haiku if errors ─────────────────────────────
let tsc = await runTsc();

if (!tsc.ok) {
  process.stdout.write("TypeScript errors found — running Haiku auto-fix...\n");
  await runAgentLoop(
    "You are a TypeScript expert. Fix all type errors using read_file and edit_file tools. Preserve all existing logic exactly — only fix type errors.",
    `Fix these TypeScript errors:\n\n${tsc.output}`,
  );

  tsc = await runTsc();
  if (!tsc.ok) {
    process.stdout.write(
      `TypeScript errors remain after auto-fix. Fix manually:\n\n${tsc.output}\n`,
    );
    process.exit(2);
  }
}

// ── 4. Add JSDoc documentation to changed TypeScript files ───────────────────
const changedTsFiles = changed
  .split("\n")
  .filter((f) => f.match(/\.(ts|tsx)$/) && !f.includes("node_modules"))
  .join(", ");

if (changedTsFiles) {
  process.stdout.write("Adding JSDoc documentation to changed files...\n");
  await runAgentLoop(
    `You are a documentation expert following these standards:
- File-level @fileoverview JSDoc header on every file
- JSDoc on all exported functions, classes, types, and interfaces
- Document React component props
- Document public class members
Preserve all existing logic exactly. Only add or update JSDoc comments.`,
    `Add JSDoc documentation to these changed TypeScript files: ${changedTsFiles}`,
  );

  // Re-apply biome after doc changes
  try {
    await $`~/.bun/bin/bun run biome:check`.quiet();
  } catch {
    // non-fatal — biome formatting on comments
  }

  // Re-check tsc after doc changes
  tsc = await runTsc();
  if (!tsc.ok) {
    process.stdout.write(
      `TypeScript errors after adding docs. Fix manually:\n\n${tsc.output}\n`,
    );
    process.exit(2);
  }
}

// ── 5. Stage, commit (if needed), push, create PR ────────────────────────────
await $`git add -A`.quiet();
const dirty = (await $`git status --porcelain`.text()).trim();
if (dirty) {
  await $`git commit -m "chore: auto quality gate + docs"`.quiet();
}

await $`git push -u origin HEAD`.quiet();

const prUrl = (
  await $`gh pr create --title "Auto: quality gate + docs" --body "Automated PR: biome fix, TypeScript fix, JSDoc documentation added."`.text()
).trim();

process.stdout.write(`PR created: ${prUrl}\n`);
process.exit(0);
