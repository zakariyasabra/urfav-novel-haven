import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/author/novels/$id")({
  component: () => <Outlet />,
});
