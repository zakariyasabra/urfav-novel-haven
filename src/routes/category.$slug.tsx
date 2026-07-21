// Alias route: /category/:slug -> /categories/:slug (canonical URL).
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/category/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/categories/$slug",
      params: { slug: params.slug },
      replace: true,
    });
  },
});
