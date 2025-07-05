'use client';

import { useState, useTransition } from 'react';
import { generateImagePrompt } from '@/ai/flows/generate-image-prompt';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clipboard, Loader2, AlertCircle, Wand2, Check } from 'lucide-react';
import Image from 'next/image';

type ImageItem = {
  id: string;
  url: string;
  isValid: boolean;
  prompt?: string;
  isGenerating: boolean;
  error?: string;
};

export default function PromptGenerator() {
  const [urlsInput, setUrlsInput] = useState('');
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [isProcessing, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleProcessUrls = () => {
    const urls = urlsInput.split('\n').filter(url => url.trim() !== '');
    if (urls.length === 0) {
        toast({
            title: "No URLs provided",
            description: "Please enter at least one image URL.",
            variant: "destructive",
        });
        return;
    }
    const newItems: ImageItem[] = urls.map(url => ({
      id: url + `-${Math.random()}`,
      url: url.trim(),
      isValid: true,
      isGenerating: false,
    }));
    setImageItems(newItems);
  };

  const handleImageError = (id: string) => {
    setImageItems(prev =>
      prev.map(item => (item.id === id ? { ...item, isValid: false } : item))
    );
  };
  
  const handleGeneratePrompt = (id: string) => {
    startTransition(async () => {
      setImageItems(prev =>
        prev.map(item => (item.id === id ? { ...item, isGenerating: true, error: undefined } : item))
      );
      
      const itemToProcess = imageItems.find(item => item.id === id);
      if (!itemToProcess) return;

      try {
        const result = await generateImagePrompt({ imageUrl: itemToProcess.url });
        setImageItems(prev =>
          prev.map(item =>
            item.id === id ? { ...item, prompt: result.prompt, isGenerating: false } : item
          )
        );
      } catch (error) {
        console.error('Error generating prompt:', error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        setImageItems(prev =>
          prev.map(item =>
            item.id === id ? { ...item, isGenerating: false, error: "Failed to generate prompt." } : item
          )
        );
        toast({
            title: "Prompt Generation Failed",
            description: errorMessage,
            variant: "destructive",
        });
      }
    });
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
        setCopiedId(null);
    }, 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-10">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Image URL Input</CardTitle>
          <CardDescription>
            Paste one or more image URLs below, one per line. We'll work our magic to generate AI art prompts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            id="image-urls"
            placeholder="https://placehold.co/600x400.png&#10;https://placehold.co/800x600.png"
            value={urlsInput}
            onChange={(e) => setUrlsInput(e.target.value)}
            rows={5}
          />
        </CardContent>
        <CardFooter>
          <Button onClick={handleProcessUrls} disabled={isProcessing || urlsInput.trim() === ''}>
            {(isProcessing && imageItems.length === 0) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Process Images
          </Button>
        </CardFooter>
      </Card>

      {imageItems.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-center font-headline">Your Images & Prompts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {imageItems.map((item) => (
              <Card key={item.id} className="flex flex-col shadow-md hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-4 flex-grow flex flex-col">
                  <div className="aspect-video relative bg-muted rounded-md flex items-center justify-center overflow-hidden border">
                    {item.isValid ? (
                      <Image
                        src={item.url}
                        alt="User provided image"
                        fill
                        className="object-cover transition-transform duration-300 hover:scale-105"
                        onError={() => handleImageError(item.id)}
                        unoptimized
                      />
                    ) : (
                      <div className="flex flex-col items-center text-destructive p-4">
                        <AlertCircle className="h-8 w-8" />
                        <p className="mt-2 text-sm font-semibold text-center">Invalid Image or URL</p>
                      </div>
                    )}
                  </div>

                  {item.isValid && (
                    <div className="mt-4 flex-grow flex flex-col">
                      {item.isGenerating ? (
                        <div className="flex items-center justify-center p-4 bg-muted rounded-md my-auto">
                          <Loader2 className="mr-3 h-6 w-6 animate-spin text-primary" />
                          <span className="text-muted-foreground font-medium">Generating...</span>
                        </div>
                      ) : item.prompt ? (
                        <div className="space-y-2 flex-grow flex flex-col">
                          <Label className="text-base font-semibold flex items-center gap-2">
                            <Wand2 className="h-5 w-5 text-primary" />
                            Generated Prompt
                          </Label>
                          <div className="relative flex-grow">
                            <Textarea
                              readOnly
                              value={item.prompt}
                              className="pr-10 bg-secondary h-full resize-none"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => copyToClipboard(item.id, item.prompt!)}
                            >
                              {copiedId === item.id ? <Check className="h-4 w-4 text-accent" /> : <Clipboard className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleGeneratePrompt(item.id)}
                          disabled={item.isGenerating}
                          className="w-full mt-auto"
                        >
                           <Wand2 className="mr-2 h-4 w-4" />
                          Generate Prompt
                        </Button>
                      )}
                       {item.error && (
                        <p className="text-sm text-destructive mt-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          {item.error}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
