# Auto-Matcher Engine

## Context

Mission Control needs an engine that automatically recommends the best-fit crew for a mission. The matcher must:
1. Filter by availability (unavailability records + conflicting active assignments)
2. Filter by minimum skill proficiency for all required skills
3. Score each eligible crew member using a weighted proficiency formula
4. Return the top N ranked candidates (N = crew slots needed for the mission)

---

## Algorithm — 4 Steps

### Step 1: Validate mission & load requirements
- Query `missions WHERE id = missionId AND org_id = orgId` → tenant-safe 404 if not found
- Query `mission_skill_requirements` for the mission
- If no requirements → return 422: "Add skill requirements before running auto-match"

### Step 2: Filter by availability
Run two queries in parallel (`Promise.all`), collect excluded user IDs into a `Set`:

**2a — Unavailability blocks** (overlapping date range):
```sql
SELECT user_id FROM crew_unavailability
JOIN users ON users.id = crew_unavailability.user_id
  AND users.org_id = :orgId AND users.role = 'crew_member'
WHERE unavailable_from <= mission.end_date
  AND unavailable_to   >= mission.start_date
```

**2b — Active assignments on overlapping missions**:
```sql
SELECT crew_member_id FROM assignments
JOIN missions m ON assignments.mission_id = m.id
WHERE assignments.status = 'active'
  AND m.org_id = :orgId
  AND m.start_date <= mission.end_date
  AND m.end_date   >= mission.start_date
  AND m.id != :missionId   -- don't exclude crew already on this mission
```

### Step 3: Filter by minimum skill proficiency
- Query all `crew_member` users in org, excluding the unavailable set
- Guard: if `candidateIds.length === 0`, short-circuit → return empty results
- Bulk-fetch `crew_skills` for all candidates × required skills
- Build `Map<userId, Map<skillId, proficiency_level>>`
- Keep only crew who meet `proficiency >= min_proficiency_level` for **every** required skill
  - Missing skill row = proficiency 0 (always fails the min check)

### Step 4: Score, rank, and select top N

**Score formula** (weighted excess proficiency):
```
score = Σ(weight_i × max(0, proficiency_i - min_proficiency_i)) / Σ(weight_i)
normalizedScore = score / (maxProficiencyLevel - 1)
```
Where `maxProficiencyLevel = MAX(level) FROM skill_proficiency_levels WHERE org_id = orgId`.

This measures how much each crew member *exceeds* the minimum requirement per skill, weighted by importance. A crew member at exactly the minimum scores 0 excess; one level above scores 1; fully expert scores the maximum. This produces better differentiation than weighted average — two crew who both pass the filter are ranked by how far above the bar they are, not just their raw proficiency.

**Top-N with tie handling**:
- Sort by `score` descending
- Cutoff = `scored[crewRequired - 1].score`
- Include ALL candidates with `score >= cutoff` (ties at boundary are included)
- Assign rank: tied candidates share the same rank number

---

## Response Shape

```typescript
// POST /api/missions/:missionId/match
{
  missionId: string;
  totalCandidates: number;
  results: Array<{
    crewMember: { id: string; name: string; email: string };
    score: number;           // e.g. 1.4  (weighted excess above min proficiency)
    normalizedScore: number; // e.g. 0.35 (score / (maxProficiencyLevel - 1), 0–1)
    rank: number;            // 1-based; tied = same rank
    skillBreakdown: Array<{
      skillId: string;
      skillName: string;
      required: { minLevel: number; weight: number };
      actual: { level: number; label: string };
    }>;
  }>;
  message?: string; // present when no candidates found
}
```

---

## Edge Cases

| Case | Handling |
|---|---|
| No skill requirements on mission | 422 with message |
| No eligible crew (all filtered out) | 200 with empty results + message |
| Fewer eligible crew than `crew_required` | Return all eligible, no padding |
| Tied scores at position N | Score-based cutoff, all tied included |
| Missing skill row for a crew member | Treated as proficiency 0 → fails min filter |
| `candidateIds` empty array | Short-circuit before `inArray` (avoids `IN ()` SQL error) |
| `crew_required` = 0 | Validate ≥ 1 at mission creation (Zod); matcher returns empty |
| Re-running match on partially-assigned mission | `ne(missions.id, missionId)` guard in 2b prevents self-exclusion |
| Org has no proficiency levels configured | `maxProficiencyLevel` falls back to 5 |
