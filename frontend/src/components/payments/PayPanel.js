"use client";
import PayWith from "./PayWith";
import QrisPay from "./QrisPay";

/** How to pay one bill: the dynamic QRIS for its exact amount when there is one, otherwise the team's payment methods. */
export default function PayPanel({ qris, amountIdr, uniqueCode }) {
  if (qris) return <QrisPay qris={qris} amountIdr={amountIdr} uniqueCode={uniqueCode} />;
  return <PayWith />;
}
