import type { Metadata } from "next";
import Article from "@/components/article";
import { getArticle } from "@/lib/articles";
import { pageMeta } from "@/lib/site";

const article = getArticle("pytannya-dlya-rozmovy");
export const metadata: Metadata = pageMeta({ title: article.metaTitle, description: article.description, path: "/pytannya-dlya-rozmovy" });

export default function Page() {
  return <Article article={article} />;
}
