# AutoGen Runtime Example

A runnable example for `@atbash/autogen` that calls a live Atbash judge and prints the verdict.

No model API key required — only an Atbash agent private key.

## What It Does

1. Loads a real Atbash agent identity from `ATBASH_AGENT_PRIVKEY`
2. Calls `judgeForAutoGen()` with a sample bank transfer action
3. Prints the live verdict from Atbash

## Run

From this directory:

```bash
ATBASH_AGENT_PRIVKEY=your_key_here node run.mjs
```

Custom action:

```bash
ATBASH_AGENT_PRIVKEY=your_key_here node run.mjs "Send invoice to external vendor"
```

Override endpoint:

```bash
ATBASH_AGENT_PRIVKEY=your_key_here ATBASH_ENDPOINT=https://your-endpoint.example.com node run.mjs
```

## Default Action

The default action is intentionally hold-like to demonstrate the judge working:

```
Bank transfer $25 to a new external vendor account for urgent reimbursement
```

## Expected Output

```
Atbash agent pubkey: <your pubkey>
Action text: Bank transfer $25 to a new external vendor account for urgent reimbursement

[AutoGen Judge Result]
{
  allow: false,
  verdict: 'HOLD',
  reason: '...',
  toolCallId: '...'
}
```

Verdict will be one of `ALLOW`, `HOLD`, `BLOCK`, or `ERROR`.
