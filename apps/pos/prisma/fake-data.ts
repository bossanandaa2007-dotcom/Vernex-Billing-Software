import { UserRole, StaffStatus, CatProduct, PaymentMethod, PaymentStatus, TaxMode, InventoryMovementType, ReturnStatus, SubscriptionStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';
import Decimal from 'decimal.js';



export function fakeUser() {
  return {
    name: faker.person.fullName(),
    username: faker.internet.userName(),
    email: undefined,
    emailVerified: undefined,
    image: undefined,
    password: undefined,
  };
}
export function fakeUserComplete() {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    username: faker.internet.userName(),
    email: undefined,
    emailVerified: undefined,
    image: undefined,
    password: undefined,
    role: UserRole.UNKNOW,
  };
}
export function fakeProductStock() {
  return {
    name: faker.person.fullName(),
    imageProduct: undefined,
    price: faker.number.float(),
    stock: faker.number.float(),
    cat: faker.helpers.arrayElement([CatProduct.ELECTRO, CatProduct.DRINK, CatProduct.FOOD, CatProduct.FASHION, CatProduct.STATIONERY] as const),
  };
}
export function fakeProductStockComplete() {
  return {
    id: faker.string.uuid(),
    businessId: faker.string.uuid(),
    name: faker.person.fullName(),
    imageProduct: undefined,
    price: faker.number.float(),
    stock: faker.number.float(),
    cat: faker.helpers.arrayElement([CatProduct.ELECTRO, CatProduct.DRINK, CatProduct.FOOD, CatProduct.FASHION, CatProduct.STATIONERY] as const),
  };
}
export function fakeProduct() {
  return {
    sellprice: faker.number.float(),
  };
}
export function fakeProductComplete() {
  return {
    id: faker.string.uuid(),
    productId: faker.string.uuid(),
    sellprice: faker.number.float(),
  };
}
export function fakeOnSaleProduct() {
  return {
    quantity: faker.number.int(),
  };
}
export function fakeOnSaleProductComplete() {
  return {
    id: faker.string.uuid(),
    productId: undefined,
    quantity: faker.number.int(),
    saledate: new Date(),
    transactionId: faker.string.uuid(),
    productName: '',
    unitPrice: 0,
    costPrice: 0,
    taxRate: 0,
    lineSubtotal: 0,
    taxAmount: 0,
    lineTotal: 0,
  };
}
export function fakeTransaction() {
  return {
    billNumber: undefined,
    customerName: undefined,
    customerPhone: undefined,
    customerEmail: undefined,
    customerAddress: undefined,
    customerTaxId: undefined,
    paymentMethod: undefined,
    completedAt: undefined,
    returnStatus: undefined,
  };
}
export function fakeTransactionComplete() {
  return {
    id: faker.string.uuid(),
    businessId: faker.string.uuid(),
    billNumber: undefined,
    customerName: undefined,
    customerPhone: undefined,
    customerEmail: undefined,
    customerAddress: undefined,
    customerTaxId: undefined,
    customerId: undefined,
    subtotal: new Decimal(0),
    discount: new Decimal(0),
    taxAmount: new Decimal(0),
    totalAmount: new Decimal(0),
    amountReceived: new Decimal(0),
    changeAmount: new Decimal(0),
    paymentMethod: undefined,
    paymentStatus: PaymentStatus.PENDING,
    createdAt: new Date(),
    completedAt: undefined,
    isComplete: false,
    returnStatus: undefined,
    refundedAmount: new Decimal(0),
  };
}
export function fakeCustomer() {
  return {
    name: faker.person.fullName(),
    phone: faker.lorem.words(5),
    email: undefined,
    address: undefined,
    taxId: undefined,
    country: undefined,
    notes: undefined,
    updatedAt: faker.date.anytime(),
  };
}
export function fakeCustomerComplete() {
  return {
    id: faker.string.uuid(),
    businessId: faker.string.uuid(),
    name: faker.person.fullName(),
    phone: faker.lorem.words(5),
    email: undefined,
    address: undefined,
    taxId: undefined,
    country: undefined,
    notes: undefined,
    isActive: true,
    createdAt: new Date(),
    updatedAt: faker.date.anytime(),
  };
}
export function fakeInventoryMovement() {
  return {
    productNameSnapshot: faker.lorem.words(5),
    movementType: faker.helpers.arrayElement([InventoryMovementType.SALE, InventoryMovementType.RESTOCK, InventoryMovementType.RETURN, InventoryMovementType.ADJUSTMENT] as const),
    quantityChange: faker.number.float(),
    previousStock: faker.number.float(),
    newStock: faker.number.float(),
    referenceType: undefined,
    referenceId: undefined,
    referenceBillNumber: undefined,
    reason: undefined,
  };
}
export function fakeInventoryMovementComplete() {
  return {
    id: faker.string.uuid(),
    businessId: faker.string.uuid(),
    productId: undefined,
    productNameSnapshot: faker.lorem.words(5),
    movementType: faker.helpers.arrayElement([InventoryMovementType.SALE, InventoryMovementType.RESTOCK, InventoryMovementType.RETURN, InventoryMovementType.ADJUSTMENT] as const),
    quantityChange: faker.number.float(),
    previousStock: faker.number.float(),
    newStock: faker.number.float(),
    referenceType: undefined,
    referenceId: undefined,
    referenceBillNumber: undefined,
    reason: undefined,
    createdAt: new Date(),
  };
}
export function fakeSaleReturn() {
  return {
    originalBillNumber: faker.lorem.words(5),
    refundAmount: new Decimal(faker.number.float()),
    refundMethod: faker.helpers.arrayElement([PaymentMethod.CASH, PaymentMethod.UPI, PaymentMethod.CARD, PaymentMethod.CREDIT, PaymentMethod.ONLINE] as const),
    reason: faker.lorem.words(5),
    status: faker.helpers.arrayElement([ReturnStatus.PARTIAL, ReturnStatus.RETURNED] as const),
  };
}
export function fakeSaleReturnComplete() {
  return {
    id: faker.string.uuid(),
    businessId: faker.string.uuid(),
    originalTransactionId: faker.string.uuid(),
    originalBillNumber: faker.lorem.words(5),
    refundAmount: new Decimal(faker.number.float()),
    refundMethod: faker.helpers.arrayElement([PaymentMethod.CASH, PaymentMethod.UPI, PaymentMethod.CARD, PaymentMethod.CREDIT, PaymentMethod.ONLINE] as const),
    reason: faker.lorem.words(5),
    status: faker.helpers.arrayElement([ReturnStatus.PARTIAL, ReturnStatus.RETURNED] as const),
    createdAt: new Date(),
  };
}
export function fakeReturnItem() {
  return {
    productId: undefined,
    productName: faker.lorem.words(5),
    quantity: faker.number.int(),
    unitRefund: new Decimal(faker.number.float()),
    refundAmount: new Decimal(faker.number.float()),
  };
}
export function fakeReturnItemComplete() {
  return {
    id: faker.string.uuid(),
    saleReturnId: faker.string.uuid(),
    onSaleProductId: faker.string.uuid(),
    productId: undefined,
    productName: faker.lorem.words(5),
    quantity: faker.number.int(),
    unitRefund: new Decimal(faker.number.float()),
    refundAmount: new Decimal(faker.number.float()),
  };
}
export function fakeShopData() {
  return {
    phone: undefined,
    address: undefined,
    taxId: undefined,
  };
}
export function fakeShopDataComplete() {
  return {
    id: faker.string.uuid(),
    businessId: faker.string.uuid(),
    tax: 0,
    name: 'Vernex',
    country: 'India',
    currency: 'INR',
    taxMode: TaxMode.GST,
    phone: undefined,
    address: undefined,
    taxId: undefined,
    receiptFooter: 'Thank you for your business!',
    billPrefix: 'VNX',
    billPadding: 6,
    showBusinessLogo: true,
    showTaxId: true,
    showCustomerDetails: true,
    showItemTax: true,
    showFooter: true,
    receiptSize: '80mm',
  };
}
export function fakeBillSequenceComplete() {
  return {
    id: faker.string.uuid(),
    businessId: faker.string.uuid(),
    nextNumber: 1,
  };
}
export function fakeBusiness() {
  return {
    name: faker.person.fullName(),
    ownerUserId: faker.lorem.words(5),
    trialEndsAt: undefined,
    activatedAt: undefined,
    suspendedAt: undefined,
    updatedAt: faker.date.anytime(),
  };
}
export function fakeBusinessComplete() {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    country: 'India',
    currency: 'INR',
    taxMode: TaxMode.GST,
    ownerUserId: faker.lorem.words(5),
    trialStartedAt: new Date(),
    trialEndsAt: undefined,
    subscriptionStatus: SubscriptionStatus.TRIAL,
    planName: 'Free Trial',
    activatedAt: undefined,
    suspendedAt: undefined,
    createdAt: new Date(),
    updatedAt: faker.date.anytime(),
  };
}
export function fakeStaffProfile() {
  return {
    authUserId: faker.lorem.words(5),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    phone: undefined,
    updatedAt: faker.date.anytime(),
    lastLoginAt: undefined,
  };
}
export function fakeStaffProfileComplete() {
  return {
    id: faker.string.uuid(),
    authUserId: faker.lorem.words(5),
    businessId: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    phone: undefined,
    role: UserRole.CASHIER,
    status: StaffStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: faker.date.anytime(),
    lastLoginAt: undefined,
  };
}
export function fakeAuditLog() {
  return {
    userNameSnapshot: faker.lorem.words(5),
    roleSnapshot: faker.helpers.arrayElement([UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.WORKER, UserRole.UNKNOW] as const),
    action: faker.lorem.words(5),
    entityType: faker.lorem.words(5),
    entityId: undefined,
    referenceNumber: undefined,
    description: faker.lorem.words(5),
    metadata: undefined,
  };
}
export function fakeAuditLogComplete() {
  return {
    id: faker.string.uuid(),
    businessId: faker.string.uuid(),
    userId: undefined,
    userNameSnapshot: faker.lorem.words(5),
    roleSnapshot: faker.helpers.arrayElement([UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.WORKER, UserRole.UNKNOW] as const),
    action: faker.lorem.words(5),
    entityType: faker.lorem.words(5),
    entityId: undefined,
    referenceNumber: undefined,
    description: faker.lorem.words(5),
    metadata: undefined,
    createdAt: new Date(),
  };
}
