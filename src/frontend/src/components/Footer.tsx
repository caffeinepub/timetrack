import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t bg-card/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
        <p className="flex items-center justify-center gap-2">
          © 2025. Built with{" "}
          <Heart className="w-4 h-4 text-red-500 fill-red-500" /> using{" "}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </footer>
  );
}
