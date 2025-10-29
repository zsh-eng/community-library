import { ArrowLeft } from "lucide-react";
import { Link, useLoaderData } from "react-router";
import { BookDetails } from "./components/BookDetails";
import type { BookDetail } from "./types";

function Book() {
  const { book } = useLoaderData<{ book: BookDetail }>();
  return (
    <div className="container mx-auto px-4 py-16">
      <Link
        to="/"
        className="text-muted-foreground hover:text-primary transition duration-300 hover:scale-105 group absolute top-8 left-8"
      >
        <ArrowLeft className="group-hover:-translate-x-1 transition" />
      </Link>

      <BookDetails book={book} />
    </div>
  );
}

export default Book;
