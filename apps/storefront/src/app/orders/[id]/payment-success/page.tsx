import { CheckCircle } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PaymentSuccessPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <CheckCircle className="mx-auto size-16 text-green-500 mb-6" />
      <h1 className="text-2xl font-bold mb-3">Payment Successful</h1>
      <p className="text-muted-foreground mb-8">
        Your payment has been processed successfully. You will receive an order
        confirmation email shortly.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href={`/customer/orders/${id}`}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          View Order
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-lg border px-6 py-3 text-sm font-medium hover:bg-muted"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
