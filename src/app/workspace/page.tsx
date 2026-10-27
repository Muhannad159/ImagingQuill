import { Suspense } from "react";
import Workspace from "@/features/workspace/workspace";
export const metadata = {
  title: "Workspace",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <Suspense fallback={<div className="loading">Opening your workspace…</div>}>
      <Workspace />
    </Suspense>
  );
}
