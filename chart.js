let currentChart = null;
window.currentChart = currentChart;

function renderChart(rawData, canvasId = 'finalGraph') {
    const canvas = document.getElementById(canvasId);
    const wrapper = document.getElementById(canvasId + 'Wrapper');

    // Prepare to show and animate the wrapper (not canvas directly)
    wrapper.style.opacity = '0';
    wrapper.style.display = 'block';
    wrapper.style.transition = 'opacity 0.3s ease';

    // Create or reuse the download link
    let existingLink = wrapper.querySelector('.csv-link');
    if (!existingLink) {
      const link = document.createElement('a');
      link.textContent = 'Download CSV';
      link.href = '#';
      link.className = 'csv-link';
      link.style.position = 'absolute';
      link.style.top = '10px';
      link.style.left = '12px';
      link.style.textDecoration = 'underline';
      link.style.color = '#0077cc';
      link.style.fontSize = '14px';
      link.style.zIndex = '10';
      link.style.cursor = 'pointer';

      link.addEventListener('click', (e) => {
        e.preventDefault();
        downloadCSV();
      });

    wrapper.appendChild(link);
    }

    // Let browser apply display before animating
    requestAnimationFrame(() => {
    wrapper.style.opacity = '1';
    });

    const recentData = filterLast30Seconds(rawData);
    const smoothed = smoothData(recentData);

    const start = rawData[0].timestamp;
    const labels = smoothed.map(d => ((d.timestamp - start) / 1000).toFixed(1));

    const datasets = ['rock', 'paper', 'scissors'].map(type => ({
    label: type.charAt(0).toUpperCase() + type.slice(1),
    data: smoothed.map(d => d[type]),
    borderColor: getColor(type),
    tension: 0.4,
    fill: false,
    pointRadius: 0
  }));

  // Delay to ensure canvas has rendered size
  setTimeout(() => {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const ctx = canvas.getContext('2d');

    // Clean up previous chart instance
    if (currentChart) {
      currentChart.destroy(); 
    }
    
    currentChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 10, bottom: 10, left: 10, right: 10 }
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: { precision: 0 }
          }
        },
        plugins: {
          title: {
            display: true,
            text: `${winner.toUpperCase()} Wins! Sprite Counts Over Time (30 seconds max)`,
            color: '#000',
            font: { size: 18 }
          },
            legend: {
            labels: {
                color: '#000',
                font: { size: 16, weight: 'bold' }
            },
            position: 'top',
            align: 'center'
          }
        }
      }
    });
  }, 50); // Or increase to 100 if needed
}
function filterLast30Seconds(data) {
  const now = data[data.length - 1].timestamp;
  return data.filter(d => now - d.timestamp <= 30000);
}

function smoothData(data, windowSize = 5) {
  const result = [];
  for (let i = 0; i < data.length; i += windowSize) {
    const slice = data.slice(i, i + windowSize);
    const avg = { timestamp: slice[0].timestamp };
    ['rock', 'paper', 'scissors'].forEach(type => {
      avg[type] = Math.round(slice.reduce((sum, d) => sum + d[type], 0) / slice.length);
    });
    result.push(avg);
  }
  return result;
}

function getColor(type) {
  return {
    rock: 'red',
    paper: 'blue',
    scissors: 'green'
  }[type];
}

function downloadCSV() {
  let csv = 'time (s),rock,paper,scissors\n';

  if (window.fullGameData.length > 0) {
    const start = window.fullGameData[0].timestamp;

    window.fullGameData.forEach(d => {
      const seconds = ((d.timestamp - start) / 1000).toFixed(2);
      csv += `${seconds},${d.rock},${d.paper},${d.scissors}\n`;
    });
  }

  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'simulation_data.csv';
  link.click();
}