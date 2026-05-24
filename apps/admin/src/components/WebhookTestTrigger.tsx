import * as React from "react";
import { Send, Loader2, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { trackEvent } from "@/lib/observability";

/**
 * Send a dummy webhook payload to a registered endpoint to verify reachability
 * and HMAC handling. The backend route `/admin/webhooks/:id/test` is expected
 * to fire a canonical event against the endpoint and return the delivery
 * record so we can show status + response body.
 */

const TOPICS = [
  "order.created",
  "order.paid",
  "order.fulfilled",
  "order.cancelled",
  "refund.created",
  "payment.captured",
  "payment.failed",
  "product.created",
  "product.updated",
  "customer.created",
  "inventory.low_stock",
  "subscription.renewal_due",
] as const;

const DEFAULT_PAYLOADS: Record<string, Record<string, unknown>> = {
  "order.created": {
    orderId: "ord_test_123",
    orderNumber: "TEST-1001",
    customer: { email: "buyer@example.com" },
    total: "49.00",
    currency: "NPR",
  },
  "payment.captured": {
    paymentId: "pay_test_123",
    orderId: "ord_test_123",
    amount: "49.00",
    currency: "NPR",
    provider: "stripe",
  },
  "inventory.low_stock": {
    inventoryItemId: "inv_test_1",
    variantId: "var_test_1",
    productTitle: "Sample product",
    available: 2,
    threshold: 5,
  },
};

interface Props {
  endpointId: string;
  endpointUrl: string;
  trigger?: React.ReactNode;
}

export function WebhookTestTrigger({ endpointId, endpointUrl, trigger }: Props) {
  const [open, setOpen] = React.useState(false);
  const [topic, setTopic] = React.useState<string>(TOPICS[0]);
  const [payloadJson, setPayloadJson] = React.useState<string>(
    JSON.stringify(DEFAULT_PAYLOADS[TOPICS[0]] ?? {}, null, 2)
  );
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState<{
    status: number | null;
    body: string;
    durationMs?: number;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setPayloadJson(JSON.stringify(DEFAULT_PAYLOADS[topic] ?? {}, null, 2));
  }, [topic]);

  async function send() {
    setSending(true);
    setResult(null);
    let data: unknown;
    try {
      data = JSON.parse(payloadJson);
    } catch {
      toast({
        title: "Invalid JSON",
        description: "Fix the payload before sending.",
        variant: "destructive",
      });
      setSending(false);
      return;
    }

    const startedAt = Date.now();
    try {
      const res = await apiFetch<{
        status: number | null;
        body: string;
      }>(`/admin/webhooks/${endpointId}/test`, {
        method: "POST",
        body: JSON.stringify({ topic, data }),
      });
      setResult({ ...res, durationMs: Date.now() - startedAt });
      trackEvent("update", { entity: "webhook_test", topic, endpointId });
    } catch (err) {
      setResult({
        status: null,
        body: (err as Error).message ?? "Request failed",
        durationMs: Date.now() - startedAt,
      });
    } finally {
      setSending(false);
    }
  }

  const statusColor =
    !result?.status
      ? "text-destructive"
      : result.status >= 200 && result.status < 300
      ? "text-emerald-500"
      : result.status >= 300 && result.status < 400
      ? "text-sky-500"
      : "text-destructive";

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Send className="size-3.5" aria-hidden /> Send test event
          </Button>
        )}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send test event</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Target: <span className="font-mono">{endpointUrl}</span>
            </p>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Topic</label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOPICS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Payload (JSON)</label>
                <button
                  type="button"
                  onClick={() => copy(payloadJson)}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  {copied ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <Textarea
                value={payloadJson}
                onChange={(e) => setPayloadJson(e.target.value)}
                className="h-40 font-mono text-xs"
                spellCheck={false}
              />
            </div>

            {result && (
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold">Response</span>
                  <span className={`text-xs font-mono ${statusColor}`}>
                    {result.status ?? "network error"} · {result.durationMs}ms
                  </span>
                </div>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-[11px]">
                  {result.body || "(empty body)"}
                </pre>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button onClick={send} disabled={sending}>
              {sending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Send className="size-3.5" aria-hidden />
              )}
              Send test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
