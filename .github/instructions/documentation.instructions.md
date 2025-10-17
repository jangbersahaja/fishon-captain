## 🤖 Documentation Instructions for AI Agent

When generating, reviewing, or updating documentation in this repository, the AI agent MUST strictly enforce the following rules:

1. **File Naming**

- All new or updated documentation files must follow the `{fix|feature|plan|design}-{area}-{topic}.md` naming convention.
- Reject or flag any filenames that are vague, phase-based, or non-descriptive (e.g., `PHASE_2_COMPLETE.md`, `API_FIX_SUMMARY.md`).

2. **YAML Frontmatter**

- Every doc must begin with a YAML frontmatter block as shown in the template, including at minimum: `type`, `status`, `updated`, `feature`, and `author`.
- If missing, auto-insert a valid frontmatter block with placeholders and today’s date.

3. **Document Structure**

- Enforce the following section order: Title, Summary, "What's in this plan" checklist, Implementation sections (with Problem, Completed Job Summary, Future Plan), Review Notes, and Archive/Legacy Notes.
- Each implementation step must be a separate sub-section.

4. **Checklist**

- All docs must include a checklist under "What's in this plan" for progress tracking.

5. **Review & Archive Sections**

- Every doc must end with a Review Notes section. If legacy/merged docs are referenced, include an Archive/Legacy Notes block.

6. **Metadata for Automation**

- If tags, impact, or version-introduced are present, ensure they are in the frontmatter.

7. **Copilot Prompting**

- When asked to generate a new doc, always use this structure and naming convention by default.
- If a user prompt is ambiguous, ask for the missing required fields (type, feature, etc.) before proceeding.

8. **Validation**

- When reviewing docs, flag any that do not comply with the above rules and suggest or auto-apply corrections.

9. **Template Reference**

- Use this file as the canonical source for doc structure and enforcement. If a `.github/DOCS_TEMPLATE.md` exists, use it as the insertion template.

10. **Date Handling**

- Always use the current date (YYYY-MM-DD) for the `updated` field when creating or updating docs.

---

**Summary:**

> The AI agent must treat this file as the single source of truth for documentation structure, naming, and review. All doc generation, review, and linting must strictly follow these rules.
