import type {
  CatProduct,
  Json,
  PaymentMethod,
  PaymentStatus,
  ReturnStatus,
  StaffStatus,
  SubscriptionStatus,
  TaxMode,
  UserRole,
} from './domain';

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      Business: Table<{
        id: string; name: string; country: string; currency: string; taxMode: TaxMode;
        ownerUserId: string; trialStartedAt: string; trialEndsAt: string | null;
        subscriptionStatus: SubscriptionStatus; planName: string; activatedAt: string | null;
        suspendedAt: string | null; createdAt: string; updatedAt: string;
      }>;
      business_modules: Table<{
        id: string; business_id: string; module_key: string; enabled: boolean;
        created_at: string; updated_at: string;
      }, {
        id?: string; business_id: string; module_key: string; enabled?: boolean;
        created_at?: string; updated_at?: string;
      }>;
      StaffProfile: Table<{
        id: string; authUserId: string; userId: string; businessId: string; name: string;
        email: string; phone: string | null; role: UserRole; status: StaffStatus;
        createdAt: string; updatedAt: string; lastLoginAt: string | null;
      }>;
      ProductStock: Table<{
        id: string; businessId: string; name: string; imageProduct: string | null;
        price: number; stock: number; cat: CatProduct;
      }>;
      Product: Table<{ id: string; productId: string; sellprice: number }>;
      Transaction: Table<{
        id: string; businessId: string; billNumber: string | null; customerName: string | null;
        customerPhone: string | null; customerEmail: string | null; customerAddress: string | null;
        customerTaxId: string | null; customerId: string | null; subtotal: number; discount: number;
        taxAmount: number; totalAmount: number | null; amountReceived: number; changeAmount: number;
        paymentMethod: PaymentMethod | null; paymentStatus: PaymentStatus; createdAt: string;
        completedAt: string | null; isComplete: boolean; returnStatus: ReturnStatus | null;
        refundedAmount: number;
      }>;
      OnSaleProduct: Table<{
        id: string; productId: string | null; quantity: number; saledate: string; transactionId: string;
        productName: string; unitPrice: number; costPrice: number; taxRate: number;
        lineSubtotal: number; taxAmount: number; lineTotal: number;
      }>;
      Customer: Table<{
        id: string; businessId: string; name: string; phone: string; email: string | null;
        address: string | null; taxId: string | null; country: string | null; notes: string | null;
        isActive: boolean; createdAt: string; updatedAt: string;
      }>;
      InventoryMovement: Table<{
        id: string; businessId: string; productId: string | null; productNameSnapshot: string;
        movementType: 'SALE' | 'RESTOCK' | 'RETURN' | 'ADJUSTMENT'; quantityChange: number;
        previousStock: number; newStock: number; referenceType: string | null;
        referenceId: string | null; referenceBillNumber: string | null; reason: string | null;
        createdAt: string;
      }>;
      SaleReturn: Table<{
        id: string; businessId: string; originalTransactionId: string; originalBillNumber: string;
        refundAmount: number; refundMethod: PaymentMethod; reason: string; status: ReturnStatus;
        createdAt: string;
      }>;
      ReturnItem: Table<{
        id: string; saleReturnId: string; onSaleProductId: string; productId: string | null;
        productName: string; quantity: number; unitRefund: number; refundAmount: number;
      }>;
      ShopData: Table<{
        id: string; businessId: string; tax: number | null; name: string | null; country: string;
        currency: string; taxMode: TaxMode; phone: string | null; address: string | null;
        taxId: string | null; receiptFooter: string | null; billPrefix: string; billPadding: number;
        showBusinessLogo: boolean; showTaxId: boolean; showCustomerDetails: boolean;
        showItemTax: boolean; showFooter: boolean; receiptSize: string;
      }>;
      BillSequence: Table<{ id: string; businessId: string; nextNumber: number }>;
      AuditLog: Table<{
        id: string; businessId: string; userId: string | null; userNameSnapshot: string;
        roleSnapshot: UserRole; action: string; entityType: string; entityId: string | null;
        referenceNumber: string | null; description: string; metadata: Json | null; createdAt: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: Json }>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
