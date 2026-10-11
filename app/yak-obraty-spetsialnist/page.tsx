import type { Metadata } from "next";
import Article from "@/components/article";
import { getArticle } from "@/lib/articles";
import { pageMeta } from "@/lib/site";

const article = getArticle("yak-obraty-spetsialnist");
export const metadata: Metadata = pageMeta({ title: article.metaTitle, description: article.description, path: "/yak-obraty-spetsialnist" });

export default function Page() {
  return <Article article={article} />;
}
