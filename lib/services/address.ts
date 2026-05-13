import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { addresses, type Address as AddressRow } from "@/lib/db/schema";
import type { Address, AddressResponse } from "@/lib/contracts/address";
import { AppError, ErrorCode } from "@/lib/http/errors";

function rowToResponse(row: AddressRow): AddressResponse {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    line1: row.line1,
    country: row.country,
    state: row.state,
    zip: row.zip,
    phoneCountryCode: row.phoneCountryCode,
    phone: row.phone,
    phoneSign: row.phoneSign === "-" ? "-" : "+",
    isDefaultBilling: row.isDefaultBilling,
    isDefaultShipping: row.isDefaultShipping,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createAddress(
  userId: string,
  input: Address,
): Promise<AddressResponse> {
  const [row] = await db
    .insert(addresses)
    .values({ userId, ...input })
    .returning();
  return rowToResponse(row);
}

export async function listAddresses(userId: string): Promise<AddressResponse[]> {
  const rows = await db.query.addresses.findMany({
    where: and(eq(addresses.userId, userId), isNull(addresses.deletedAt)),
    orderBy: [desc(addresses.createdAt)],
    limit: 100,
  });
  return rows.map(rowToResponse);
}

export async function softDeleteAddress(
  userId: string,
  id: string,
): Promise<void> {
  const found = await db.query.addresses.findFirst({
    where: and(
      eq(addresses.id, id),
      eq(addresses.userId, userId),
      isNull(addresses.deletedAt),
    ),
  });
  if (!found) throw new AppError(ErrorCode.NOT_FOUND, "Address not found", 404);
  await db
    .update(addresses)
    .set({ deletedAt: new Date() })
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
}
