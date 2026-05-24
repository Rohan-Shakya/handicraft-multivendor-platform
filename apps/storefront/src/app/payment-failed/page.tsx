import { XCircle } from "lucide-react";
import Link from "next/link";

export default function PaymentFailedPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <XCircle className="mx-auto size-16 text-destructive mb-6" />
      <h1 className="text-2xl font-bold mb-3">Payment Failed</h1>
      <p className="text-muted-foreground mb-8">
        Your payment could not be verified. If you believe this is an error,
        please check your payment app or contact support.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/customer/orders"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          My Orders
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg border px-6 py-3 text-sm font-medium hover:bg-muted"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
