export let basket: BasketItem[] = [];
export let basketTotal = 0;

import { KANPLA_API_TOKEN } from './config/config.js';

type BasketItem = {
  id: string;
  name: string;
  price: number;
};

const TOKEN = KANPLA_API_TOKEN || ''; 

export async function addToBasket(
  productId: string
): Promise<BasketItem | null> {
  const response = await fetch(
    `https://kanpla-code-challenge.up.railway.app/products/`,
    {
      headers: {
        "X-Auth-User": TOKEN,
      },
    }
  );

  const data = (await response.json()) as {
    id: string;
    name: string;
    vat_rate: number;
    price_unit: number;
  }[];

  const products = data.reduce((acc, item) => {
    function calculatePriceWithVat(price: number, vatRate: number) {
      return 0; //TODO implement
    }
    const itemid = item.id;
    acc[itemid] = {
      id: item.id,
      name: item.name,
      price: calculatePriceWithVat(item.price_unit, item.vat_rate),
    };
    return acc;
  }, {} as Record<string, BasketItem>);

  const product = products[productId];
  if (!product) {
    return null;
  }

  basket.push(product);
  basketTotal += product.price;
  return product;
}

export async function orderAndPay() {
  const createOrderResponse = await fetch(
    "https://kanpla-code-challenge.up.railway.app/orders/",
    {
      method: "POST",
      headers: { "X-Auth-User": TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ total: basketTotal }),
    }
  );
  const createOrderData = (await createOrderResponse.json()) as { id: string };
  const orderId = createOrderData.id;

  const createPaymentResponse = await fetch(
    "https://kanpla-code-challenge.up.railway.app/payments/",
    {
      method: "POST",
      headers: { "X-Auth-User": "", "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, amount: basketTotal }),
    }
  );
  const createPaymentData = (await createPaymentResponse.json()) as {
    id: string;
    amount: number;
    user_id: string;
    created_at: string;
    status: string;
    type: string;
    order_id: string;
  };
  if (createPaymentData.status !== "complete") {
    throw new Error("Payment failed");
  }

  const response = await fetch(
    `https://kanpla-code-challenge.up.railway.app/orders/${orderId}`,
    {
      method: "PATCH",
      headers: { "X-Auth-User": "", "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    }
  );
  const data = await response.json();

  basket = [];
  basketTotal = 0;
}
