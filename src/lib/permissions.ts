export enum Permission {
  // User Management
  VIEW_USERS = "view_users",
  CREATE_USER = "create_user",
  UPDATE_USER = "update_user",
  DELETE_USER = "delete_user",

  // Customer Management
  VIEW_CUSTOMERS = "view_customers",
  CREATE_CUSTOMER = "create_customer",
  UPDATE_CUSTOMER = "update_customer",
  DELETE_CUSTOMER = "delete_customer",

  // Payment Management
  VIEW_PAYMENTS = "view_payments",
  CREATE_PAYMENT = "create_payment",
  UPDATE_PAYMENT = "update_payment",
  DELETE_PAYMENT = "delete_payment",
  GENERATE_VOUCHER = "generate_voucher",

  // Design Orders
  VIEW_DESIGN_ORDERS = "view_design_orders",
  CREATE_DESIGN_ORDER = "create_design_order",
  UPDATE_DESIGN_ORDER = "update_design_order",
  DELETE_DESIGN_ORDER = "delete_design_order",

  // Dashboard
  VIEW_DASHBOARD = "view_dashboard",
  VIEW_REPORTS = "view_reports",
}

export const rolePermissions: Record<string, Permission[]> = {
  ADMIN: [
    // All permissions
    Permission.VIEW_USERS,
    Permission.CREATE_USER,
    Permission.UPDATE_USER,
    Permission.DELETE_USER,
    Permission.VIEW_CUSTOMERS,
    Permission.CREATE_CUSTOMER,
    Permission.UPDATE_CUSTOMER,
    Permission.DELETE_CUSTOMER,
    Permission.VIEW_PAYMENTS,
    Permission.CREATE_PAYMENT,
    Permission.UPDATE_PAYMENT,
    Permission.DELETE_PAYMENT,
    Permission.GENERATE_VOUCHER,
    Permission.VIEW_DESIGN_ORDERS,
    Permission.CREATE_DESIGN_ORDER,
    Permission.UPDATE_DESIGN_ORDER,
    Permission.DELETE_DESIGN_ORDER,
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_REPORTS,
  ],
  MANAGER: [
    Permission.VIEW_USERS,
    Permission.VIEW_CUSTOMERS,
    Permission.CREATE_CUSTOMER,
    Permission.UPDATE_CUSTOMER,
    Permission.VIEW_PAYMENTS,
    Permission.CREATE_PAYMENT,
    Permission.UPDATE_PAYMENT,
    Permission.GENERATE_VOUCHER,
    Permission.VIEW_DESIGN_ORDERS,
    Permission.CREATE_DESIGN_ORDER,
    Permission.UPDATE_DESIGN_ORDER,
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_REPORTS,
  ],
  OPERATOR: [
    Permission.VIEW_CUSTOMERS,
    Permission.CREATE_CUSTOMER,
    Permission.UPDATE_CUSTOMER,
    Permission.VIEW_PAYMENTS,
    Permission.CREATE_PAYMENT,
    Permission.GENERATE_VOUCHER,
    Permission.VIEW_DESIGN_ORDERS,
    Permission.CREATE_DESIGN_ORDER,
    Permission.UPDATE_DESIGN_ORDER,
    Permission.VIEW_DASHBOARD,
  ],
  VIEWER: [
    Permission.VIEW_CUSTOMERS,
    Permission.VIEW_PAYMENTS,
    Permission.VIEW_DESIGN_ORDERS,
    Permission.VIEW_DASHBOARD,
  ],
};

export function hasPermission(role: string, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(
  role: string,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}
