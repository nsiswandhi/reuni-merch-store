import { z } from "zod";

export const checkoutFormSchema = z.object({
  buyerName: z.string().min(1, "Nama wajib diisi"),
  buyerAngkatan: z.string().min(1, "Angkatan wajib diisi"),
  buyerEmail: z.string().email("Email tidak valid"),
  buyerWhatsapp: z.string().min(8, "No. WhatsApp tidak valid"),
  deliveryMethod: z.enum(["PICKUP", "SHIPPING"]),
  shippingAddress: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().nullable(),
        // Upper bound guards against an absurd/abusive quantity being
        // submitted directly to the server action (bypassing any UI limit) —
        // no real merch order needs more than 100 of one line item.
        qty: z.number().int().positive().max(100, "Jumlah maksimal 100 per item"),
      })
    )
    .min(1, "Keranjang tidak boleh kosong"),
}).refine(
  (data) => data.deliveryMethod !== "SHIPPING" || (data.shippingAddress && data.shippingAddress.trim().length > 0),
  { message: "Alamat wajib diisi untuk pengiriman", path: ["shippingAddress"] }
);

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;
