import { useDataCache } from "@/hooks/use-data-cache";
import { hc } from "hono/client";
import { useState } from "react";
import type { AppType } from "../worker/index";
import { LibraryGrid } from "./components/LibraryGrid";
import { Search } from "lucide-react";

const client = hc<AppType>(import.meta.env.BASE_URL);

interface Book {
  id: number;
  isbn: string;
  title: string;
  author: string;
  imageUrl: string | null;
  createdAt: string;
}

function Library() {
  const {
    data: books,
    loading,
    error,
  } = useDataCache<Book[]>("books", async () => {
    const res = await client.api.books.$get();
    if (!res.ok) {
      throw new Error("Failed to fetch books");
    }
    const data = await res.json();
    return data.books;
  });

  const [searchQuery, setSearchQuery] = useState("");

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Search Bar at Top */}
      <div className="sticky top-4 z-10 py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title or author"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-full outline-none text-base focus:ring-1 focus:ring-ring focus:border-transparent transition-all shadow-sm focus:shadow-md"
          />
        </div>
      </div>

      <LibraryGrid
        books={books || []}
        loading={loading}
        searchQuery={searchQuery}
      />
    </div>
  );
}

export default Library;
