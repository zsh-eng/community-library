import Canvas from "@/Canvas";
import BookWrapper from "@/components/BookWrapper";
import { ThemeProvider } from "@/components/theme-provider";
import { DataCacheProvider } from "@/contexts/DataCacheContext";
import { createBrowserRouter, RouterProvider } from "react-router";

const router = createBrowserRouter([
  {
    path: "/",
    Component: Canvas,
  },
  {
    path: "/book/:slug",
    Component: BookWrapper,
  },
]);

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <DataCacheProvider>
        <RouterProvider router={router} />
      </DataCacheProvider>
    </ThemeProvider>
  );
}

export default App;
