import Header from '@/components/header';
import PromptGenerator from '@/components/prompt-generator';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container mx-auto">
        <PromptGenerator />
      </main>
    </div>
  );
}
