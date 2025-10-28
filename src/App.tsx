import Canvas from "@/Canvas";
import BookWrapper from "@/components/BookWrapper";
import { ThemeProvider } from "@/components/theme-provider";
import { DataCacheProvider } from "@/contexts/DataCacheContext";
import { BrowserRouter, Route, Routes } from "react-router";

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <DataCacheProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Canvas />} />
            <Route path="/book/:slug" element={<BookWrapper />} />
          </Routes>
        </BrowserRouter>
      </DataCacheProvider>
    </ThemeProvider>
  );
}

export default App;
