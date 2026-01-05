import "@/styles/globals.css";
import "reactflow/dist/style.css";
import { DM_Sans } from "next/font/google";


export const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
});


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`h-screen w-screen overflow-hidden ${dmSans.className}`}>
        {children}
      </body>
    </html>
  );
}
