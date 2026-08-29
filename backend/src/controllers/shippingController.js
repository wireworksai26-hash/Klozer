import { calculateShippingRates, calculateCodRiskScore, bookCourierPickup } from "../services/shippingService.js";

/**
 * Get Multi-Courier Rates
 * POST /api/v1/shipping/rates
 */
export async function getRates(req, res, next) {
  try {
    const { originCity, destinationCity, weightGrams } = req.body;
    const rates = await calculateShippingRates({
      originCity: originCity || "Surakarta",
      destinationCity: destinationCity || "Jakarta",
      weightGrams: Number(weightGrams || 500),
    });

    res.json({ success: true, rates });
  } catch (err) {
    next(err);
  }
}

/**
 * Check Anti-RTS COD Risk Score
 * POST /api/v1/shipping/cod-risk-score
 */
export async function checkCodRisk(req, res, next) {
  try {
    const { phone, address, pastReturnRate } = req.body;
    const score = calculateCodRiskScore({
      phone,
      address,
      pastReturnRate: Number(pastReturnRate || 0),
    });

    res.json({ success: true, ...score });
  } catch (err) {
    next(err);
  }
}

/**
 * Book Courier Pickup & Generate AWB
 * POST /api/v1/shipping/book
 */
export async function bookShipment(req, res, next) {
  try {
    const { order_id, courier_code = "jnt", is_cod = false, cod_amount = 0 } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, message: "order_id diperlukan." });
    }

    const booking = await bookCourierPickup({
      orderId: order_id,
      courierCode: courier_code,
      isCod: Boolean(is_cod),
      codAmount: Number(cod_amount),
    });

    res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
}
