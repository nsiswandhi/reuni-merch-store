import { notFound } from "next/navigation";
import Image from "next/image";
import { getProductBySlug, getDisplayPriceRange } from "@/lib/products";
import { getProductAvailability } from "@/lib/availability";
import { getPreorderProgress } from "@/lib/preorder";
import { AddToCartForm } from "./add-to-cart-form";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product || !product.isActive) {
    notFound();
  }

  const { min, max } = getDisplayPriceRange(product);
  const priceDisplay = min === max ? formatRupiah(min) : `${formatRupiah(min)} – ${formatRupiah(max)}`;
  const availability = getProductAvailability(product);
  const preorderProgress = getPreorderProgress(product);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="relative mb-4 aspect-square w-full bg-gray-100">
        {product.imageUrl && <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />}
      </div>
      <p className="text-sm text-gray-500">
        {product.vendor.brandName}
        {!product.vendor.allowsPickup && (
          <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">Hanya Dikirim</span>
        )}
        {product.isPreorder && (
          <span className="ml-2 rounded bg-[#F3C21A] px-2 py-0.5 text-xs font-semibold text-[#124B23]">Preorder</span>
        )}
      </p>
      <h1 className="mb-2 font-[Bebas_Neue] text-3xl text-[#124B23]">{product.name}</h1>
      <p className="mb-4 text-gray-700">{product.description}</p>
      <p className="mb-1 text-xl font-semibold">{priceDisplay}</p>
      {product.availabilityMode === "LAST_ORDER_DATE" && product.lastOrderAt && availability.isAvailable && (
        <p className="mb-3 text-sm text-gray-500">
          Pemesanan hingga {product.lastOrderAt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      )}
      {product.availabilityMode === "STOCK" && availability.isAvailable && (
        <p className="mb-3 text-sm text-gray-500">Sisa stok: {availability.remainingStock}</p>
      )}
      <AddToCartForm
        productId={product.id}
        productSlug={product.slug}
        productName={product.name}
        vendorBrandName={product.vendor.brandName}
        vendorAllowsPickup={product.vendor.allowsPickup}
        basePrice={product.basePrice}
        variants={product.variants.map((v) => ({ id: v.id, label: v.label, price: v.price }))}
        available={availability.isAvailable}
        unavailableReason={availability.reasonLabel}
        maxQty={product.availabilityMode === "STOCK" ? availability.remainingStock : undefined}
        isPreorder={product.isPreorder}
        preorderProgress={preorderProgress}
      />
    </main>
  );
}
