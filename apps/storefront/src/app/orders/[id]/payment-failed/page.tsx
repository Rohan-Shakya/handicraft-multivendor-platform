import { XCircle } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PaymentFailedPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <XCircle className="mx-auto size-16 text-destructive mb-6" />
      <h1 className="text-2xl font-bold mb-3">Payment Failed</h1>
      <p className="text-muted-foreground mb-8">
        Your payment could not be processed. Please try again or use a different
        payment method. No charges have been made to your account.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href={`/customer/orders/${id}`}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try Again
        </Link>
        <Link
          href="/customer/orders"
          className="inline-flex items-center justify-center rounded-lg border px-6 py-3 text-sm font-medium hover:bg-muted"
        >
          My Orders
        </Link>
      </div>
    </div>
  );
}
