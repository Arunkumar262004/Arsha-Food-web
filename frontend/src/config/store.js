// Business details shown in the top bar, navbar CTA and footer — edit here once.
export const STORE_INFO = {
  name: "Arsha",
  phone: "+91 9578777764",
  whatsapp: "919578777764",
  email: "arsha.kitchen@gmail.com",
  address: "Foodie Street, Kitchen Hub",
  hours: "Open daily · 8:00 AM – 11:00 PM",
};

export const whatsappLink = (text = "Hi Arsha! I'd like to place an order.") =>
  `https://wa.me/${STORE_INFO.whatsapp}?text=${encodeURIComponent(text)}`;
