/**
 * Phone number utility functions for smart searching
 */

/**
 * Normalize a phone number by removing all non-digit characters
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Format a phone number with a dash after the 4th digit (Pakistani format)
 * e.g., "03001234567" -> "0300-1234567"
 */
export function formatPhoneWithDash(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length >= 4) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return digits;
}

/**
 * Generate all possible phone number formats for searching
 * This creates variations with and without dashes
 */
export function getPhoneSearchVariants(phone: string): string[] {
  if (!phone) return [];

  const variants: string[] = [];
  const original = phone.trim();
  const digitsOnly = normalizePhone(phone);

  // Add original input
  variants.push(original);

  // Add digits-only version
  if (digitsOnly !== original) {
    variants.push(digitsOnly);
  }

  // Add formatted version with dash
  const withDash = formatPhoneWithDash(phone);
  if (withDash !== original && withDash !== digitsOnly) {
    variants.push(withDash);
  }

  return variants;
}

/**
 * Create a Prisma OR condition for phone search that handles all formats
 */
export function createPhoneSearchCondition(phone: string): object[] {
  const variants = getPhoneSearchVariants(phone);
  return variants.map((variant) => ({
    phone: { contains: variant, mode: "insensitive" as const },
  }));
}
