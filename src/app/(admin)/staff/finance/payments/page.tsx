import { PaymentsClient } from "./_components/PaymentsClient";

export const metadata = {
  title: "Finance Payments | Staff Dashboard",
  description: "Monitor all payment transactions",
};

export default function PaymentsPage() {
  return <PaymentsClient />;
}
