export async function sendOrderCreatedEmails(_orderId: string): Promise<void> {
  // TODO(Task 28/29): send real emails via Resend once that task lands.
  console.log(`[email stub] would send order-created emails for order ${_orderId}`);
}

export async function sendPaymentConfirmedEmails(_orderId: string): Promise<void> {
  console.log(`[email stub] would send payment-confirmed emails for order ${_orderId}`);
}

export async function sendProofRejectedEmail(_orderId: string): Promise<void> {
  console.log(`[email stub] would send proof-rejected email for order ${_orderId}`);
}
