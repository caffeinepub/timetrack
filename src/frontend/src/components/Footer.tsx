import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer
      className="bg-card/50 backdrop-blur-sm mt-auto"
      style={{ borderTop: "3px solid oklch(var(--vts-green) / 0.5)" }}
    >
      <div className="container mx-auto px-4 py-5 text-center text-sm text-muted-foreground">
        <p className="flex items-center justify-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: "oklch(var(--vts-green))" }}
          />
          © {new Date().getFullYear()}. Built with{" "}
          <Heart className="w-4 h-4 text-red-500 fill-red-500" /> using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline font-medium"
            style={{ color: "oklch(var(--vts-green))" }}
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </footer>
  );
}
