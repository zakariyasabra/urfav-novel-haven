import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/author/novels")({
  component: AuthorNovelsLayout,
});

function AuthorNovelsLayout() {
  return <Outlet />;
}
