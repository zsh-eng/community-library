import { BookColumnsContainer } from "@/components/BookColumnsContainer";
import { LibraryGrid } from "@/components/LibraryGrid";
import type { Book } from "@/types";
import { Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useLoaderData } from "react-router";
import { useIsMobile } from "./hooks/use-mobile";

function Logo() {
  return (
    <div className="absolute hidden sm:block sm:bottom-4 sm:right-4 lg:right-5 lg:bottom-4 z-20 bg-muted/90 dark:bg-muted/70 rounded-sm pt-1 pb-0.5 px-3 cursor-pointer">
      <p className="uppercase font-logo group transition-colors text-2xl">
        <span className="text-blue-900/80 group-hover:text-blue-700 dark:text-blue-300/80 dark:group-hover:text-blue-300 transition-colors">
          NUSC
        </span>
        <span className="text-foreground/80 group-hover:text-foreground transition-colors">
          ommonShelves
        </span>
      </p>
    </div>
  );
}

function Canvas() {
  const [showLibrary, setShowLibrary] = useState(false);
  const isMobile = useIsMobile();
  const { books } = useLoaderData<{ books: Book[] }>();

  return (
    <>
      <Logo />
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
            className="w-full flex items-center gap-3 px-4 py-3 bg-background/80 backdrop-blur-sm border border-border rounded-full shadow-lg hover:shadow-xl sm:hover:scale-[102%] transition-all cursor-pointer group"
          >
            <Search className="h-5 w-5 text-foreground flex-shrink-0" />
            <span className="text-base text-muted-foreground">
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
              // No scaling on mobile - it looks sluggish due to performance issues
              initial={{ scale: isMobile ? 1 : 0.95 }}
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
