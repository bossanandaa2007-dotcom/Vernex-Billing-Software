import { CatProduct, PrismaClient, TaxMode } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  ['TEA-001', 'Tea', 8, 15, 120, CatProduct.DRINK],
  ['COFFEE-001', 'Coffee', 15, 30, 80, CatProduct.DRINK],
  ['LEMON-TEA-001', 'Lemon Tea', 12, 25, 70, CatProduct.DRINK],
  ['SAMOSA-001', 'Samosa', 10, 20, 100, CatProduct.FOOD],
  ['VADA-001', 'Vada', 8, 15, 100, CatProduct.FOOD],
  ['VEG-PUFF-001', 'Veg Puff', 18, 30, 60, CatProduct.FOOD],
  ['WATER-001', 'Water Bottle', 12, 20, 96, CatProduct.DRINK],
  ['FRIED-RICE-001', 'Fried Rice', 65, 120, 40, CatProduct.FOOD],
  ['NOODLES-001', 'Noodles', 60, 110, 40, CatProduct.FOOD],
  ['BIRYANI-001', 'Biryani', 90, 170, 35, CatProduct.FOOD],
  ['JUICE-001', 'Fresh Juice', 30, 60, 50, CatProduct.DRINK],
  ['BISCUIT-001', 'Biscuit Pack', 7, 10, 150, CatProduct.FOOD],
  ['COOL-DRINK-001', 'Cool Drink', 25, 40, 72, CatProduct.DRINK],
  ['NOTEBOOK-001', 'Notebook', 35, 55, 75, CatProduct.STATIONERY],
  ['PEN-001', 'Pen', 5, 10, 200, CatProduct.STATIONERY],
] as const;

async function main() {
  const trialStartedAt = new Date();
  const trialEndsAt = new Date(trialStartedAt);
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);
  const business = await prisma.business.upsert({
    where: { id: 'vernex-primary-business' },
    update: {
      name: 'Vernex',
      country: 'India',
      currency: 'INR',
      taxMode: TaxMode.GST,
      ownerUserId: 'vernex-owner-auth-user',
      trialEndsAt,
      subscriptionStatus: 'TRIAL',
      planName: 'Free Trial',
    },
    create: {
      id: 'vernex-primary-business',
      name: 'Vernex',
      country: 'India',
      currency: 'INR',
      taxMode: TaxMode.GST,
      ownerUserId: 'vernex-owner-auth-user',
      trialStartedAt,
      trialEndsAt,
      subscriptionStatus: 'TRIAL',
      planName: 'Free Trial',
    },
  });

  await prisma.staffProfile.upsert({
    where: { authUserId: 'vernex-owner-auth-user' },
    update: { businessId: business.id, role: 'OWNER', status: 'ACTIVE' },
    create: {
      authUserId: 'vernex-owner-auth-user',
      businessId: business.id,
      name: 'Vernex Owner',
      email: 'admin@vernex.app',
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  await prisma.staffProfile.upsert({
    where: { authUserId: 'vernex-manager-auth-user' },
    update: { businessId: business.id, role: 'MANAGER', status: 'ACTIVE' },
    create: {
      authUserId: 'vernex-manager-auth-user',
      businessId: business.id,
      name: 'Vernex Manager',
      email: 'manager@vernex.local',
      role: 'MANAGER',
      status: 'ACTIVE',
    },
  });

  await prisma.staffProfile.upsert({
    where: { authUserId: 'vernex-cashier-auth-user' },
    update: { businessId: business.id, role: 'CASHIER', status: 'ACTIVE' },
    create: {
      authUserId: 'vernex-cashier-auth-user',
      businessId: business.id,
      name: 'Vernex Cashier',
      email: 'cashier@vernex.local',
      role: 'CASHIER',
      status: 'ACTIVE',
    },
  });

  for (const [id, name, price, sellprice, stock, cat] of products) {
    await prisma.productStock.upsert({
      where: { id },
      update: { name, price, stock, cat, businessId: business.id },
      create: { id, name, price, stock, cat, businessId: business.id },
    });

    await prisma.product.upsert({
      where: { productId: id },
      update: { sellprice },
      create: { productId: id, sellprice },
    });
  }

  // Remove legacy faker rows that never had a sellable Product relation.
  await prisma.productStock.deleteMany({ where: { Product: { none: {} } } });

  const shop = await prisma.shopData.findFirst();
  if (!shop) {
    await prisma.shopData.create({
      data: {
        name: 'Vernex',
        tax: 5,
        country: 'India',
        currency: 'INR',
        taxMode: TaxMode.GST,
        receiptFooter: 'Thank you for your business!',
        businessId: business.id,
      },
    });
  } else if (!shop.businessId) {
    await prisma.shopData.update({ where: { id: shop.id }, data: { businessId: business.id } });
  }

  const sequence = await prisma.billSequence.upsert({
    where: { id: business.id },
    update: { businessId: business.id },
    create: { id: business.id, nextNumber: 1, businessId: business.id },
  });
  let nextNumber = sequence.nextNumber;
  const unnumberedSales = await prisma.transaction.findMany({
    where: { isComplete: true, billNumber: null },
    orderBy: { completedAt: 'asc' },
  });
  for (const sale of unnumberedSales) {
    await prisma.transaction.update({
      where: { id: sale.id },
      data: { billNumber: `VNX-${String(nextNumber).padStart(6, '0')}` },
    });
    nextNumber += 1;
  }
  await prisma.billSequence.update({ where: { id: business.id }, data: { nextNumber } });

  console.log(`Seeded ${products.length} linked products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
