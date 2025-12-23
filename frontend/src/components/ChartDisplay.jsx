// frontend/src/components/ChartDisplay.jsx
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'; // Import necessary hooks
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement, // For Pie charts
  PointElement, // For Line charts
  LineElement, // For Line charts
} from 'chart.js';
import { Box, Typography } from '@mui/material'; // Assuming you use MUI components

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

// forwardRef allows this component to receive a ref from its parent
const ChartDisplay = forwardRef(({ chartType, chartData, explanation }, ref) => {
  const chartRef = useRef(null); // Local ref to hold the Chart.js instance

  // Expose methods to the parent component via the ref passed from parent
  useImperativeHandle(ref, () => ({
    toPng: () => {
      // chartRef.current will be the Chart.js instance when mounted
      if (chartRef.current) {
        // toBase64Image is a method provided by the react-chartjs-2 components (Bar, Line, Pie)
        // It's called on the *rendered* Chart.js instance.
        return chartRef.current.toBase64Image('image/png', 1); // 1 means highest quality
      }
      return null;
    }
  }));

  // No specific useEffect cleanup needed for react-chartjs-2 as it handles instance lifecycle.

  if (!chartData || !chartType) {
    return <Typography variant="body2" color="error">No chart data available.</Typography>;
  }

  // Default options for charts (can be customized)
  const options = {
    responsive: true,
    maintainAspectRatio: false, // Allows chart to fill container
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: explanation || 'Generated Chart',
      },
    },
    // For bar/line charts, you might want specific scales
    scales: chartType !== 'pie' ? {
        x: {
            beginAtZero: true
        },
        y: {
            beginAtZero: true
        }
    } : {}
  };

  let ChartComponent;
  let dataToRender = chartData;

  switch (chartType) {
    case 'bar':
      ChartComponent = Bar;
      break;
    case 'line':
      ChartComponent = Line;
      break;
    case 'pie':
      ChartComponent = Pie;
      // Pie charts often need default background colors if not provided by backend
      dataToRender = {
        labels: chartData.labels,
        datasets: chartData.datasets.map(dataset => ({
          ...dataset,
          backgroundColor: dataset.backgroundColor || [
            'rgba(255, 99, 132, 0.6)', 'rgba(54, 162, 235, 0.6)', 'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)', 'rgba(153, 102, 255, 0.6)', 'rgba(255, 159, 64, 0.6)',
            'rgba(200, 100, 200, 0.6)', 'rgba(100, 200, 100, 0.6)' // More colors for more segments
          ],
          borderColor: dataset.borderColor || [
            'rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)', 'rgba(255, 159, 64, 1)',
            'rgba(200, 100, 200, 1)', 'rgba(100, 200, 100, 1)'
          ],
          borderWidth: dataset.borderWidth || 1,
        }))
      };
      break;
    default:
      return <Typography variant="body2" color="error">Unsupported chart type: {chartType}</Typography>;
  }

  return (
    // Use Box from MUI for consistent styling with App.jsx
    <Box sx={{ width: '100%', height: '400px', margin: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {/* Explanation text above the chart */}
        {explanation && (
            <Typography variant="body2" sx={{ mb: 1, textAlign: 'center' }}>
                {explanation}
            </Typography>
        )}
        <Box sx={{ width: '100%', flexGrow: 1, position: 'relative' }}>
            {/* Pass the local chartRef to the ChartComponent */}
            <ChartComponent ref={chartRef} data={dataToRender} options={options} />
        </Box>
    </Box>
  );
});

export default ChartDisplay;