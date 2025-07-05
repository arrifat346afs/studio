import ApiKeyManager from '@/components/api-key-manager';
import { Wand2 } from 'lucide-react';

export default function Header() {
  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Wand2 className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold text-foreground font-headline">
              PromptifyAI
            </h1>
          </div>
          <ApiKeyManager />
        </div>
      </div>
    </header>
  );
}
