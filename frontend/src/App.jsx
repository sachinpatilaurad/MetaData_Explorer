import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Search, LoaderCircle, ServerCrash, LayoutGrid, List } from 'lucide-react';

// Import our shadcn components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DatasetDetailsDrawer } from '@/components/DatasetDetailsDrawer'; // Import our new component

// --- API Fetching Function ---
const searchApi = async (query) => {
  const response = await fetch('http://localhost:3001/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Network response was not ok');
  }
  return response.json();
};

// --- Main App Component ---
function App() {
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState('card');
  const [selectedDataset, setSelectedDataset] = useState(null); // State to manage the selected dataset

  const mutation = useMutation({ mutationFn: searchApi });

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      mutation.mutate(query);
    }
  };

  // Click handler to open the details drawer
  const handleResultClick = (dataset) => {
    setSelectedDataset(dataset);
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 text-foreground flex flex-col items-center p-4 sm:p-8">
        <div className="w-full max-w-6xl space-y-8">
          <header className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">AI Metadata Explorer</h1>
            <p className="text-gray-600 mt-2">
              Ask a question to find datasets from multiple sources
            </p>
          </header>

          <main>
            <form onSubmit={handleSearch} className="flex w-full items-center space-x-2">
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., “Show me machine learning datasets about audio”"
                className="flex-grow text-base"
                disabled={mutation.isPending}
              />
              <Button type="submit" disabled={mutation.isPending} className="w-28">
                {mutation.isPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6">
              {mutation.isSuccess && mutation.data.results.length > 0 && (
                <div className="flex justify-between items-center mb-4">
                  <p className="text-muted-foreground text-sm">
                    AI identified source: <span className="font-semibold text-primary">{mutation.data.source}</span>. Displaying top {mutation.data.results.length} results.
                  </p>
                  <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value)} size="sm">
                    <ToggleGroupItem value="card" aria-label="Card view"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
                    <ToggleGroupItem value="table" aria-label="Table view"><List className="h-4 w-4" /></ToggleGroupItem>
                  </ToggleGroup>
                </div>
              )}

              {mutation.isPending && <LoadingSkeleton />}
              {mutation.isError && <ErrorDisplay error={mutation.error} />}
              {mutation.isSuccess && (
                mutation.data.results.length === 0
                  ? <p className="text-center text-gray-500 pt-4">No datasets found for your query.</p>
                  : (viewMode === 'card'
                    ? <ResultsCards data={mutation.data} onCardClick={handleResultClick} />
                    : <ResultsTable data={mutation.data} onRowClick={handleResultClick} />)
              )}
            </div>
          </main>
        </div>
      </div>
      
      {/* RENDER THE DRAWER (it will be invisible until a dataset is selected) */}
      <DatasetDetailsDrawer
        selectedDataset={selectedDataset}
        onOpenChange={(isOpen) => { if (!isOpen) setSelectedDataset(null); }}
      />
    </>
  );
}

// --- Sub-components for Displaying State and Views ---

const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
                <CardHeader>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardFooter>
                    <Skeleton className="h-10 w-full" />
                </CardFooter>
            </Card>
        ))}
    </div>
);

const ErrorDisplay = ({ error }) => (
    <Card className="bg-destructive/10 border-destructive">
        <CardHeader className="flex-row items-center space-x-2">
            <ServerCrash className="text-destructive" />
            <CardTitle className="text-destructive">An Error Occurred</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-destructive">{error.message}</p>
        </CardContent>
    </Card>
);

const getButtonLabel = (source) => {
    if (source === 'Kaggle') return 'Kaggle';
    if (source === 'Hugging Face') return 'Hugging Face';
    return 'data.gov'; // Default for CKAN
};

const ResultsCards = ({ data, onCardClick }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {data.results.map((item) => (
      <Card key={item.id} className="flex flex-col">
        {/* Make the header clickable to open the drawer */}
        <CardHeader onClick={() => onCardClick(item)} className="cursor-pointer hover:bg-gray-50 flex-grow">
          <CardTitle className="text-lg leading-tight">{item.title}</CardTitle>
          <CardDescription>By: {item.author}</CardDescription>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 pt-4">
          <div className="space-x-1">
            {item.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="w-full pt-2">
            <Button variant="outline" className="w-full">
              View on {getButtonLabel(item.source)}
            </Button>
          </a>
        </CardFooter>
      </Card>
    ))}
  </div>
);

const ResultsTable = ({ data, onRowClick }) => (
  <Card>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[45%]">Dataset Name</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Last Updated</TableHead>
          <TableHead className="text-right">Tags</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.results.map((item) => (
          // Make the whole row clickable to open the drawer
          <TableRow key={item.id} onClick={() => onRowClick(item)} className="cursor-pointer">
            <TableCell className="font-medium">
              {item.title}
              <a 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()} // Prevents the drawer from opening when clicking the link
                className="text-primary hover:underline ml-2 text-xs"
              >
                (Link)
              </a>
            </TableCell>
            <TableCell>{item.source}</TableCell>
            <TableCell>{item.lastUpdated}</TableCell>
            <TableCell className="text-right space-x-1">
              {item.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Card>
);

export default App;