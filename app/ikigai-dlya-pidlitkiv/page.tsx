import type { Metadata } from "next";
import Article from "@/components/article";
import { getArticle } from "@/lib/articles";
import { pageMeta } from "@/lib/site";

const article = getArticle("ikigai-dlya-pidlitkiv");
export const metadata: Metadata = pageMeta({ title: article.metaTitle, description: article.description, path: "/ikigai-dlya-pidlitkiv" });

export default function Page() {
  return <Article article={article} />;
}
