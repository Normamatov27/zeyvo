import type { Metadata } from "next";
import ZeyvoFilm from "./ZeyvoFilm";

export const metadata: Metadata = {
  title: "Building the future of waiting · Zeyvo",
  description: "AI-powered customer flow intelligence.",
};

export default function FilmPage() {
  return <ZeyvoFilm />;
}
