import ApiKeyManager from '@/components/api-key-manager';
import { Wand2 } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Wand2 className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">
              Promptify
            </h1>
          </div>
          <ApiKeyManager />
        </div>
      </div>
    </header>
  );
}
