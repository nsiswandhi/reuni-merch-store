import Link from "next/link";
import Image from "next/image";
import { getActiveProducts, getDisplayPriceRange, sortProducts, parseProductSort } from "@/lib/products";
import { SortSelect } from "./sort-select";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

export default async function KatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;
  const sortOption = parseProductSort(sort);
  const products = sortProducts(await getActiveProducts(), sortOption);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-[Bebas_Neue] text-4xl text-[#124B23]">Merchandise Reuni Akbar InVnity 2026</h1>
        {products.length > 0 && <SortSelect current={sortOption} />}
      </div>
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
                  <p className="text-xs text-gray-500">
                    {product.vendor.brandName}
                    {!product.vendor.allowsPickup && (
                      <span className="ml-1 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">Hanya Dikirim</span>
                    )}
                  </p>
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
