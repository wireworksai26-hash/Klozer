-- Client-supplied Idempotency-Key for POST /orders: a retried or double-submitted
-- request returns the order that already exists instead of creating (and
-- reserving stock for) a second one.
ALTER TABLE `orders`
  ADD COLUMN `idempotency_key` VARCHAR(80) NULL AFTER `order_number`,
  ADD UNIQUE INDEX `uq_orders_idempotency` (`institution_id`, `idempotency_key`);
