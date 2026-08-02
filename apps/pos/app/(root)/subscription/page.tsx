import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans';

// The one page an expired business can still open — everything else is locked
// until a payment is confirmed.
export default function SubscriptionPage() {
  return <SubscriptionPlans />;
}
