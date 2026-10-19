import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppDataProvider } from "./contexts/AppDataContext";

export default function App() {
  return (
    <ThemeProvider>
      <AppDataProvider>
      <div className="app-canvas min-h-screen w-full flex items-center justify-center">
        <div
          className="app-frame relative w-full max-w-[430px] bg-background overflow-hidden shadow-2xl"
          style={{ height: "100dvh", maxHeight: "932px" }}
        >
          <RouterProvider router={router} />
        </div>
      </div>
      </AppDataProvider>
    </ThemeProvider>
  );
}
