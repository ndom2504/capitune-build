export function isMissingPlanColumn(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("stripe_customer_id") ||
    (lower.includes("plan") && (lower.includes("does not exist") || lower.includes("schema cache") || lower.includes("column")))
  );
}
