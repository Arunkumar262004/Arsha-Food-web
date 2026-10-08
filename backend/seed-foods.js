import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import FoodModel from "./models/Foodmodel.js";
import { connectdb } from "./config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const sampleProducts = [
  {
    name: "Greek Supreme Salad",
    description: "Fresh crisp cucumbers, ripe vine tomatoes, Kalamata olives, feta cheese & virgin olive oil oregano dressing.",
    price: 180,
    category: "Salad",
    image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800",
    images: [
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800",
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800"
    ]
  },
  {
    name: "Avocado Power Bowl",
    description: "Superfood bowl with quinoa, creamy avocado slices, cherry tomatoes, edamame & lemon tahini dressing.",
    price: 240,
    category: "Salad",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800",
    images: [
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800"
    ]
  },
  {
    name: "Paneer Tikka Kathi Roll",
    description: "Marinated cottage cheese charcoal grilled to perfection, rolled in layered flaky paratha with mint chutney.",
    price: 160,
    category: "Rolls",
    image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800",
    images: [
      "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800"
    ]
  },
  {
    name: "Crispy Veg Spring Rolls",
    description: "Golden fried crispy rolls stuffed with julienned vegetables & served with spicy sweet chili dip.",
    price: 140,
    category: "Rolls",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800",
    images: [
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=800"
    ]
  },
  {
    name: "Chocolate Lava Cake",
    description: "Warm moist chocolate cake with molten chocolate fudge core served alongside gourmet vanilla bean ice cream.",
    price: 190,
    category: "Deserts",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800",
    images: [
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800"
    ]
  },
  {
    name: "Berry Bliss Cheesecake",
    description: "Rich and velvety New York style cheesecake topped with fresh wild blueberry & raspberry compote.",
    price: 220,
    category: "Deserts",
    image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800",
    images: [
      "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800"
    ]
  },
  {
    name: "Grilled Cheese & Herb Sandwich",
    description: "Toasted artisan sourdough bread packed with aged cheddar, creamy mozzarella & fresh Italian herbs.",
    price: 150,
    category: "Sandwich",
    image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800",
    images: [
      "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800"
    ]
  },
  {
    name: "Club Supreme Sandwich",
    description: "Triple-layer toasted sandwich layered with crisp lettuce, garden tomatoes, cheese slice & chipotle spread.",
    price: 180,
    category: "Sandwich",
    image: "https://images.unsplash.com/photo-1553909489-cd47e0907980?w=800",
    images: [
      "https://images.unsplash.com/photo-1553909489-cd47e0907980?w=800"
    ]
  },
  {
    name: "Red Velvet Gateau",
    description: "Soft red velvet sponge layers infused with cocoa and frosted with silky smooth cream cheese frosting.",
    price: 250,
    category: "Cake",
    image: "https://images.unsplash.com/photo-1586788680404-329d23667406?w=800",
    images: [
      "https://images.unsplash.com/photo-1586788680404-329d23667406?w=800"
    ]
  },
  {
    name: "Truffle Dark Chocolate Cake",
    description: "Decadent Dutch dark chocolate truffle cake dusted with Dutch cocoa powder.",
    price: 280,
    category: "Cake",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800",
    images: [
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800"
    ]
  },
  {
    name: "Shahi Paneer Butter Masala",
    description: "Tender paneer cubes simmered in a luscious rich tomato butter cashew curry.",
    price: 240,
    category: "Pure Veg",
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800",
    images: [
      "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800"
    ]
  },
  {
    name: "Dal Makhani Special",
    description: "Slow-cooked whole black lentils enriched with fresh butter, cream & aromatic spices.",
    price: 210,
    category: "Pure Veg",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800",
    images: [
      "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800"
    ]
  },
  {
    name: "Penne Arrabbiata",
    description: "Italian penne pasta tossed in fiery garlic plum tomato sauce with fresh basil & parmesan.",
    price: 210,
    category: "Pasta",
    image: "https://images.unsplash.com/photo-1621996346565-e3d5d6281292?w=800",
    images: [
      "https://images.unsplash.com/photo-1621996346565-e3d5d6281292?w=800"
    ]
  },
  {
    name: "Creamy Alfredo Penne",
    description: "Rich parmesan garlic cream sauce tossed with al dente penne pasta and sun-dried tomatoes.",
    price: 230,
    category: "Pasta",
    image: "https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=800",
    images: [
      "https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=800"
    ]
  },
  {
    name: "Hakka Veg Noodles",
    description: "Wok-tossed Indo-Chinese noodles with crunchy bell peppers, cabbage, carrots & soy glaze.",
    price: 170,
    category: "Noodles",
    image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800",
    images: [
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800"
    ]
  },
  {
    name: "Schezwan Spicy Noodles",
    description: "Fiery Schezwan chilli-garlic noodles tossed with wok vegetables & spring onion greens.",
    price: 190,
    category: "Noodles",
    image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800",
    images: [
      "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800"
    ]
  }
];

async function seed() {
  try {
    console.log("Connecting to MongoDB via connectdb()...");
    await connectdb();

    let insertedCount = 0;
    for (const prod of sampleProducts) {
      const exists = await FoodModel.findOne({ name: prod.name });
      if (!exists) {
        await FoodModel.create(prod);
        insertedCount++;
        console.log(`+ Added food item: ${prod.name}`);
      } else {
        console.log(`= Already exists: ${prod.name}`);
      }
    }

    console.log(`\nSeed completed! Added ${insertedCount} new food products.`);
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();
