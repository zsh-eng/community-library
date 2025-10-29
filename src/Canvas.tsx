import { BookColumnsContainer } from "@/components/BookColumnsContainer";
import { LibraryGrid } from "@/components/LibraryGrid";
import type { Book } from "@/types";
import { Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useLoaderData } from "react-router";

function Canvas() {
  const [showLibrary, setShowLibrary] = useState(false);
  const { books } = useLoaderData<{ books: Book[] }>();

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Search Bar */}
        <div className="absolute top-4 lg:top-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
          <button
            onClick={() => setShowLibrary(true)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-background/80 backdrop-blur-sm border border-border rounded-full shadow-lg hover:shadow-xl hover:scale-[101%] transition-all cursor-pointer group"
          >
            <Search className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
            <span className="text-base text-muted-foreground group-hover:text-foreground transition-colors">
              Search for books...
            </span>
          </button>
        </div>

        {/* Horizontal scrolling container */}
        {<BookColumnsContainer books={books} />}
      </motion.div>

      {/* Library Overlay */}
      <AnimatePresence>
        {showLibrary && books && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-0 md:p-8 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowLibrary(false)}
          >
            <motion.div
              className="md:rounded-3xl shadow-2xl overflow-hidden max-w-4xl w-full h-full lg:h-[85vh]"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <LibraryGrid books={books} setShowLibrary={setShowLibrary} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Canvas;
