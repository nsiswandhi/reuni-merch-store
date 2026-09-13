import Link from "next/link";
import Image from "next/image";
import { getActiveProducts, getDisplayPriceRange } from "@/lib/products";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

export default async function KatalogPage() {
  const products = await getActiveProducts();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 font-[Bebas_Neue] text-4xl text-[#124B23]">Merchandise Reuni Akbar InVnity 2026</h1>
      {products.length === 0 ? (
        <p className="text-gray-500">Belum ada produk tersedia.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {products.map((product) => {
            const { min, max } = getDisplayPriceRange(product);
            return (
              <Link
                key={product.id}
                href={`/produk/${product.slug}`}
                className="flex flex-col overflow-hidden rounded-lg border border-gray-200 hover:shadow-md"
              >
                <div className="relative aspect-square w-full bg-gray-100">
                  {product.imageUrl && (
                    <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs text-gray-500">{product.vendor.brandName}</p>
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-sm text-[#124B23]">
                    {min === max ? formatRupiah(min) : `Mulai dari ${formatRupiah(min)}`}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
