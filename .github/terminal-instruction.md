# Terminal Management Guidelines for AI Agents

> **Purpose**: Prevent background process interruptions when AI agents manage terminals in VS Code environments.

## The Problem

AI agents using `run_in_terminal` with `isBackground: true` often accidentally interrupt background processes by running follow-up commands in the same terminal. This happens because:

1. Background processes don't block the tool call (returns immediately)
2. The terminal remains "attached" to the background process
3. Any subsequent command in that terminal sends control signals (Ctrl+C) that kill the process
4. Agent sees interrupted process → restarts → checks in same terminal → interrupted again (loop)

## Core Principles

### 1. Terminal Isolation

**Golden Rule**: Once a background process starts in a terminal, NEVER run another command in that terminal.

```typescript
// ❌ WRONG: Reusing terminal interrupts the server
await run_in_terminal({
  command: "npm run dev",
  isBackground: true,
  explanation: "Starting dev server",
}); // Returns terminal ID: abc123

await run_in_terminal({
  command: "curl http://localhost:3000", // ← Kills the server!
  explanation: "Checking server",
  // This goes to terminal abc123 by default
});

// ✅ RIGHT: Each command gets its own terminal
await run_in_terminal({
  command: "npm run dev",
  isBackground: true,
  explanation: "Starting dev server",
}); // Terminal abc123 - leave it alone forever

await run_in_terminal({
  command: "curl http://localhost:3000", // ← New terminal, server safe
  explanation: "Checking server",
  // Gets fresh terminal xyz789 automatically
});
```

### 2. Status Checking

**Use `get_terminal_output` for background process status**:

```typescript
// ✅ RIGHT: Safe status check
const serverTerminalId = "abc123"; // From background start
const output = await get_terminal_output({ id: serverTerminalId });

if (output.includes("Ready in")) {
  // Server is running
} else if (output.includes("Error")) {
  // Server failed to start
}
```

**Never use `run_in_terminal` to check background process status**:

```typescript
// ❌ WRONG: This interrupts the server
await run_in_terminal({
  command: "sleep 5 && lsof -ti:3000",
  explanation: "Wait for server then check port",
  // If this goes to server terminal, it sends Ctrl+C!
});
```

### 3. One Start, Not Multiple

**Start background process once and trust it**:

```typescript
// ✅ RIGHT: Start once, verify with output check
const result = await run_in_terminal({
  command: "npm run dev --turbopack",
  isBackground: true,
  explanation: "Starting Next.js dev server",
});

const terminalId = result.terminalId; // Save this

// Wait a moment for startup
await new Promise((resolve) => setTimeout(resolve, 3000));

// Check output
const output = await get_terminal_output({ id: terminalId });

if (output.includes("Ready in")) {
  // Success! Don't touch this terminal again
  return { success: true, terminalId };
}
```

**Don't restart on every check**:

```typescript
// ❌ WRONG: Restart loop
for (let i = 0; i < 3; i++) {
  await run_in_terminal({ command: "npm run dev", isBackground: true });
  await run_in_terminal({ command: "sleep 5 && curl localhost:3000" }); // Kills it!
  // Loop repeats, creates terminal spam
}
```

## Implementation Patterns

### Pattern 1: Start and Forget

```typescript
async function startDevServer() {
  // Start once
  const result = await run_in_terminal({
    command: "npm run dev --turbopack",
    isBackground: true,
    explanation: "Starting dev server",
  });

  // Wait for startup logs
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Single verification
  const output = await get_terminal_output({ id: result.terminalId });

  if (output.includes("Ready in")) {
    console.log("✓ Server started successfully");
    console.log(`Terminal ID: ${result.terminalId} (DO NOT REUSE)`);
    return result.terminalId;
  } else {
    throw new Error("Server failed to start");
  }
}

// Later: Only check status, never run commands
async function checkServerStatus(terminalId: string) {
  const output = await get_terminal_output({ id: terminalId });
  return output.includes("Ready in") || output.includes("compiled");
}
```

### Pattern 2: Separate Terminals for Testing

```typescript
async function testEndpoint(serverTerminalId: string) {
  // ✅ Verify server in its own terminal (read-only)
  const serverOutput = await get_terminal_output({ id: serverTerminalId });

  if (!serverOutput.includes("Ready in")) {
    throw new Error("Server not ready");
  }

  // ✅ Test in NEW terminal (automatically gets fresh ID)
  const testResult = await run_in_terminal({
    command: "curl -s http://localhost:3000/api/health",
    explanation: "Testing API endpoint",
    isBackground: false, // Blocks until complete
  });

  return testResult.output;
}
```

### Pattern 3: User-Managed Server (Recommended)

```typescript
async function requestUserStartServer() {
  console.log(`
Please start the dev server in your terminal:

  npm run dev --turbopack

Once you see "Ready in XXXXms", I can proceed with testing.
Type "ready" when the server is running.
  `);

  // Agent waits for user confirmation
  // No risk of interruption - user controls the server terminal
}
```

## Troubleshooting

### Symptom: Server keeps getting interrupted

**Diagnosis**: Agent running commands in server terminal

**Fix**:

1. Check recent terminal commands - look for pattern: start server → command → `^C` in output
2. Identify terminal ID from server start
3. Search code for any `run_in_terminal` calls that might reuse that ID
4. Ensure all checks use `get_terminal_output` or new terminals

### Symptom: Multiple servers fighting for same port

**Diagnosis**: Agent restarting server without killing old one

**Fix**:

1. Kill all processes on port: `lsof -ti:3000 | xargs kill -9`
2. Start server ONCE
3. Never restart unless explicitly needed

### Symptom: "Port already in use" on clean start

**Diagnosis**: Previous server still running from interrupted session

**Fix**:

```bash
# Clean slate
lsof -ti:3000 | xargs kill -9
npm run dev --turbopack
```

## Framework-Specific Examples

### Next.js Dev Server

```typescript
// ✅ Complete Next.js workflow
async function setupNextJsDevEnvironment() {
  // 1. Start server (one time)
  const serverTerminal = await run_in_terminal({
    command: "npm run dev --turbopack",
    isBackground: true,
    explanation: "Starting Next.js development server",
  });

  // 2. Wait for startup
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // 3. Verify (read-only check)
  const output = await get_terminal_output({ id: serverTerminal.terminalId });

  if (!output.includes("Ready in")) {
    throw new Error("Server failed to start. Check logs.");
  }

  // 4. Return terminal ID for reference (never run commands in it)
  return {
    serverTerminalId: serverTerminal.terminalId,
    serverUrl: "http://localhost:3000",
  };
}

// Later: Run tests in separate terminal
async function runE2ETests(serverInfo: { serverTerminalId: string }) {
  // ✅ Verify server still alive (read-only)
  const serverOutput = await get_terminal_output({
    id: serverInfo.serverTerminalId,
  });
  if (!serverOutput.includes("compiled")) {
    throw new Error("Server not responding");
  }

  // ✅ Run tests in NEW terminal
  await run_in_terminal({
    command: "npm run test:e2e",
    explanation: "Running end-to-end tests",
    isBackground: false,
  });
}
```

### Vite Dev Server

```typescript
async function startViteServer() {
  const result = await run_in_terminal({
    command: "npm run dev", // Vite default
    isBackground: true,
    explanation: "Starting Vite dev server",
  });

  await new Promise((resolve) => setTimeout(resolve, 3000));

  const output = await get_terminal_output({ id: result.terminalId });

  // Vite shows "Local: http://localhost:5173"
  if (output.includes("Local:")) {
    return result.terminalId;
  }

  throw new Error("Vite failed to start");
}
```

### Watch Mode (Tests/Build)

```typescript
async function startTestWatcher() {
  const result = await run_in_terminal({
    command: "npm run test:watch",
    isBackground: true,
    explanation: "Starting test watcher",
  });

  // Watch modes are background processes - same rules apply
  // Never run commands in this terminal
  return result.terminalId;
}
```

## Checklist for AI Agents

Before running ANY command, ask:

- [ ] Is there a background process running?
- [ ] Do I know the terminal ID of that process?
- [ ] Am I about to run a command in the same terminal?
- [ ] If yes to #3: **STOP** - use `get_terminal_output` or new terminal instead

When starting background process:

- [ ] Used `isBackground: true`?
- [ ] Saved the terminal ID?
- [ ] Planned to NEVER run commands in that terminal?
- [ ] Will use `get_terminal_output` for status checks?

When checking status:

- [ ] Using `get_terminal_output(id)` not `run_in_terminal`?
- [ ] OR using new terminal for health checks (curl, lsof)?
- [ ] Not running `sleep && check` in server terminal?

## Summary

| Action                   | Method                                  | Notes                            |
| ------------------------ | --------------------------------------- | -------------------------------- |
| Start background process | `run_in_terminal({isBackground: true})` | Save terminal ID, never reuse    |
| Check process status     | `get_terminal_output(id)`               | Read-only, safe                  |
| Run tests/checks         | `run_in_terminal()` without terminal ID | Gets new terminal automatically  |
| User verification        | Ask user to check manually              | Safest approach                  |
| Stop process             | User manages, or kill port explicitly   | `lsof -ti:PORT \| xargs kill -9` |

**Remember**: The terminal with a background process is like a dedicated server room. You can look through the window (`get_terminal_output`), but you should never walk in (`run_in_terminal` in same terminal).
