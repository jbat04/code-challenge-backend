import express from "express";
import { addToBasket, basketTotal, orderAndPay } from "./basket.js";

const app = express();

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
