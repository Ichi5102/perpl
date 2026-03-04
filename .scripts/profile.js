const puppeteer = require('puppeteer');
const fs = require('fs');

async function measureResource(url, name, durationSec = 15) {
    console.log(`Measuring ${name}: ${url}...`);
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    // Disable some features to make measurement stable
    await page.setCacheEnabled(false);
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for initial load
    await new Promise(r => setTimeout(r, 5000));
    
    // Collect metrics over time
    let totalCpuCount = 0;
    let cpuSum = 0;
    let heapSum = 0;
    
    const interval = setInterval(async () => {
        try {
            const metrics = await page.metrics();
            const client = await page.target().createCDPSession();
            await client.send('Performance.enable');
            const perfMetrics = await client.send('Performance.getMetrics');
            
            // TaskDuration is CPU time in sec
            const taskDuration = perfMetrics.metrics.find(m => m.name === 'TaskDuration')?.value || 0;
            const jsHeap = metrics.JSHeapUsedSize || 0;
            
            cpuSum += taskDuration;
            heapSum += jsHeap;
            totalCpuCount++;
        } catch(e) {}
    }, 1000);
    
    await new Promise(r => setTimeout(r, durationSec * 1000));
    clearInterval(interval);
    
    const avgCpuTaskDuration = cpuSum / totalCpuCount;
    const avgMemoryMB = (heapSum / totalCpuCount) / (1024 * 1024);
    
    await browser.close();
    
    return {
        name,
        avgCpuTaskDuration,
        avgMemoryMB: avgMemoryMB.toFixed(2),
        durationSec
    };
}

(async () => {
    try {
        const results = [];
        // Test Current Perpl Localhost
        results.push(await measureResource('http://localhost:3000', 'Perpl (Optimized)', 10));
        
        // Test Competitors
        results.push(await measureResource('https://open.spotify.com', 'Spotify Web', 10));
        results.push(await measureResource('https://www.youtube.com', 'YouTube Web', 10));
        
        console.log("\n=== Resource Profiling Results ===");
        console.table(results);
    } catch (e) {
        console.error("Error profiling:", e);
    }
})();
