'use client';

import { useState, useTransition, useMemo, useRef, useEffect } from 'react';
import { generateImagePrompt } from '@/ai/flows/generate-image-prompt';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';
import { Clipboard, Loader2, AlertCircle, Wand2, Check, Sparkles, Tags, Download, RefreshCw, X } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

type ImageItem = {
  id: string;
  url: string;
  isValid: boolean;
  prompt?: string;
  tags?: string[];
  isGenerating: boolean;
  error?: string;
};

const API_KEY_STORAGE_KEY = 'promptify-api-key';

export default function PromptGenerator() {
  const [urlInput, setUrlInput] = useState('');
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [isProcessing, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();
  const [api, setApi] = useState<CarouselApi>();
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const carouselElement = carouselRef.current;
    if (!carouselElement || !api) {
      return;
    }

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        if (e.deltaY > 0) {
          api.scrollNext();
        } else {
          api.scrollPrev();
        }
      }
    };

    carouselElement.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      carouselElement.removeEventListener('wheel', onWheel);
    };
  }, [api]);

  const handleAddUrl = () => {
    const url = urlInput.trim();
    if (url === '') {
        toast({
            title: "No URL provided",
            description: "Please enter an image URL.",
            variant: "destructive",
        });
        return;
    }
    if (imageItems.some(item => item.url === url)) {
        toast({
            title: "Duplicate URL",
            description: "This image URL has already been added.",
            variant: "destructive",
        });
        return;
    }

    const newItem: ImageItem = {
      id: url + `-${Math.random()}`,
      url: url,
      isValid: true,
      isGenerating: false,
    };
    setImageItems(prev => [newItem, ...prev]);
    setUrlInput('');
  };

  const handleImageError = (id: string) => {
    setImageItems(prev =>
      prev.map(item => (item.id === id ? { ...item, isValid: false } : item))
    );
  };
  
  const handleRemoveItem = (id: string) => {
    setImageItems(prev => prev.filter(item => item.id !== id));
  };
  
  const handleGeneratePrompt = (id: string) => {
    startTransition(async () => {
      setImageItems(prev =>
        prev.map(item => (item.id === id ? { ...item, isGenerating: true, error: undefined } : item))
      );
      
      const itemToProcess = imageItems.find(item => item.id === id);
      if (!itemToProcess) return;

      try {
        const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
        const result = await generateImagePrompt({ imageUrl: itemToProcess.url, apiKey: apiKey || undefined });
        setImageItems(prev =>
          prev.map(item =>
            item.id === id ? { ...item, prompt: result.prompt, tags: result.tags, isGenerating: false } : item
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

  const handleGenerateAllPrompts = async () => {
    setIsBatchGenerating(true);
    setProgress(0);

    const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    const itemsToProcess = imageItems.filter(item => item.isValid && !item.prompt);
    const totalItems = itemsToProcess.length;

    if (totalItems === 0) {
      setIsBatchGenerating(false);
      return;
    }
    
    const itemsToProcessIds = new Set(itemsToProcess.map(i => i.id));
    setImageItems(prev =>
      prev.map(item =>
        itemsToProcessIds.has(item.id) ? { ...item, isGenerating: true, error: undefined } : item
      )
    );
    
    let processedCount = 0;
    let hasErrors = false;

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (const item of itemsToProcess) {
      try {
        const result = await generateImagePrompt({ imageUrl: item.url, apiKey: apiKey || undefined });
        setImageItems(prev =>
          prev.map(i =>
            i.id === item.id ? { ...i, prompt: result.prompt, tags: result.tags, isGenerating: false } : i
          )
        );
      } catch (error) {
        hasErrors = true;
        console.error(`Error generating prompt for ${item.url}:`, error);
        setImageItems(prev =>
          prev.map(i =>
            i.id === item.id ? { ...i, isGenerating: false, error: "API error. Try again." } : i
          )
        );
      }
      processedCount++;
      setProgress((processedCount / totalItems) * 100);

      // Add a delay to respect API rate limits (15 RPM for free tier)
      if (processedCount < totalItems) {
        await sleep(4100); // 60s / 15 req = 4s/req. 4100ms adds a small buffer.
      }
    }
    
    if (hasErrors) {
      toast({
          title: `Batch Generation Finished`,
          description: `Could not generate prompts for one or more images. Please check cards for errors.`,
          variant: "destructive",
      });
    }

    setIsBatchGenerating(false);
    setTimeout(() => setProgress(0), 1000);
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
        setCopiedId(null);
    }, 2000);
  };
  
  const canGenerateAll = useMemo(() => {
    return imageItems.some(item => item.isValid && !item.prompt);
  }, [imageItems]);

  const canExport = useMemo(() => {
    return imageItems.some(item => !!item.prompt);
  }, [imageItems]);

  const handleExportPrompts = () => {
    const promptsToExport = imageItems
      .filter(item => item.isValid && item.prompt)
      .map(item => item.prompt);

    if (promptsToExport.length === 0) {
      toast({
        title: "No Prompts to Export",
        description: "Generate at least one prompt before exporting.",
        variant: "destructive",
      });
      return;
    }

    const fileContent = promptsToExport.join('\n');
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'prompts.txt');
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    toast({
        title: "Prompts Exported",
        description: `Your prompts have been downloaded as prompts.txt.`,
    });
  };
  
  const anyProcessRunning = isProcessing || isBatchGenerating;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 md:space-y-16 py-8 md:py-12 px-4">
      <section className="text-center">
          <div className="flex w-full max-w-lg mx-auto items-center space-x-2 mt-8">
            <Input
              id="image-url"
              type="url"
              placeholder="https://placehold.co/600x400.png"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddUrl();
                }
              }}
              disabled={anyProcessRunning}
              className="h-12"
            />
            <Button onClick={handleAddUrl} disabled={anyProcessRunning || urlInput.trim() === ''} size="lg" className="shadow-lg hover:shadow-primary/40 transition-shadow">
              <Sparkles className="mr-2 h-5 w-5" />
              Add Url
            </Button>
          </div>
      </section>

      {imageItems.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-baseline gap-3">
              <h2 className="text-2xl md:text-3xl font-bold">Your Gallery</h2>
              <span className="font-mono text-lg text-muted-foreground">
                {imageItems.length} image{imageItems.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {canExport && (
                <Button onClick={handleExportPrompts} disabled={anyProcessRunning} size="lg" variant="outline">
                  <Download className="mr-2 h-5 w-5" />
                  Export
                </Button>
              )}
              {canGenerateAll && (
                <Button onClick={handleGenerateAllPrompts} disabled={anyProcessRunning} size="lg" variant="outline">
                  {isBatchGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                  Generate All
                </Button>
              )}
            </div>
          </div>
          {isBatchGenerating && (
            <div className="space-y-2 pt-4">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">Generating prompts... {Math.round(progress)}%</p>
            </div>
          )}
          <Carousel ref={carouselRef} setApi={setApi} opts={{ align: "start" }} className="w-full">
            <CarouselContent className="-ml-4">
              {imageItems.map((item) => (
                <CarouselItem key={item.id} className="md:basis-1/2 lg:basis-1/3 pl-4">
                  <Card className="group relative overflow-hidden rounded-xl  border-2 hover:border-primary transition-all duration-300 w-full flex flex-col">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-black/30 text-white hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveItem(item.id)}
                      aria-label="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <CardHeader className="p-0 border-b relative h-[220px] overflow-hidden">
                      {item.isValid ? (
                        <Image
                          src={item.url}
                          alt="User provided image"
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={() => handleImageError(item.id)}
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-destructive p-4">
                          <AlertCircle className="h-8 w-8" />
                          <p className="mt-2 text-sm font-semibold text-center">Invalid Image or URL</p>
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="p-4 flex flex-col flex-grow">
                      {item.isValid ? (
                        <div className="flex-grow flex flex-col gap-4">
                          {item.isGenerating ? (
                            <div className="flex flex-col items-center justify-center flex-grow space-y-3 min-h-[220px]">
                              <Loader2 className="h-8 w-8 animate-spin text-primary" />
                              <span className="text-muted-foreground font-semibold">Analyzing & Generating...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col flex-grow justify-between gap-4">
                              <div className="space-y-4">
                                {item.prompt && item.tags && item.tags.length > 0 && (
                                  <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                      <Tags className="h-3 w-3" />
                                      Analysis
                                    </Label>
                                    <div className="flex flex-wrap gap-1.5">
                                      {item.tags.map((tag, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs font-normal">{tag}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                <div className="space-y-2">
                                  <Label htmlFor={`prompt-${item.id}`} className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                    <Wand2 className="h-3 w-3" />
                                    Generated Prompt
                                  </Label>
                                  <div className="relative">
                                    <Textarea
                                      id={`prompt-${item.id}`}
                                      readOnly
                                      value={item.prompt || ''}
                                      placeholder="Click 'Generate Prompt' below..."
                                      className="pr-10 bg-muted/50 resize-none text-sm min-h-[100px]"
                                    />
                                    {item.prompt && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-foreground"
                                        onClick={() => copyToClipboard(item.id, item.prompt!)}
                                      >
                                        {copiedId === item.id ? <Check className="h-4 w-4 text-accent" /> : <Clipboard className="h-4 w-4" />}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-auto">
                                {item.prompt ? (
                                    <Button
                                        onClick={() => handleGeneratePrompt(item.id)}
                                        disabled={anyProcessRunning}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Regenerate Prompt
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => handleGeneratePrompt(item.id)}
                                        disabled={anyProcessRunning}
                                        className="w-full"
                                        size="lg"
                                    >
                                        <Wand2 className="mr-2 h-5 w-5" />
                                        Generate Prompt
                                    </Button>
                                )}
                              </div>
                            </div>
                          )}
                          {item.error && (
                            <p className="text-sm text-destructive mt-2 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              {item.error}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col justify-center items-center text-center flex-grow">
                          <p className="text-muted-foreground">This image couldn't be loaded. Please check the URL.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </Carousel>
        </div>
      )}
    </div>
  );
}
