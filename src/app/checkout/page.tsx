import { prisma } from "@/lib/prisma";
import { CheckoutForm } from "./checkout-form";

// Server wrapper so CheckoutForm (client) can be given the real
// shippingFlatRate up front — the buyer needs to see subtotal + ongkir =
// total before submitting, not just after the order is created.
export default async function CheckoutPage() {
  const settings = await prisma.adminSettings.findUniqueOrThrow({ where: { id: "singleton" } });
  return <CheckoutForm shippingFlatRate={settings.shippingFlatRate} />;
}
