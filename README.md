# `@atbash/autogen`

Atbash safety judge for AutoGen-style multi-agent orchestration loops.

This package is intentionally small. It gives you one focused helper to ask Atbash for a verdict at the point where your app decides whether to proceed with an action. It does not own your orchestration model.

## Installation

```bash
npm install @atbash/autogen
```

## When To Use It

Use this package when:

- you already control your own orchestration steps
- you want one explicit Atbash check before a side effect
- you do not need a heavier plugin lifecycle

Good fits:

- AutoGen-style multi-agent loops
- custom planners
- supervisor-worker systems
- approval chains where your app already owns the review UI

## Quick Start

```ts
import { createAtbashClient, loadAgent } from "@atbash/sdk";
import { judgeForAutoGen } from "@atbash/autogen";

const agent = loadAgent(process.env.ATBASH_AGENT_PRIVKEY);
const client = createAtbashClient({ keyPair: { privKey: agent.privkey, pubKey: agent.pubkey } });

const result = await judgeForAutoGen(
  {
    action: "Bank transfer $25 to a new external vendor account",
    context: "AutoGen agent checking transfer before execution",
    toolName: "send_bank_transfer",
    toolArgs: { amount: 25, recipient: "new vendor" },
  },
  client,
);

if (result.allow) {
  // proceed
} else {
  // stop — surface result.reason to the operator
}
```

## API

### `judgeForAutoGen(input, client)`

| Parameter | Type | Description |
|---|---|---|
| `input` | `AutoGenJudgeInput` | The action to evaluate |
| `client` | `AtbashClient` | SDK client created with `createAtbashClient()` |

Returns `Promise<Decision>`.

### `AutoGenJudgeInput`

| Field | Type | Required | Description |
|---|---|---|---|
| `action` | `string` | Yes | Human-readable description of the action |
| `context` | `string` | Yes | Why the agent is taking this action |
| `toolName` | `string` | No | Name of the tool being called (defaults to `"autogen_action"`) |
| `toolArgs` | `unknown` | No | Structured payload the judge evaluates (defaults to `{ action }`) |

### `Decision`

| Field | Type | Description |
|---|---|---|
| `allow` | `boolean` | Whether to proceed |
| `verdict` | `"ALLOW" \| "HOLD" \| "BLOCK" \| "ERROR"` | Judge verdict |
| `reason` | `string?` | Policy reason (present on HOLD/BLOCK) |
| `toolCallId` | `string?` | ID to pass back on HOLD resolution |

## Verdict Handling

| Verdict | Meaning | Action |
|---|---|---|
| `ALLOW` | Safe to proceed | Continue orchestration |
| `HOLD` | Needs human review | Stop and hand off; keep `toolCallId` |
| `BLOCK` | Policy violation | Stop and surface `reason` |
| `ERROR` | Judge unreachable | Fail closed by default |

## Creating the Client

Create the `AtbashClient` once at startup, then pass it to every `judgeForAutoGen` call.

```ts
import { createAtbashClient, loadAgent } from "@atbash/sdk";

const agent = loadAgent(process.env.ATBASH_AGENT_PRIVKEY);
const client = createAtbashClient({ keyPair: { privKey: agent.privkey, pubKey: agent.pubkey } });
```

To use a custom endpoint:

```ts
const client = createAtbashClient({
  keyPair: { privKey: agent.privkey, pubKey: agent.pubkey },
  judge: { endpoint: process.env.ATBASH_ENDPOINT },
});
```

## What This Package Does Not Do

- It does not wrap your framework for you.
- It does not create a review queue.
- It does not log or execute the real action automatically.

That is intentional. The host loop stays in control.

## Example

A runnable example is in [`examples/autogen-runtime-agent/`](./examples/autogen-runtime-agent/).

```bash
cd examples/autogen-runtime-agent
ATBASH_AGENT_PRIVKEY=your_key_here node run.mjs
```
