import { z } from "zod";
import { PhoneCountryCode, PhoneDigits, UUID } from "@/lib/contracts/common";

export const AddressSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  line1: z.string().min(1).max(50),
  country: z.string().min(1).max(80),
  state: z.string().min(1).max(80),
  zip: z.string().min(1).max(20),
  phoneCountryCode: PhoneCountryCode,
  phone: PhoneDigits,
  phoneSign: z.enum(["+", "-"]).default("+"),
});

export const AddressResponseSchema = AddressSchema.extend({
  id: UUID,
  isDefaultBilling: z.boolean(),
  isDefaultShipping: z.boolean(),
  createdAt: z.string().datetime(),
});

export const AddressListResponseSchema = z.array(AddressResponseSchema);

export const DeleteAddressResponseSchema = z.object({ deleted: z.literal(true) });

export type Address = z.infer<typeof AddressSchema>;
export type AddressResponse = z.infer<typeof AddressResponseSchema>;
export type AddressListResponse = z.infer<typeof AddressListResponseSchema>;
