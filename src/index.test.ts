import { describe, it, expect, vi } from "vitest";
import type { AtbashClient, Decision } from "@atbash/sdk";
import { judgeForAutoGen } from "./index.js";

function makeClient(decision: Decision): AtbashClient {
  return { auditToolCall: vi.fn().mockResolvedValue(decision) } as unknown as AtbashClient;
}

const allowDecision: Decision = {
  allow: true,
  verdict: "ALLOW",
  reason: "Routine internal transfer",
  toolCallId: "tc-123",
};

const blockDecision: Decision = {
  allow: false,
  verdict: "BLOCK",
  reason: "Suspicious external vendor",
  toolCallId: "tc-456",
};

describe("judgeForAutoGen", () => {
  it("resolves with the Decision returned by auditToolCall", async () => {
    const client = makeClient(allowDecision);
    const result = await judgeForAutoGen(
      { action: "send email", context: "routine notification" },
      client,
    );
    expect(result).toEqual(allowDecision);
  });

  it("passes toolName and toolArgs through to auditToolCall", async () => {
    const client = makeClient(allowDecision);
    await judgeForAutoGen(
      {
        action: "send email",
        context: "routine notification",
        toolName: "send_email",
        toolArgs: { to: "team@example.com", subject: "Update" },
      },
      client,
    );
    expect(client.auditToolCall).toHaveBeenCalledWith({
      toolName: "send_email",
      args: { to: "team@example.com", subject: "Update" },
      context: "send email — routine notification",
    });
  });

  it("defaults toolName to 'autogen_action' when not provided", async () => {
    const client = makeClient(allowDecision);
    await judgeForAutoGen({ action: "read file", context: "diagnostics" }, client);
    expect(client.auditToolCall).toHaveBeenCalledWith(
      expect.objectContaining({ toolName: "autogen_action" }),
    );
  });

  it("defaults args to { action } when toolArgs is not provided", async () => {
    const client = makeClient(allowDecision);
    await judgeForAutoGen({ action: "read file", context: "diagnostics" }, client);
    expect(client.auditToolCall).toHaveBeenCalledWith(
      expect.objectContaining({ args: { action: "read file" } }),
    );
  });

  it("builds context as '<action> — <context>'", async () => {
    const client = makeClient(allowDecision);
    await judgeForAutoGen({ action: "deploy app", context: "CD pipeline step" }, client);
    expect(client.auditToolCall).toHaveBeenCalledWith(
      expect.objectContaining({ context: "deploy app — CD pipeline step" }),
    );
  });

  it("trims whitespace from action and context before forwarding", async () => {
    const client = makeClient(allowDecision);
    await judgeForAutoGen({ action: "  run script  ", context: "  cron job  " }, client);
    expect(client.auditToolCall).toHaveBeenCalledWith(
      expect.objectContaining({ context: "run script — cron job" }),
    );
  });

  it("throws when action is an empty string", async () => {
    const client = makeClient(allowDecision);
    await expect(
      judgeForAutoGen({ action: "", context: "some context" }, client),
    ).rejects.toThrow("Both action and context are required");
  });

  it("throws when action is only whitespace", async () => {
    const client = makeClient(allowDecision);
    await expect(
      judgeForAutoGen({ action: "   ", context: "some context" }, client),
    ).rejects.toThrow("Both action and context are required");
  });

  it("throws when context is an empty string", async () => {
    const client = makeClient(allowDecision);
    await expect(
      judgeForAutoGen({ action: "do something", context: "" }, client),
    ).rejects.toThrow("Both action and context are required");
  });

  it("throws when context is only whitespace", async () => {
    const client = makeClient(allowDecision);
    await expect(
      judgeForAutoGen({ action: "do something", context: "   " }, client),
    ).rejects.toThrow("Both action and context are required");
  });

  it("propagates a BLOCK decision correctly", async () => {
    const client = makeClient(blockDecision);
    const result = await judgeForAutoGen(
      {
        action: "Bank transfer $25 to new external vendor",
        context: "AutoGen agent checking transfer before execution",
        toolName: "send_bank_transfer",
        toolArgs: { request: "Bank transfer $25 to new external vendor" },
      },
      client,
    );
    expect(result.allow).toBe(false);
    expect(result.verdict).toBe("BLOCK");
  });

  it("propagates a HOLD decision correctly", async () => {
    const holdDecision: Decision = { allow: false, verdict: "HOLD", toolCallId: "tc-789" };
    const client = makeClient(holdDecision);
    const result = await judgeForAutoGen(
      { action: "delete database", context: "maintenance script" },
      client,
    );
    expect(result.verdict).toBe("HOLD");
    expect(result.allow).toBe(false);
  });

  it("surfaces errors thrown by auditToolCall", async () => {
    const client = {
      auditToolCall: vi.fn().mockRejectedValue(new Error("Network timeout")),
    } as unknown as AtbashClient;
    await expect(
      judgeForAutoGen({ action: "ping service", context: "health check" }, client),
    ).rejects.toThrow("Network timeout");
  });
});
