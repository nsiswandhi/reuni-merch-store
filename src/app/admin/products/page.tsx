import { prisma } from "@/lib/prisma";
import { NewProductForm, NewVariantForm } from "./product-form";
import { deleteProduct, deleteVariant } from "./actions";

export default async function AdminProductsPage() {
  const [products, vendors] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: { vendor: true, variants: { where: { isActive: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.vendor.findMany({ orderBy: { brandName: "asc" } }),
  ]);

  return (
    <main>
      <h1 className="mb-6 font-[Bebas_Neue] text-3xl text-[#124B23]">Kelola Produk</h1>
      <NewProductForm vendors={vendors} />
      <div className="flex flex-col gap-4">
        {products.map((product) => (
          <div key={product.id} className="rounded border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{product.name}</p>
                <p className="text-sm text-gray-500">{product.vendor.brandName}</p>
              </div>
              <form action={deleteProduct.bind(null, product.id)}>
                <button type="submit" className="text-sm text-red-600 underline">Nonaktifkan</button>
              </form>
            </div>
            <ul className="mt-2 text-sm">
              {product.variants.map((v) => (
                <li key={v.id} className="flex items-center justify-between border-b py-1">
                  <span>{v.label} — Rp{v.price.toLocaleString("id-ID")}</span>
                  <form action={deleteVariant.bind(null, v.id)}>
                    <button type="submit" className="text-xs text-red-600 underline">Hapus</button>
                  </form>
                </li>
              ))}
            </ul>
            <NewVariantForm productId={product.id} />
          </div>
        ))}
      </div>
    </main>
  );
}
