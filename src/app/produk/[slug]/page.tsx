import { notFound } from "next/navigation";
import Image from "next/image";
import { getProductBySlug } from "@/lib/products";
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

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="relative mb-4 aspect-square w-full bg-gray-100">
        {product.imageUrl && <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />}
      </div>
      <p className="text-sm text-gray-500">{product.vendor.brandName}</p>
      <h1 className="mb-2 font-[Bebas_Neue] text-3xl text-[#124B23]">{product.name}</h1>
      <p className="mb-4 text-gray-700">{product.description}</p>
      <p className="mb-4 text-xl font-semibold">
        {product.variants.length === 0 ? formatRupiah(product.basePrice) : ""}
      </p>
      <AddToCartForm
        productId={product.id}
        productSlug={product.slug}
        productName={product.name}
        vendorBrandName={product.vendor.brandName}
        basePrice={product.basePrice}
        variants={product.variants.map((v) => ({ id: v.id, label: v.label, price: v.price }))}
      />
    </main>
  );
}
