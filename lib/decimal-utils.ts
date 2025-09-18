// lib/decimal-utils.ts - Utilities for handling Prisma Decimal types
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Safely converts a Prisma Decimal or any numeric value to a JavaScript number
 * @param value - The value to convert (Decimal, number, string, or any)
 * @returns A valid number, defaulting to 0 if conversion fails
 */
export function safeDecimalToNumber(value: any): number {
  if (!value && value !== 0) return 0
  
  // If it's already a number
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value
  }
  
  // If it's a Prisma Decimal object
  if (value && typeof value === 'object') {
    if (typeof value.toNumber === 'function') {
      const num = value.toNumber()
      return isNaN(num) ? 0 : num
    }
    if (typeof value.toString === 'function') {
      const num = parseFloat(value.toString())
      return isNaN(num) ? 0 : num
    }
  }
  
  // If it's a string
  if (typeof value === 'string') {
    const num = parseFloat(value)
    return isNaN(num) ? 0 : num
  }
  
  // Fallback
  console.warn('Could not convert value to number:', value)
  return 0
}

/**
 * Safely formats a Prisma Decimal as currency
 * @param value - The value to format
 * @param locale - The locale for formatting (default: 'fr-FR')
 * @returns Formatted currency string
 */
export function safeFormatCurrency(
  value: any, 
  locale: string = 'fr-FR' // Fixed: Remove unused currency parameter
): string {
  const numericValue = safeDecimalToNumber(value)
  
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue)
  } catch (error) {
    console.error('Error formatting currency:', error)
    return numericValue.toFixed(2)
  }
}

/**
 * Converts a JavaScript number to a Prisma Decimal
 * @param value - The number to convert
 * @returns A Prisma Decimal instance
 */
export function numberToDecimal(value: number): Decimal {
  if (isNaN(value)) {
    console.warn('Converting NaN to Decimal, using 0 instead')
    return new Decimal(0)
  }
  return new Decimal(value)
}

/**
 * Safely adds multiple Decimal values
 * @param values - Array of values to add
 * @returns The sum as a number
 */
export function safeDecimalSum(values: any[]): number {
  return values.reduce((sum, value) => {
    return sum + safeDecimalToNumber(value)
  }, 0)
}

/**
 * Validates if a value can be safely converted to a Decimal
 * @param value - The value to validate
 * @returns True if the value is valid for Decimal conversion
 */
export function isValidDecimal(value: any): boolean {
  const num = safeDecimalToNumber(value)
  return !isNaN(num) && isFinite(num)
}