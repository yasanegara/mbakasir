import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import StorefrontClient from "@/app/store/[slug]/StorefrontClient";

export async function generateMetadata({ params }: { params: Promise<any> }): Promise<Metadata> {
  const { domain } = await params;
  const store = await prisma.storefrontConfig.findFirst({
    where: { customDomain: domain, isActive: true },
    select: { tenant: { select: { name: true } }, description: true },
  });

  if (!store) return { title: "Toko Tidak Ditemukan" };

  return {
    title: `${store.tenant.name} — Toko Online`,
    description: store.description || `Belanja di ${store.tenant.name}`,
  };
}

export default async function CustomDomainPage({ params }: { params: Promise<any> }) {
  const { domain } = await params;
  return <StorefrontClient domain={domain} />;
}
