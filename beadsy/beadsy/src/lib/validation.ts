import { z } from "zod";
import { commerceConfig } from "./config";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use at most 72 characters");

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s-]{7,14}$/, "Enter a valid phone number");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(200),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

export const addressSchema = z.object({
  label: z.string().trim().max(40).optional().or(z.literal("")),
  fullName: z.string().trim().min(2, "Enter the recipient's name").max(80),
  phone: phoneSchema,
  line1: z.string().trim().min(3, "Enter the street address").max(120),
  line2: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Enter the city").max(60),
  state: z.string().trim().min(2, "Enter the state").max(60),
  postalCode: z.string().trim().regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit PIN code"),
  country: z.literal("IN").default("IN"),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const cartItemSchema = z.object({
  variantId: z.string().min(1).max(40),
  quantity: z.number().int().min(1).max(commerceConfig.maxQuantityPerLine),
});

export const deliverySchema = z.enum(["STANDARD", "EXPRESS"]);

export const cartValidateSchema = z.object({
  items: z.array(cartItemSchema).max(commerceConfig.maxCartLines),
  couponCode: z.string().trim().max(40).optional(),
  delivery: deliverySchema.default("STANDARD"),
  email: emailSchema.optional(),
});

export const checkoutCreateSchema = z.object({
  items: z.array(cartItemSchema).min(1, "Your cart is empty").max(commerceConfig.maxCartLines),
  couponCode: z.string().trim().max(40).optional(),
  delivery: deliverySchema,
  customer: z.object({ email: emailSchema, phone: phoneSchema }),
  address: addressSchema,
  provider: z.enum(["STRIPE", "RAZORPAY"]),
  notes: z.string().trim().max(500).optional(),
});

export const reviewSchema = z.object({
  productId: z.string().min(1).max(40),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(2, "Add a short title").max(100),
  body: z.string().trim().min(10, "Tell us a little more (10+ characters)").max(2000),
});

export const newsletterSchema = z.object({ email: emailSchema });

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.union([phoneSchema, z.literal("")]).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordSchema,
});

export const wishlistLookupSchema = z.object({
  ids: z.array(z.string().min(1).max(40)).max(100),
});

export const wishlistToggleSchema = z.object({ productId: z.string().min(1).max(40) });
