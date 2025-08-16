// client/src/components/DatasetDetailsDrawer.jsx
import { useQuery } from '@tanstack/react-query';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Skeleton } from './ui/skeleton';

// API function to fetch details
const fetchDetails = async (selectedDataset) => {
  if (!selectedDataset) return null;
  const response = await fetch('http://localhost:3001/api/details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: selectedDataset.id, source: selectedDataset.source }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch dataset details');
  }
  return response.json();
};

export const DatasetDetailsDrawer = ({ selectedDataset, onOpenChange }) => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['datasetDetails', selectedDataset?.id],
    queryFn: () => fetchDetails(selectedDataset),
    enabled: !!selectedDataset, // Only run the query if a dataset is selected
  });

  const isOpen = !!selectedDataset;

  // Prepare data for charts (example for Kaggle)
  const chartData = data?.resources?.map(res => ({
    name: res.name.length > 20 ? res.name.substring(0, 20) + '...' : res.name,
    size: res.bytes / 1024, // in KB
  })) || [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="p-4">
        <DrawerHeader>
          <DrawerTitle>{selectedDataset?.title || 'Loading...'}</DrawerTitle>
          <DrawerDescription>
            Source: {selectedDataset?.source} | By: {selectedDataset?.author}
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 h-[60vh] overflow-y-auto">
          {isLoading && <DetailsSkeleton />}
          {isError && <p className="text-destructive">Error: {error.message}</p>}
          {data && (
            <div>
              <h3 className="text-lg font-semibold mb-4">File Sizes (KB)</h3>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="size" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p>No file information available for charts.</p>
              )}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

const DetailsSkeleton = () => (
    <div>
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="w-full h-[300px]" />
    </div>
);