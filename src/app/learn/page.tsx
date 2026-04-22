import type { Metadata, ResolvingMetadata } from "next";
import { prisma } from "@/lib/prisma";
import { getBrandConfig } from "@/lib/brand-config";
import LearnClient from "./LearnClient";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
  { searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const slug = resolvedSearchParams?.s;
  
  if (!slug || typeof slug !== "string") {
    return { title: "Pusat Belajar" }; // fallback
  }

  const doc = await prisma.learnDocument.findUnique({
    where: { slug },
  });

  if (!doc || !doc.isPublic) {
    return { title: "Artikel Tidak Ditemukan" };
  }

  // Extract first image from markdown to use as thumbnail
  const imageMatch = doc.content.match(/!\[.*?\]\((.*?)\)/);
  const firstImage = imageMatch ? imageMatch[1] : null;

  const brand = await getBrandConfig();
  const title = `${doc.emoji || "📄"} ${doc.title} | ${brand.appName}`;
  const description = doc.excerpt || `Panduan MbaKasir tentang ${doc.title}. Baca selengkapnya untuk mempelajari lebih lanjut.`;
  
  const images = firstImage ? [firstImage] : (brand.logoUrl ? [brand.logoUrl] : []);

  return {
    title: doc.title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: images,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: title,
      description: description,
      images: images,
    }
  };
}

export default function LearnPage() {
  return <LearnClient />;
}
