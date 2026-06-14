import { PrismaClient } from "@prisma/client";
import { filterCustomersByRules, enrichCustomer, type SegmentRule } from "./lib/segments";

const prisma = new PrismaClient();

const FIRST_NAMES = [
  "Aarav", "Aditi", "Amit", "Ananya", "Arjun", "Bhavya", "Deepa", "Diya",
  "Gaurav", "Isha", "Kabir", "Kavya", "Neha", "Priya", "Rahul", "Rajesh",
  "Rohit", "Sakshi", "Shreya", "Tanvi", "Varun", "Vikram", "Yash", "Zara",
];
const LAST_NAMES = [
  "Agarwal", "Banerjee", "Gupta", "Iyer", "Jain", "Kapoor", "Kumar",
  "Malhotra", "Mehta", "Patel", "Rao", "Reddy", "Sharma", "Singh", "Verma",
];
const CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Pune", "Chennai", "Kolkata",
  "Ahmedabad", "Jaipur", "Lucknow", "Surat", "Indore", "Chandigarh", "Kochi",
  "Nagpur", "Coimbatore",
];
const PRODUCT_NAMES = [
  "Premium Silk Saree", "Bluetooth Earbuds", "Leather Messenger Bag",
  "Organic Spice Box", "Smartwatch Pro", "Cotton Kurta Set", "Ayurvedic Skincare Kit",
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomDate(startDays: number, endDays: number): Date {
  const now = new Date();
  return new Date(now.getTime() - rand(endDays, startDays) * 24 * 60 * 60 * 1000);
}

const MOCK_SEGMENTS = [
  {
    name: "Premium VIP",
    rules: [{ id: "r1", field: "totalSpend", operator: ">=", value: 50000 }],
    ruleLogic: "AND",
  },
  {
    name: "Inactive 90 Days",
    rules: [{ id: "r2", field: "daysSinceLastPurchase", operator: ">=", value: 90 }],
    ruleLogic: "AND",
  },
  {
    name: "Mumbai High Value",
    rules: [
      { id: "r3", field: "totalSpend", operator: ">=", value: 25000 },
      { id: "r4", field: "city", operator: "==", value: "Mumbai" },
    ],
    ruleLogic: "AND",
  },
  {
    name: "New Customers",
    rules: [{ id: "r5", field: "daysSinceCreation", operator: "<=", value: 30 }],
    ruleLogic: "AND",
  },
  {
    name: "Frequent Buyers",
    rules: [{ id: "r6", field: "orderCount", operator: ">=", value: 10 }],
    ruleLogic: "AND",
  },
  {
    name: "Budget Shoppers",
    rules: [
      { id: "r7", field: "totalSpend", operator: ">=", value: 1000 },
      { id: "r8", field: "totalSpend", operator: "<=", value: 5000 },
    ],
    ruleLogic: "AND",
  },
];

const CAMPAIGN_NAMES = [
  "Diwali Mega Sale", "Summer Clearance", "Win-Back Inactive Users",
  "New Arrivals Launch", "Republic Day Special", "Loyalty Rewards Update",
];

async function main() {
  console.log("Clearing existing data...");
  await prisma.communicationEvent.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.segment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();

  console.log("Seeding 500 customers...");
  const usedEmails = new Set<string>();

  for (let i = 0; i < 500; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const name = `${first} ${last}`;
    let email = `${first.toLowerCase()}.${last.toLowerCase()}${rand(1, 99)}@gmail.com`;
    while (usedEmails.has(email)) {
      email = `${first.toLowerCase()}.${last.toLowerCase()}${rand(100, 9999)}@gmail.com`;
    }
    usedEmails.add(email);

    const city = pick(CITIES);
    const orderCount = rand(0, 25);
    const createdAt = randomDate(30, 730);

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone: `+91-${rand(70000, 99999)}${rand(10000, 99999)}`,
        city,
        totalSpend: 0,
        createdAt,
      },
    });

    let totalSpend = 0;
    for (let j = 0; j < orderCount; j++) {
      const itemCount = rand(1, 3);
      const items = Array.from({ length: itemCount }, () => {
        const price = rand(200, 15000);
        return { name: pick(PRODUCT_NAMES), quantity: rand(1, 3), price };
      });
      const amount = items.reduce((s, it) => s + it.price * it.quantity, 0);
      totalSpend += amount;

      await prisma.order.create({
        data: {
          customerId: customer.id,
          amount,
          items: JSON.stringify(items),
          purchasedAt: randomDate(1, 365),
        },
      });
    }

    if (totalSpend > 0) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { totalSpend },
      });
    }
  }

  console.log("Seeding segments...");
  const segments = [];
  for (const seg of MOCK_SEGMENTS) {
    const segment = await prisma.segment.create({
      data: {
        name: seg.name,
        rules: JSON.stringify(seg.rules),
        ruleLogic: seg.ruleLogic,
      },
    });
    segments.push(segment);
  }

  const allCustomers = await prisma.customer.findMany({ include: { orders: true } });
  const enriched = allCustomers.map(enrichCustomer);

  console.log("Seeding campaigns...");
  const channels = ["whatsapp", "sms", "email", "rcs"];
  const statuses = ["completed", "completed", "draft", "sending"];

  for (let i = 0; i < CAMPAIGN_NAMES.length; i++) {
    const segment = segments[i % segments.length];
    const rules = JSON.parse(segment.rules) as SegmentRule[];
    const logic = (segment.ruleLogic as "AND" | "OR") || "AND";
    const matchCount = filterCustomersByRules(enriched, rules, logic).length;

    const status = statuses[i % statuses.length];
    const campaign = await prisma.campaign.create({
      data: {
        name: CAMPAIGN_NAMES[i],
        segmentId: segment.id,
        channel: channels[i % channels.length],
        message: `Hi {{name}}, check out our ${CAMPAIGN_NAMES[i].toLowerCase()}! Exclusive deals in {{city}}.`,
        status,
        sentAt: status !== "draft" ? randomDate(1, 30) : null,
        tokens: JSON.stringify({ discount: "20%", code: "SAVE20" }),
      },
    });

    if (status === "draft") continue;

    const matches = filterCustomersByRules(enriched, rules, logic).slice(0, Math.min(matchCount, 40));

    for (const customer of matches) {
      const delivered = Math.random() < 0.9;
      const opened = delivered && Math.random() < 0.6;
      const clicked = opened && Math.random() < 0.2;
      const failed = !delivered;

      const events: string[] = ["sent"];
      if (failed) events.push("failed");
      else {
        events.push("delivered");
        if (opened) {
          events.push("opened");
          if (Math.random() < 0.5) events.push("read");
        }
        if (clicked) events.push("clicked");
      }

      const finalStatus = clicked ? "clicked" : opened ? "opened" : delivered ? "delivered" : "failed";

      const comm = await prisma.communication.create({
        data: {
          campaignId: campaign.id,
          customerId: customer.id,
          channel: campaign.channel,
          message: campaign.message.replace("{{name}}", customer.name).replace("{{city}}", customer.city ?? ""),
          status: finalStatus,
          sentAt: randomDate(1, 20),
          deliveredAt: delivered ? randomDate(1, 19) : null,
          openedAt: opened ? randomDate(1, 18) : null,
          clickedAt: clicked ? randomDate(1, 17) : null,
        },
      });

      for (const eventType of events) {
        await prisma.communicationEvent.create({
          data: { communicationId: comm.id, eventType, timestamp: randomDate(0, 15) },
        });
      }

      if (clicked && Math.random() < 0.15) {
        const amount = rand(500, 12000);
        const order = await prisma.order.create({
          data: {
            customerId: customer.id,
            amount,
            items: JSON.stringify([{ name: pick(PRODUCT_NAMES), quantity: 1, price: amount }]),
            purchasedAt: new Date(),
          },
        });
        await prisma.communication.update({
          where: { id: comm.id },
          data: { attributedOrderId: order.id },
        });
        await prisma.customer.update({
          where: { id: customer.id },
          data: { totalSpend: { increment: amount } },
        });
      }
    }
  }

  const customerCount = await prisma.customer.count();
  const orderCount = await prisma.order.count();
  const segmentCount = await prisma.segment.count();
  const campaignCount = await prisma.campaign.count();

  console.log(`Done! ${customerCount} customers, ${orderCount} orders, ${segmentCount} segments, ${campaignCount} campaigns.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
