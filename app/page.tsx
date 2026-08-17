import type { Metadata } from "next";
import Survey from "./survey";

export const metadata: Metadata = {
  title: "Consumer Response Study",
  description: "Anonymous academic questionnaire about online product descriptions.",
};

export default function Home() {
  return <Survey />;
}
