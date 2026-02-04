import { useAllBooks } from "@/hooks/use-all-books";
import type { Book } from "@/types";
import { useMemo, useState } from "react";

type SortOption = "title" | "author" | "recent";
type SortDirection = "asc" | "desc";

type BooksListViewProps = {
  onSelectBook: (bookId: number) => void;
};

export function BooksListView({ onSelectBook }: BooksListViewProps) {
  const { data: books = [], isLoading } = useAllBooks();
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("title");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  function handleSortClick(option: SortOption) {
    if (sortBy === option) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(option);
      setSortDirection(option === "recent" ? "desc" : "asc");
    }
  }

  const filteredAndSortedBooks = useMemo(() => {
    let result = books;

    // Filter
    if (filter.trim()) {
      const searchTerm = filter.toLowerCase();
      result = result.filter(
        (book) =>
          book.title.toLowerCase().includes(searchTerm) ||
          book.author.toLowerCase().includes(searchTerm) ||
          book.isbn.toLowerCase().includes(searchTerm)
      );
    }

    // Sort
    const sorted = [...result].sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);
        case "author":
          return a.author.localeCompare(b.author);
        case "recent":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        default:
          return 0;
      }
    });

    return sortDirection === "desc" ? sorted.reverse() : sorted;
  }, [books, filter, sortBy, sortDirection]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--tg-theme-bg-color,#fff)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--tg-theme-button-color,#5288c1)] border-t-transparent" />
          <p className="text-[var(--tg-theme-hint-color,#999)]">
            Loading books...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--tg-theme-bg-color,#fff)]">
      {/* Sticky header with search and sort */}
      <div className="sticky top-0 z-10 flex flex-col gap-3 bg-[var(--tg-theme-bg-color,#fff)] px-4 pt-4 pb-3">
        {/* Search input */}
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--tg-theme-hint-color, #999)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search by title, author, or ISBN..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-xl bg-[var(--tg-theme-section-bg-color,#f4f4f5)] py-3 pl-10 pr-4 text-sm text-[var(--tg-theme-text-color,#000)] placeholder-[var(--tg-theme-hint-color,#999)] outline-none"
          />
        </div>

        {/* Sort options */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--tg-theme-hint-color,#999)]">
            Sort:
          </span>
          <div className="flex gap-1.5">
            <SortButton
              label="Title"
              active={sortBy === "title"}
              direction={sortBy === "title" ? sortDirection : null}
              onClick={() => handleSortClick("title")}
            />
            <SortButton
              label="Author"
              active={sortBy === "author"}
              direction={sortBy === "author" ? sortDirection : null}
              onClick={() => handleSortClick("author")}
            />
            <SortButton
              label="Recent"
              active={sortBy === "recent"}
              direction={sortBy === "recent" ? sortDirection : null}
              onClick={() => handleSortClick("recent")}
            />
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex flex-col gap-3 px-4 pb-4">
        {/* Book count */}
        <p className="pl-1 text-xs text-[var(--tg-theme-hint-color,#999)]">
          {filteredAndSortedBooks.length}{" "}
          {filteredAndSortedBooks.length === 1 ? "book" : "books"}
          {filter && ` matching "${filter}"`}
        </p>

        {/* Books list */}
        {filteredAndSortedBooks.length === 0 ? (
          <div className="overflow-hidden rounded-2xl bg-[var(--tg-theme-section-bg-color,#f4f4f5)]">
            <p className="py-8 text-center text-sm text-[var(--tg-theme-hint-color,#999)]">
              {filter ? "No books match your search." : "No books in library."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col overflow-hidden rounded-2xl bg-[var(--tg-theme-section-bg-color,#f4f4f5)]">
            {filteredAndSortedBooks.map((book, index) => (
              <BookRow
                key={book.id}
                book={book}
                index={index}
                onSelect={() => onSelectBook(book.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: SortDirection | null;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-[var(--tg-theme-button-color,#5288c1)] text-[var(--tg-theme-button-text-color,#fff)]"
          : "bg-[var(--tg-theme-section-bg-color,#f4f4f5)] text-[var(--tg-theme-hint-color,#999)]"
      }`}
    >
      {label}
      {direction && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={direction === "desc" ? "rotate-180" : ""}
        >
          <path d="m18 15-6-6-6 6" />
        </svg>
      )}
    </button>
  );
}

function BookRow({
  book,
  index,
  onSelect,
}: {
  book: Book;
  index: number;
  onSelect: () => void;
}) {
  return (
    <>
      {index > 0 && <div className="mx-4 h-px bg-tg-separator" />}
      <button
        onClick={onSelect}
        className="flex w-full items-center gap-3 p-3 text-left transition-opacity active:opacity-70"
      >
        {book.imageUrl ? (
          <img
            src={book.imageUrl}
            alt={book.title}
            className="h-16 w-11 flex-shrink-0 rounded-md bg-[var(--tg-theme-bg-color,#fff)] object-cover"
          />
        ) : (
          <div className="flex h-16 w-11 flex-shrink-0 items-center justify-center rounded-md bg-[var(--tg-theme-bg-color,#fff)]">
            <span className="text-xl">📚</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-[var(--tg-theme-text-color,#000)]">
            {book.title}
          </p>
          <p className="truncate text-sm text-[var(--tg-theme-hint-color,#999)]">
            {book.author}
          </p>
          <p className="mt-0.5 font-mono text-xs text-[var(--tg-theme-subtitle-text-color,#6d6d71)]">
            {book.isbn}
          </p>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--tg-theme-hint-color, #999)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </>
  );
}
