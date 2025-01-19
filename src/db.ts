import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Open a database connection
const dbPromise = open({
    filename: './basket.db', // Local SQLite database file
    driver: sqlite3.Database,
});

// Create table if it doesn't exist (with auto-incrementing `id` and `item_id`)
async function createTable(): Promise<void> {
    const db = await dbPromise;
    await db.exec(`
    CREATE TABLE IF NOT EXISTS basket (
      id INTEGER PRIMARY KEY AUTOINCREMENT,  -- New auto-incrementing primary key
      item_id TEXT NOT NULL,  -- Old ID is now renamed to item_id
      name TEXT,
      price REAL
    );
  `);
    console.log('Table "basket" is ready.');
}

// Add an item to the basket (insert always, even if the id already exists)
async function addItem(item_id: string, name: string, price: number): Promise<void> {
    const db = await dbPromise;

    // Insert the item regardless of whether the item_id already exists
    await db.run(
        `INSERT INTO basket (item_id, name, price) VALUES (?, ?, ?)`,
        [item_id, name, price]
    );
    console.log(`Item with item_id ${item_id} added.`);
}

// Read all items in the basket and aggregate them into a JSON object
async function readAllItemsAggregated(): Promise<any> {
    const db = await dbPromise;

    // Get all rows from the basket table
    const rows = await db.all(`SELECT * FROM basket`);

    // Aggregate data (e.g., sum of total price)
    const totalPrice = rows.reduce((acc: number, item: any) => {
        return acc + item.price; // Just summing up the price now
    }, 0);

    // Return both the full list and aggregated data in a JSON format
    return {
        items: rows,
        totalPrice,
        itemCount: rows.length,  // Total number of items in the basket
    };
}

// Read a single item by item_id
async function readItem(item_id: string): Promise<any> {
    const db = await dbPromise;
    const row = await db.get(`SELECT * FROM basket WHERE item_id = ?`, [item_id]);
    return row;
}

// Delete an item by item_id
async function deleteItem(item_id: string): Promise<void> {
    const db = await dbPromise;
    await db.run(`DELETE FROM basket WHERE item_id = ?`, [item_id]);
    console.log(`Item with item_id ${item_id} deleted.`);
}

// Remove all items from the basket
async function deleteAllItems(): Promise<void> {
    const db = await dbPromise;
    await db.run(`DELETE FROM basket`);
    console.log('All items have been deleted from the basket.');
}

// Initialize the database and table
createTable();

// Export CRUD operations for use in other parts of your application
export {
    addItem,
    readAllItemsAggregated,
    readItem,
    deleteItem,
    deleteAllItems,
};
