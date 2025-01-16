import express, { Request, Response, NextFunction } from "express";
import { addToBasket, basketTotal, orderAndPay } from "./basket.js";
import { POS_API_KEY } from './config/config.js';

const app = express();



// Middleware to require API key
function requireApiKey(req: Request, res: Response, next: NextFunction): void {
    const apiKey = req.header("X-Auth-User");
    if (!apiKey) {
        res.status(401).json({ error: "API key is required" });
        return; // Ensure the function exits
    }

    if (apiKey !== POS_API_KEY) {
        res.status(403).json({ error: "Invalid API key" });
        return; // Ensure the function exits
    }

    next(); // Proceed if the API key is valid
}

// Apply middleware globally for all routes
app.use(requireApiKey);


app.post("/product/:id", async (req, res) => {
  const basketItem = await addToBasket(req.params.id);

  if (basketItem) {
    res.status(200).json({ newItem: basketItem, total: basketTotal });
  } else {
    res.status(404).json({ message: "Product not found" });
  }
});

app.post("/orderAndPay", async (req, res) => {
  await orderAndPay();
  res.status(200).json({ message: "Order placed successfully" });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
