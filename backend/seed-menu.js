// Demo menu for the storefront: biryani, meals, starters, snacks, burgers & pizza, drinks, coffee and desserts.
//   node seed-menu.js           add / refresh the demo dishes (matched by name, existing dishes are left alone)
//   node seed-menu.js --remove  delete only the dishes this script created
//   node seed-menu.js --fix-galleries  drop gallery entries that point to files missing from uploads/
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import FoodModel from "./models/Foodmodel.js";
import { connectdb } from "./config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const SEED_TAG = "demo-menu-v1";
const img = (id) => `https://images.unsplash.com/photo-${id}?w=900&q=75&auto=format&fit=crop`;

// [name, price, isVeg, tag, photo id, description]
const MENU = {
  Biryani: [
    ["Hyderabadi Chicken Dum Biryani", 289, false, "Bestseller", "1589302168068-964664d93dc0", "Long-grain basmati and tender chicken layered with saffron, fried onions and mint, slow-cooked on dum. Served with raita and salan."],
    ["Chicken 65 Leg Piece Biryani", 309, false, "", "1631515243349-e0cb75fb8d3a", "Juicy masala leg piece on fragrant biryani rice, finished with ghee and fresh coriander."],
    ["Mutton Dum Biryani", 379, false, "Chef's special", "1633945274405-b6c8069047b0", "Slow-braised mutton on the bone, aged basmati and whole spices, sealed and cooked for hours."],
    ["Egg Biryani Handi", 219, false, "", "1701579231305-d84d8af9a3fd", "Masala-roasted boiled eggs tucked into spiced basmati, served in a clay handi."],
    ["Veg Dum Biryani", 199, true, "", "1563379091339-03b21ab4a4f8", "Seasonal vegetables, paneer and basmati rice cooked with saffron milk and caramelised onions."],
    ["Paneer Tikka Biryani", 249, true, "New", "1642821373181-696a54913e93", "Charred paneer tikka layered with mint-flavoured biryani rice and a hint of kewra."],
  ],
  Meals: [
    ["South Indian Banana Leaf Meals", 229, true, "Bestseller", "1625398407796-82650a8c135f", "Rice, sambar, rasam, kootu, poriyal, appalam, curd and payasam served the traditional way."],
    ["North Indian Deluxe Thali", 279, true, "", "1567337710282-00832b415979", "Two curries, dal, jeera rice, puri, salad and a sweet — a complete meal on one plate."],
    ["Butter Chicken with Butter Naan", 319, false, "Bestseller", "1603894584373-5ac82b2ae398", "Tandoor-smoked chicken in a velvety tomato-butter gravy with two buttery naans."],
    ["Chicken Chettinad Curry & Rice", 289, false, "Spicy", "1565557623262-b51c2513a641", "Fiery Chettinad masala with roasted pepper and fennel, served with steamed rice."],
    ["Kerala Fish Curry Meal", 329, false, "", "1574484284002-952d92456975", "Seer fish simmered in coconut milk and kodampuli, with Kerala matta rice."],
    ["Mutton Rogan Josh", 359, false, "", "1596797038530-2c107229654b", "Kashmiri-style mutton in a deep red gravy of chillies and aromatic spices."],
    ["Paneer Butter Masala & Jeera Rice", 249, true, "", "1588166524941-3bf61a9c41db", "Soft paneer cubes in a rich cashew-tomato gravy with cumin-tempered basmati."],
    ["Dal Tadka Combo", 189, true, "", "1585937421612-70a008356fbe", "Yellow dal tempered with ghee, garlic and red chilli, with rice, roti and pickle."],
  ],
  "South Indian": [
    ["Ghee Roast Masala Dosa", 129, true, "Bestseller", "1668236543090-82eba5ee5976", "Paper-thin crisp dosa roasted in ghee with potato masala, sambar and three chutneys."],
    ["Idli Vada Combo", 99, true, "", "1630383249896-424e482df921", "Two soft idlis and a crisp medu vada with sambar, coconut and tomato chutney."],
    ["Mini Ghee Idli (12 pcs)", 109, true, "", "1589301760014-d929f3979dbc", "Bite-size idlis tossed in ghee and podi, served with sambar."],
  ],
  Starters: [
    ["Tandoori Chicken (Half)", 279, false, "Bestseller", "1610057099443-fde8c4d50f91", "Yoghurt and Kashmiri chilli marinated chicken roasted in the tandoor, with mint chutney."],
    ["Chicken Tikka", 259, false, "", "1617692855027-33b14f061079", "Boneless chicken chunks marinated overnight and char-grilled, served with onion rings."],
    ["Chicken Seekh Kebab", 269, false, "", "1599487488170-d11ec9c172f0", "Minced chicken with herbs and spices, skewered and grilled over charcoal."],
    ["Paneer Tikka Sizzler", 239, true, "", "1567188040759-fb8a883dc6d8", "Paneer, capsicum and onion in tikka masala, served sizzling on a hot plate."],
    ["Chilli Paneer Dry", 219, true, "Spicy", "1604908176997-125f25cc6f3d", "Indo-Chinese favourite — crispy paneer tossed with peppers, garlic and soy-chilli sauce."],
  ],
  Snacks: [
    ["Punjabi Samosa (2 pcs)", 59, true, "Bestseller", "1601050690597-df0568f70950", "Flaky pastry stuffed with spiced potato and peas, served with tamarind and mint chutney."],
    ["Butter Pav Bhaji", 139, true, "", "1606491956689-2ea866880c84", "Mumbai-style mashed vegetable bhaji loaded with butter, with toasted pav and onions."],
    ["Misal Pav", 119, true, "Spicy", "1626132647523-66f5bf380027", "Spicy sprouts curry topped with farsan, onion and lemon, served with soft pav."],
    ["Crispy Fried Chicken (4 pcs)", 249, false, "", "1626082927389-6cd097cdc6ec", "Buttermilk-brined chicken, double-coated and fried golden. Comes with garlic mayo."],
    ["Chicken Strips", 199, false, "", "1562967914-608f82629710", "Crunchy boneless chicken strips with a smoky barbecue dip."],
    ["Loaded Cheese Nachos", 179, true, "", "1513456852971-30c0b8199d4d", "Corn tortilla chips with cheese sauce, salsa, jalapeños and sour cream."],
    ["Peri Peri Loaded Fries", 149, true, "New", "1573080496219-bb080dd4f877", "Crispy fries tossed in peri peri spice, drizzled with cheese sauce and herbs."],
    ["Classic Salted Fries", 99, true, "", "1630384060421-cb20d0e0649d", "Golden, crispy French fries with a pinch of sea salt and ketchup."],
  ],
  "Burgers & Pizza": [
    ["Classic Chicken Burger", 179, false, "", "1568901346375-23c9450c58cd", "Juicy grilled chicken patty, cheddar, lettuce, tomato and house sauce in a toasted bun."],
    ["Double Smash Burger", 259, false, "Bestseller", "1553979459-d2229ba7433b", "Two smashed patties, double cheese, caramelised onions and pickles."],
    ["Crispy Chicken Zinger", 199, false, "", "1606755962773-d324e0a13086", "Spicy crumb-fried chicken fillet with slaw and chipotle mayo."],
    ["Mini Slider Trio", 229, false, "New", "1609167830220-7164aa360951", "Three mini burgers — chicken, peri peri and BBQ — perfect for sharing."],
    ["Aloo Tikki Veg Burger", 129, true, "", "1550547660-d9450f859349", "Crispy spiced potato patty with onion, tomato and mint mayo."],
    ["Margherita Pizza", 249, true, "", "1574071318508-1cdbab80d002", "Hand-stretched base, San Marzano tomato sauce, mozzarella and fresh basil."],
    ["Farmhouse Veg Pizza", 299, true, "", "1513104890138-7c749659a591", "Onion, capsicum, tomato, mushroom and sweet corn on a cheesy base."],
    ["Chicken Tikka Pizza", 349, false, "Chef's special", "1565299624946-b28f40a0ae38", "Tandoori chicken tikka, onions and peppers with a spicy makhani sauce."],
  ],
  "Cool Drinks": [
    ["Coca-Cola (300 ml)", 40, true, "", "1554866585-cd94860890b7", "Chilled Coca-Cola can."],
    ["Pepsi (300 ml)", 40, true, "", "1629203851122-3726ecdf080e", "Chilled Pepsi can."],
    ["Coke Party Pack (2 cans)", 75, true, "", "1622483767028-3f66f32aef97", "Two ice-cold Coca-Cola cans to share."],
    ["Virgin Mint Mojito", 119, true, "Bestseller", "1551538827-9c037cb4f32a", "Fresh mint, lime and soda over crushed ice."],
    ["Fresh Lime Soda", 79, true, "", "1621263764928-df1444c5e859", "Sweet or salted — freshly squeezed lime topped with soda."],
    ["Lemon Iced Tea", 99, true, "", "1556679343-c7306c1976bc", "Brewed black tea chilled with lemon and a touch of honey."],
    ["Orange Sparkler", 109, true, "", "1523371054106-bbf80586c38c", "Orange juice, citrus syrup and sparkling water with a slice of orange."],
  ],
  "Juices & Shakes": [
    ["Fresh Orange Juice", 119, true, "", "1600271886742-f049cd451bba", "Freshly pressed oranges, no added sugar."],
    ["Alphonso Mango Juice", 129, true, "Seasonal", "1546173159-315724a31696", "Thick, sweet Alphonso mango juice, served chilled."],
    ["Mixed Berry Smoothie", 169, true, "", "1553530666-ba11a7da3888", "Strawberry, blueberry and banana blended with yoghurt."],
    ["Oreo Cookie Shake", 159, true, "Bestseller", "1572490122747-3968b75cc699", "Vanilla ice cream, crushed Oreos and chocolate drizzle."],
    ["Belgian Chocolate Shake", 169, true, "", "1577805947697-89e18249d767", "Rich chocolate ice cream shake topped with whipped cream."],
  ],
  "Coffee & Tea": [
    ["Cappuccino", 129, true, "", "1509042239860-f550ce710b93", "Double espresso with silky steamed milk and a thick foam cap."],
    ["Café Latte", 139, true, "", "1495474472287-4d71bcdd2085", "Smooth espresso with plenty of steamed milk and latte art."],
    ["Iced Caramel Latte", 169, true, "Bestseller", "1461023058943-07fcbe16d735", "Espresso, caramel and cold milk poured over ice."],
    ["Cold Coffee", 149, true, "", "1517701604599-bb29b565090c", "Classic Indian café-style cold coffee, blended thick and frothy."],
    ["Espresso Doppio", 99, true, "", "1561336313-0bd5e0b27ec8", "A double shot of our house-roasted espresso."],
    ["Masala Chai", 49, true, "", "1544787219-7f47ccb76574", "Strong tea brewed with milk, ginger, cardamom and fresh spices."],
    ["Sulaimani Lemon Tea", 49, true, "", "1571934811356-5cc061b6821f", "Light black tea with lemon and a hint of spice."],
  ],
  Deserts: [
    ["Hot Fudge Brownie Sundae", 179, true, "Bestseller", "1563805042-7684c019e1cb", "Warm brownie, vanilla ice cream, hot fudge and crushed cookies."],
    ["Strawberry Panna Cotta", 159, true, "", "1488477181946-6428a0291777", "Silky vanilla panna cotta with a fresh strawberry compote."],
    ["Glazed Donut Box (3 pcs)", 149, true, "New", "1551024601-bec78aea704b", "Chocolate-glazed donuts with rainbow sprinkles."],
    ["Soft Serve Ice Cream Cone", 69, true, "", "1497034825429-c343d7c6a68f", "Creamy strawberry-vanilla swirl in a crisp waffle cone."],
  ],
};

const rows = Object.entries(MENU).flatMap(([category, items]) =>
  items.map(([name, price, isVeg, tag, photo, description]) => ({
    name, price, isVeg, tag, description, category,
    image: img(photo), images: [img(photo)], imageProvider: "external", seedTag: SEED_TAG,
  })));

const run = async () => {
  await connectdb();
  if (mongoose.connection.readyState !== 1) throw new Error("Could not connect to MongoDB");

  if (process.argv.includes("--remove")) {
    const { deletedCount } = await FoodModel.deleteMany({ seedTag: SEED_TAG });
    console.log(`Removed ${deletedCount} demo dishes.`);
    return;
  }

  if (process.argv.includes("--fix-galleries")) {
    const uploads = path.join(__dirname, "uploads");
    const exists = (img) => /^https?:\/\//.test(img) || fs.existsSync(path.join(uploads, path.basename(img)));
    let fixed = 0;
    for (const food of await FoodModel.find({})) {
      const kept = (food.images || []).filter(exists);
      if (kept.length !== (food.images || []).length) {
        food.images = kept.length ? kept : [food.image];
        await food.save();
        fixed++;
      }
    }
    console.log(`Cleaned broken gallery images on ${fixed} dishes.`);
    return;
  }

  let created = 0, updated = 0;
  for (const row of rows) {
    const res = await FoodModel.updateOne({ name: row.name }, { $set: row }, { upsert: true });
    if (res.upsertedCount) created++; else if (res.modifiedCount) updated++;
  }
  console.log(`Demo menu ready: ${created} added, ${updated} updated, ${rows.length} total across ${Object.keys(MENU).length} categories.`);
};

run()
  .catch((err) => { console.error("Seed failed:", err.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
