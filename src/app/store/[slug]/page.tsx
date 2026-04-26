import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import StorefrontClient from "./StorefrontClient";

export async function generateMetadata({ params }: { params: Promise<any> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await prisma.storefrontConfig.findFirst({
    where: { slug, isActive: true },
    select: { tenant: { select: { name: true } }, description: true },
  });

  if (!store) return { title: "Toko Tidak Ditemukan" };

  return {
    title: `${store.tenant.name} — Toko Online`,
    description: store.description || `Belanja di ${store.tenant.name}`,
  };
}

export default async function StorefrontPage({ params }: { params: Promise<any> }) {
  const { slug } = await params;
  return <StorefrontClient slug={slug} />;
}
