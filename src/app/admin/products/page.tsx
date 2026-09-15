import { prisma } from "@/lib/prisma";
import { NewProductForm, ProductCard, ReactivateProductForm } from "./product-form";

export default async function AdminProductsPage() {
  const [allProducts, vendors] = await Promise.all([
    prisma.product.findMany({
      include: { vendor: true, variants: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.vendor.findMany({ orderBy: { brandName: "asc" } }),
  ]);

  const activeProducts = allProducts.filter((p) => p.isActive);
  const inactiveProducts = allProducts.filter((p) => !p.isActive);
  const vendorOptions = vendors.map((v) => ({ id: v.id, brandName: v.brandName }));

  return (
    <main>
      <h1 className="mb-6 font-[Bebas_Neue] text-3xl text-[#124B23]">Kelola Produk</h1>
      <NewProductForm vendors={vendorOptions} />
      <div className="flex flex-col gap-4">
        {activeProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={{
              id: product.id,
              vendorId: product.vendorId,
              name: product.name,
              description: product.description,
              basePrice: product.basePrice,
              availabilityMode: product.availabilityMode,
              lastOrderAt: product.lastOrderAt ? product.lastOrderAt.toISOString().slice(0, 10) : null,
              stock: product.stock,
              isPreorder: product.isPreorder,
              preorderMinQty: product.preorderMinQty,
              preorderReservedQty: product.preorderReservedQty,
              preorderNote: product.preorderNote,
            }}
            vendorName={product.vendor.brandName}
            vendors={vendorOptions}
            activeVariants={product.variants.filter((v) => v.isActive)}
            inactiveVariants={product.variants.filter((v) => !v.isActive)}
          />
        ))}
      </div>

      {inactiveProducts.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 font-semibold text-gray-600">Produk Nonaktif</h2>
          <div className="flex flex-col gap-3">
            {inactiveProducts.map((product) => (
              <div key={product.id} className="rounded border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-500">{product.name}</p>
                    <p className="text-sm text-gray-400">{product.vendor.brandName}</p>
                  </div>
                  <ReactivateProductForm productId={product.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
