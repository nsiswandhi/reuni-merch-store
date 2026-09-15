import Link from "next/link";
import Image from "next/image";
import { getActiveProducts, getDisplayPriceRange, sortProducts, parseProductSort } from "@/lib/products";
import { SortSelect } from "./sort-select";
import { VendorFilterSelect } from "./vendor-filter-select";
import { OwnerInfo } from "@/components/owner-info";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

export default async function KatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; vendor?: string }>;
}) {
  const { sort, vendor } = await searchParams;
  const sortOption = parseProductSort(sort);
  const allProducts = await getActiveProducts();

  // Distinct vendors that actually have an active product, alphabetized —
  // built from the products themselves rather than a separate query so the
  // filter never offers a vendor with nothing to show.
  const vendors = [...new Map(allProducts.map((p) => [p.vendor.id, { id: p.vendor.id, brandName: p.vendor.brandName }])).values()].sort(
    (a, b) => a.brandName.localeCompare(b.brandName, "id")
  );
  const vendorFiltered = vendor ? allProducts.filter((p) => p.vendor.id === vendor) : allProducts;
  const products = sortProducts(vendorFiltered, sortOption);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-[Bebas_Neue] text-4xl text-[#124B23]">Merchandise Reuni Akbar InVnity 2026</h1>
        {allProducts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <VendorFilterSelect vendors={vendors} current={vendor ?? ""} />
            <SortSelect current={sortOption} />
          </div>
        )}
      </div>
      {products.length === 0 ? (
        <p className="text-gray-500">{vendor ? "Belum ada produk dari vendor ini." : "Belum ada produk tersedia."}</p>
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
                    {product.isPreorder && (
                      <span className="ml-1 rounded bg-[#F3C21A] px-1.5 py-0.5 text-[10px] font-semibold text-[#124B23]">Preorder</span>
                    )}
                  </p>
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-sm text-[#124B23]">
                    {min === max ? formatRupiah(min) : `Mulai dari ${formatRupiah(min)}`}
                  </p>
                  <OwnerInfo
                    ownerName={product.vendor.ownerName}
                    angkatan={product.vendor.angkatan}
                    className="mt-1 text-[10px]"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
