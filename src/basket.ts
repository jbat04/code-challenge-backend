export let basket: BasketItem[] = [];
export let basketTotal = 0;

import { KANPLA_API_TOKEN } from './config/config.js';
import { addItem, deleteAllItems, readAllItemsAggregated } from './db.js';


type BasketItem = {
    id: string;
    name: string;
    price: number;
};

type CreateOrderResponse = { id: string };
type CreatePaymentResponse = {
    id: string;
    amount: number;
    user_id: string;
    created_at: string;
    status: string;
    type: string;
    order_id: string;
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
            return (vatRate * price) + price;
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
    //add item to db in case program stops
    addItem(product.id, product.name, product.price)
    basketTotal += product.price;
    return product;
}

async function makeRequest<T>(
    url: string,
    options: RequestInit,
    maxRetries = 3
): Promise<T> {
    let attempts = 0;

    while (attempts < maxRetries) {
        try {
            const response = await fetch(url, options);

            // Check if the response is not OK
            if (!response.ok) {
                const errorText = await response.text();  // Read the raw error message
                throw new Error(`Request failed with status ${response.status}: ${errorText}`);
            }

            const contentType = response.headers.get("Content-Type") || "";
            // Check if the content is JSON
            if (contentType.includes("application/json")) {
                try {
                    const data = await response.json() as T;
                    return data;
                } catch (e) {
                    throw new Error(`Failed to parse JSON from response: ${e}`);
                }
            }

            // If it's not JSON, just throw an error with the raw response text
            const rawText = await response.text(); // Fallback to raw text if not JSON
            throw new Error(`Unexpected response type. Expected JSON but received: ${contentType}. Response: ${rawText}`);

        } catch (error) {
            attempts++;
            if (attempts >= maxRetries) {
                throw new Error(`Request failed after ${maxRetries} attempts: ${error}`);
            }
        }
    }
    throw new Error("Unhandled error during request.");
}




export async function orderAndPay() {
    const basketTotalFromDb = await readAllItemsAggregated();

    try {
        const createOrderResponse = await makeRequest<CreateOrderResponse>(
            "https://kanpla-code-challenge.up.railway.app/orders/",
            {
                method: "POST",
                headers: { "X-Auth-User": TOKEN, "Content-Type": "application/json" },
                body: JSON.stringify({ total: basketTotalFromDb.totalPrice }),
            }
        );

        const orderId = createOrderResponse.id;

        const createPaymentResponse = await makeRequest<CreatePaymentResponse>(
            "https://kanpla-code-challenge.up.railway.app/payments/",
            {
                method: "POST",
                headers: { "X-Auth-User": TOKEN, "Content-Type": "application/json" },
                body: JSON.stringify({ order_id: orderId, amount: 1 }),
            }
        );

        console.log("Payment status: " + createPaymentResponse.status);
        if (createPaymentResponse.status !== "completed") {
            throw new Error("Payment failed");
        }

        const updateOrderResponse = await fetch(
            `https://kanpla-code-challenge.up.railway.app/orders/${orderId}`,
            {
                method: "PATCH",
                headers: { "X-Auth-User": TOKEN, "Content-Type": "application/json" },
                body: JSON.stringify({ status: "completed" }),
            }
        );

        if (!updateOrderResponse.ok) {
            const errorText = await updateOrderResponse.text();
            throw new Error(`Failed to update order status: ${errorText}`);
        }

        const data = await updateOrderResponse.json();

        // Clear the basket if the order is successful
        if (updateOrderResponse.status === 200) {
            await deleteAllItems();
        }

        basket = [];
        basketTotal = 0;
    } catch (error) {
        // Handle errors gracefully and log them
        console.error("An error occurred during order and payment process:", error);
        // Optionally, handle retry logic or display a user-friendly message
    }
}
