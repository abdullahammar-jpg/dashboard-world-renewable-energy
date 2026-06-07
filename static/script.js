// Chart Instances
let mapChart, bubbleChart, lineChart, pieChart, top5Chart;
let stackedSourceChart, cumulativeBarChart, landUseForestChart;

// Theme Colors
const colors = {
    blue: '#3b82f6',
    green: '#10b981',
    orange: '#f59e0b',
    yellow: '#eab308',
    red: '#ef4444',
    teal: '#14b8a6',
    indigo: '#6366f1',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    gridLine: 'rgba(255, 255, 255, 0.05)',
    panelBg: 'rgba(30, 41, 59, 0.8)'
};

const commonFont = 'Inter, sans-serif';

// Global State
let currentStartYear = 1990;
let currentEndYear = 2022;
let currentCountry = 'World'; 
let currentMapMetric = 'co2_capita'; // Default map metric
let currentLineView = 'ebt_co2'; // Default line chart view
let playInterval = null; // Animation timer
let isPlaying = false;
let savedUserStartYear = 1990; // Save user range for temporal play
let savedUserEndYear = 2022;

// Net Zero Target Database
const netZeroTargets = {
    'World': '2050 (Rekomendasi global IPCC)',
    'United States': '2050',
    'United Kingdom': '2050',
    'European Union': '2050',
    'China': '2060',
    'India': '2070',
    'Indonesia': '2060',
    'Japan': '2050',
    'South Korea': '2050',
    'Canada': '2050',
    'Brazil': '2050',
    'Australia': '2050',
    'South Africa': '2050',
    'Saudi Arabia': '2060',
    'Russia': '2060',
    'Germany': '2045',
    'France': '2050',
    'United Arab Emirates': '2050',
    'Turkey': '2053',
    'Vietnam': '2050',
    'Singapore': '2050'
};

// Initialize elements
const yearSlider = document.getElementById('year-slider');
const yearStartSpan = document.getElementById('year-start');
const yearEndSpan = document.getElementById('year-end');

// Custom Searchable Dropdown elements
const dropdownTrigger = document.getElementById('dropdown-trigger');
const dropdownMenu = document.getElementById('dropdown-menu');
const dropdownSearch = document.getElementById('dropdown-search');
const dropdownOptions = document.getElementById('dropdown-options');
const selectedCountryText = document.getElementById('selected-country-text');

// Load World Map and Initialize
document.addEventListener("DOMContentLoaded", () => {
    fetch('https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json')
        .then(res => res.json())
        .then(geoJson => {
            geoJson.features.forEach(f => {
                if(f.properties.name === 'United States of America') f.properties.name = 'United States';
            });
            echarts.registerMap('world', geoJson);
            document.querySelector('#map-chart .loading-overlay').style.display = 'none';
            initCharts();
            setupMapClick(); // Set up map click interaction (Click-to-Filter)
            initSearchableDropdown(); // Set up country search dropdown
            populateFilters();
            setupMetricTabs(); // Set up map & line tabs
            setupPlayAnimation(); // Set up Play/Pause timeline animation
            setupTabNavigation();
            updateDashboard();
        })
        .catch(err => {
            console.error("Map loading error:", err);
            document.getElementById('map-chart').innerHTML = '<div class="loading-overlay">Gagal memuat peta.</div>';
            initCharts();
            initSearchableDropdown();
            populateFilters();
            setupMetricTabs();
            setupPlayAnimation();
            setupTabNavigation();
            updateDashboard();
        });
});

function initCharts() {
    const mapContainer = document.getElementById('map-chart');
    if (mapContainer) {
        mapChart = echarts.init(mapContainer);
    }
    bubbleChart = echarts.init(document.getElementById('bubble-chart'));
    lineChart = echarts.init(document.getElementById('line-chart'));
    pieChart = echarts.init(document.getElementById('pie-chart'));
    top5Chart = echarts.init(document.getElementById('top5-chart'));
    
    stackedSourceChart = echarts.init(document.getElementById('stacked-source-chart'));
    cumulativeBarChart = echarts.init(document.getElementById('cumulative-bar-chart'));
    landUseForestChart = echarts.init(document.getElementById('land-use-forest-chart'));

    window.addEventListener('resize', () => {
        if(mapChart) mapChart.resize();
        bubbleChart.resize();
        lineChart.resize();
        if(pieChart) pieChart.resize();
        top5Chart.resize();
        if(stackedSourceChart) stackedSourceChart.resize();
        if(cumulativeBarChart) cumulativeBarChart.resize();
        if(landUseForestChart) landUseForestChart.resize();
    });
}

// Helpers
function isCountry(row) {
    return row.Code && row.Code.length === 3 && !row.Code.startsWith('OWID');
}

// Helper to select country and update UI
function selectCountry(countryName) {
    currentCountry = countryName;
    
    // Update trigger button text
    const displayText = countryName === 'World' ? 'Seluruh Dunia (Global)' : countryName;
    selectedCountryText.textContent = displayText;
    
    // Update active class in dropdown options
    document.querySelectorAll('.dropdown-option').forEach(el => {
        if (el.dataset.value === countryName) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });
    
    updateDashboard();
}

// Searchable country dropdown logic
function initSearchableDropdown() {
    if(typeof globalData === 'undefined' || !globalData.length) return;
    
    const countries = [...new Set(globalData.filter(d => isCountry(d)).map(d => d.Entity))].sort();
    
    // Build list options
    let optionsHtml = `<div class="dropdown-option selected" data-value="World">Seluruh Dunia (Global)</div>`;
    countries.forEach(c => {
        optionsHtml += `<div class="dropdown-option" data-value="${c}">${c}</div>`;
    });
    dropdownOptions.innerHTML = optionsHtml;
    
    // Toggle dropdown open on trigger click
    dropdownTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("Trigger clicked. Toggle show class.");
        dropdownMenu.classList.toggle('show');
        if (dropdownMenu.classList.contains('show')) {
            dropdownSearch.focus();
            dropdownSearch.value = '';
            filterDropdownOptions('');
        }
    });
    
    // Filter typing event
    dropdownSearch.addEventListener('input', (e) => {
        console.log("Input typing:", e.target.value);
        filterDropdownOptions(e.target.value);
    });
    
    // Selection click event
    dropdownOptions.addEventListener('click', (e) => {
        const option = e.target.closest('.dropdown-option');
        console.log("Options clicked. Target:", e.target, "Option matched:", option);
        if (option && !option.classList.contains('no-results')) {
            const val = option.getAttribute('data-value') || option.dataset.value;
            console.log("Selected country value:", val);
            selectCountry(val);
            dropdownMenu.classList.remove('show');
        }
    });
    
    // Bulletproof click outside listener using closest
    document.addEventListener('click', (e) => {
        const isInside = e.target.closest('#country-dropdown');
        console.log("Doc clicked. Target:", e.target, "Is inside dropdown:", !!isInside);
        if (!isInside) {
            console.log("Closing dropdown because click is outside.");
            dropdownMenu.classList.remove('show');
        }
    });
}

function filterDropdownOptions(query) {
    const q = query.toLowerCase().trim();
    const options = dropdownOptions.querySelectorAll('.dropdown-option');
    let visibleCount = 0;
    
    const noRes = dropdownOptions.querySelector('.no-results');
    if (noRes) noRes.remove();
    
    options.forEach(opt => {
        const val = opt.dataset.value;
        const text = opt.textContent.toLowerCase();
        if (text.includes(q) || val.toLowerCase().includes(q)) {
            opt.style.display = 'block';
            visibleCount++;
        } else {
            opt.style.display = 'none';
        }
    });
    
    if (visibleCount === 0) {
        const div = document.createElement('div');
        div.className = 'dropdown-option no-results';
        div.textContent = 'Negara tidak ditemukan';
        dropdownOptions.appendChild(div);
    }
}

// Click to filter on map
function setupMapClick() {
    if (!mapChart) return;
    mapChart.on('click', function(params) {
        if (params.componentType === 'series' && params.seriesType === 'map') {
            const countryName = params.name;
            const exists = globalData.some(d => d.Entity === countryName && isCountry(d));
            if (exists) {
                selectCountry(countryName);
            } else if (countryName === 'World') {
                selectCountry('World');
            }
        }
    });
}

// Map metric tabs & line toggles setup
function setupMetricTabs() {
    const tabs = document.querySelectorAll('.map-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentMapMetric = tab.dataset.metric;
            
            const snapshotData = getAggregatedData();
            if (mapChart) updateMapChart(snapshotData);
        });
    });
    
    const lineTabs = document.querySelectorAll('.line-tab');
    lineTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            lineTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentLineView = tab.dataset.view;
            
            updateLineChart();
        });
    });
}

// Play temporal animation setup
function setupPlayAnimation() {
    const playBtn = document.getElementById('play-button');
    if (!playBtn) return;
    
    playBtn.addEventListener('click', () => {
        if (isPlaying) {
            pauseAnimation();
        } else {
            startAnimation();
        }
    });
}

function startAnimation() {
    const playBtn = document.getElementById('play-button');
    isPlaying = true;
    playBtn.classList.add('playing');
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    
    // Save current range
    savedUserStartYear = currentStartYear;
    savedUserEndYear = currentEndYear;
    
    let tempYear = savedUserStartYear;
    if (tempYear >= 2022) {
        tempYear = 1990;
    }
    
    runAnimationStep(tempYear);
    
    playInterval = setInterval(() => {
        tempYear++;
        if (tempYear > 2022) {
            tempYear = 1990;
        }
        runAnimationStep(tempYear);
    }, 1200); // 1.2s per step to allow smooth rendering
}

function pauseAnimation() {
    const playBtn = document.getElementById('play-button');
    isPlaying = false;
    if (playBtn) {
        playBtn.classList.remove('playing');
        playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    }
    
    if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
    }
    
    // Restore user original selection
    currentStartYear = savedUserStartYear;
    currentEndYear = savedUserEndYear;
    
    if (yearSlider && yearSlider.noUiSlider) {
        yearSlider.noUiSlider.set([currentStartYear, currentEndYear]);
    }
    
    updateDashboard();
}

function runAnimationStep(year) {
    currentStartYear = year;
    currentEndYear = year;
    
    yearStartSpan.textContent = year;
    yearEndSpan.textContent = year;
    
    if (yearSlider && yearSlider.noUiSlider) {
        yearSlider.noUiSlider.set([year, year]);
    }
    
    updateDashboard();
}

function populateFilters() {
    if(typeof globalData === 'undefined' || !globalData.length) return;

    // Filter range limits
    const allYears = [...new Set(globalData.map(d => d.Year))].filter(y => y >= 1990 && y <= 2022).sort();
    if(allYears.length > 0) {
        currentStartYear = allYears[0];
        currentEndYear = allYears[allYears.length-1];
        yearStartSpan.textContent = currentStartYear;
        yearEndSpan.textContent = currentEndYear;

        noUiSlider.create(yearSlider, {
            start: [currentStartYear, currentEndYear],
            connect: true,
            step: 1,
            range: {
                'min': currentStartYear,
                'max': currentEndYear
            },
            format: {
                to: value => Math.round(value),
                from: value => Math.round(value)
            }
        });

        yearSlider.noUiSlider.on('update', function (values) {
            currentStartYear = parseInt(values[0]);
            currentEndYear = parseInt(values[1]);
            yearStartSpan.textContent = currentStartYear;
            yearEndSpan.textContent = currentEndYear;
        });

        yearSlider.noUiSlider.on('slide', function () {
            // Pause if user manually drags slider
            if (isPlaying) {
                pauseAnimation();
            }
        });

        yearSlider.noUiSlider.on('change', function () {
            updateDashboard();
        });
    }
}

// Data Aggregation for Snapshot Charts
function getAggregatedData() {
    const agg = {};
    globalData.forEach(d => {
        if(d.Year >= currentStartYear && d.Year <= currentEndYear && isCountry(d)) {
            if(!agg[d.Entity]) {
                agg[d.Entity] = { Entity: d.Entity, Code: d.Code, count: 0, co2_total: 0, co2_capita: 0, renewable_primary: 0, renewable_elec: 0, non_renewable_elec: 0, forest_loss: 0,
                                  has_total: false, has_capita: false, has_renew_prim: false, has_renew_elec: false, has_non_renew_elec: false, has_forest_loss: false };
            }
            agg[d.Entity].count++;
            if(d.co2_total != null) { agg[d.Entity].co2_total += d.co2_total; agg[d.Entity].has_total = true; }
            if(d.co2_capita != null) { agg[d.Entity].co2_capita += d.co2_capita; agg[d.Entity].has_capita = true; }
            if(d.renewable_primary != null) { agg[d.Entity].renewable_primary += d.renewable_primary; agg[d.Entity].has_renew_prim = true; }
            if(d.renewable_elec != null) { agg[d.Entity].renewable_elec += d.renewable_elec; agg[d.Entity].has_renew_elec = true; }
            if(d.non_renewable_elec != null) { agg[d.Entity].non_renewable_elec += d.non_renewable_elec; agg[d.Entity].has_non_renew_elec = true; }
            if(d.forest_loss != null) { agg[d.Entity].forest_loss += d.forest_loss; agg[d.Entity].has_forest_loss = true; }
        }
    });
    
    return Object.values(agg).map(d => ({
        Entity: d.Entity,
        co2_total: d.has_total ? d.co2_total / d.count : null, // avg across range
        co2_capita: d.has_capita ? d.co2_capita / d.count : null,
        renewable_primary: d.has_renew_prim ? d.renewable_primary / d.count : null,
        renewable_elec: d.has_renew_elec ? d.renewable_elec / d.count : null,
        non_renewable_elec: d.has_non_renew_elec ? d.non_renewable_elec / d.count : null,
        forest_loss: d.has_forest_loss ? d.forest_loss / d.count : null
    }));
}

// --- Dashboard Update Logic ---

function updateDashboard() {
    if(typeof globalData === 'undefined' || !globalData.length) return;
    
    const snapshotData = getAggregatedData();
    
    updateKPIs(snapshotData);
    if(mapChart) updateMapChart(snapshotData);
    updateBubbleChart(snapshotData);
    updateLineChart();
    updatePieChart(snapshotData);
    updateTop5Chart(snapshotData);
    updatePage2Charts();
}

// Calculate Pearson Correlation
function calculatePearson(x, y) {
    const n = x.length;
    if (n < 2) return null;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
        sumX += x[i];
        sumY += y[i];
        sumXY += x[i] * y[i];
        sumX2 += x[i] * x[i];
        sumY2 += y[i] * y[i];
    }
    const num = (n * sumXY) - (sumX * sumY);
    const den = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));
    if (den === 0) return null;
    return num / den;
}

function generateInsights() {
    const insightTextEl = document.getElementById('insight-text');
    if (!insightTextEl) return;
    
    // 1. Calculate cumulative historical emissions up to currentEndYear
    let cumulativeCO2 = 0;
    if (currentCountry === 'World') {
        globalData.forEach(d => {
            if (isCountry(d) && d.Year <= currentEndYear && d.co2_total != null) {
                cumulativeCO2 += d.co2_total;
            }
        });
    } else {
        globalData.forEach(d => {
            if (d.Entity === currentCountry && d.Year <= currentEndYear && d.co2_total != null) {
                cumulativeCO2 += d.co2_total;
            }
        });
    }
    
    let cumDisplay = cumulativeCO2;
    let cumUnit = 'tCO2';
    if (cumulativeCO2 >= 1000000000) {
        cumDisplay = cumulativeCO2 / 1000000000;
        cumUnit = 'Gt (Gigaton) CO₂';
    } else if (cumulativeCO2 >= 1000000) {
        cumDisplay = cumulativeCO2 / 1000000;
        cumUnit = 'Mt (Megaton) CO₂';
    } else if (cumulativeCO2 >= 1000) {
        cumDisplay = cumulativeCO2 / 1000;
        cumUnit = 'Ribu tCO₂';
    }
    
    // 2. Net Zero Target commit lookup
    const targetYear = netZeroTargets[currentCountry] || 'Belum ada komitmen formal';
    
    // 3. Correlation between EBT & CO2 in the active years range
    let correlationStr = '';
    const activeData = globalData.filter(d => 
        d.Entity === currentCountry && 
        d.Year >= currentStartYear && 
        d.Year <= currentEndYear && 
        d.renewable_primary != null && 
        d.co2_capita != null
    ).sort((a,b) => a.Year - b.Year);
    
    if (activeData.length >= 3) {
        const x = activeData.map(d => d.renewable_primary);
        const y = activeData.map(d => d.co2_capita);
        const r = calculatePearson(x, y);
        if (r !== null) {
            const rVal = r.toFixed(2);
            if (r < -0.7) {
                correlationStr = `korelasi negatif sangat kuat (r = ${rVal}) antara EBT & CO₂ (transisi energi sukses mereduksi emisi).`;
            } else if (r < -0.3) {
                correlationStr = `korelasi negatif sedang (r = ${rVal}) antara EBT & CO₂ (mulai ada reduksi emisi dari energi bersih).`;
            } else if (r > 0.5) {
                correlationStr = `korelasi positif (r = ${rVal}), keduanya meningkat seiring pesatnya laju kebutuhan energi total.`;
            } else {
                correlationStr = `belum terlihat korelasi searah yang jelas (r = ${rVal}) antara EBT & CO₂.`;
            }
        }
    }
    
    // Generate text
    const scopeName = currentCountry === 'World' ? 'Global' : currentCountry;
    let text = `<strong>${scopeName}</strong>: Target Net Zero: <strong>${targetYear}</strong>. `;
    text += `Akumulasi emisi historis kumulatif hingga ${currentEndYear} mencapai <strong>${cumDisplay.toFixed(1)} ${cumUnit}</strong>. `;
    if (correlationStr) {
        text += `Terlihat ${correlationStr}`;
    }
    
    insightTextEl.innerHTML = text;
}

function getCumulativeEmissions(entity, targetYear) {
    const rows = globalData.filter(d => d.Entity === entity && d.Year <= targetYear && d.co2_cumulative != null);
    if (rows.length === 0) return 0;
    rows.sort((a, b) => b.Year - a.Year);
    return rows[0].co2_cumulative;
}

function getYearlyMetric(country, year, metric) {
    if (country === 'World') {
        const row = globalData.find(d => d.Entity === 'World' && d.Year === year);
        if (row && row[metric] != null) return row[metric];
        
        if (metric === 'forest_loss') {
            let sum = 0;
            globalData.forEach(d => {
                if (d.Year === year && d.forest_loss != null && isCountry(d)) {
                    sum += d.forest_loss;
                }
            });
            return sum;
        }
        return 0;
    } else {
        const row = globalData.find(d => d.Entity === country && d.Year === year);
        return row ? (row[metric] || 0) : 0;
    }
}

function calculatePercentageChange(startVal, endVal) {
    if (startVal === 0) {
        if (endVal === 0) return 0;
        return endVal * 100;
    }
    return ((endVal - startVal) / startVal) * 100;
}

function updateKPITrend(cardClass, pct, isGoodDecrease) {
    const iconContainer = document.querySelector(`.${cardClass} .kpi-icon`);
    if (!iconContainer) return;
    
    let iconClass = 'fa-solid fa-minus';
    let bgColor = 'rgba(148, 163, 184, 0.15)'; // gray
    let textColor = '#94a3b8';
    let textStr = '0.0%';
    
    if (pct > 0.05) {
        iconClass = 'fa-solid fa-arrow-trend-up';
        textStr = `+${pct.toFixed(1)}%`;
        if (isGoodDecrease) {
            bgColor = 'rgba(239, 68, 68, 0.15)'; // red for bad increase
            textColor = colors.red;
        } else {
            bgColor = 'rgba(16, 185, 129, 0.15)'; // green for good increase
            textColor = colors.green;
        }
    } else if (pct < -0.05) {
        iconClass = 'fa-solid fa-arrow-trend-down';
        textStr = `${pct.toFixed(1)}%`;
        if (isGoodDecrease) {
            bgColor = 'rgba(16, 185, 129, 0.15)'; // green for good decrease
            textColor = colors.green;
        } else {
            bgColor = 'rgba(239, 68, 68, 0.15)'; // red for bad decrease
            textColor = colors.red;
        }
    }
    
    iconContainer.innerHTML = `<i class="${iconClass}"></i><span>${textStr}</span>`;
    iconContainer.style.background = bgColor;
    iconContainer.style.color = textColor;
    iconContainer.style.boxShadow = `0 0 10px ${bgColor.replace('0.15', '0.1')}`;
}

function updateKPIs(snapshotData) {
    let co2 = 0;
    let ebt = 0;

    if (currentCountry === 'World') {
        let wCount = 0, wEbtCount = 0;
        globalData.forEach(d => {
            if(d.Entity === 'World' && d.Year >= currentStartYear && d.Year <= currentEndYear) {
                if(d.co2_total != null) { co2 += d.co2_total; wCount++; }
                if(d.renewable_primary != null) { ebt += d.renewable_primary; wEbtCount++; }
            }
        });
        if(wCount) co2 = co2 / wCount; // Rata-rata tahunan
        if(wEbtCount) ebt = ebt / wEbtCount;
    } else {
        const row = snapshotData.find(d => d.Entity === currentCountry);
        if(row) {
            co2 = row.co2_total || 0;
            ebt = row.renewable_primary || 0;
        }
    }

    // Calculate Total Forest Loss over the range
    let forest = 0;
    if (currentCountry === 'World') {
        globalData.forEach(d => {
            if(d.Year >= currentStartYear && d.Year <= currentEndYear && d.forest_loss != null && isCountry(d)) {
                forest += d.forest_loss;
            }
        });
    } else {
        globalData.forEach(d => {
            if(d.Entity === currentCountry && d.Year >= currentStartYear && d.Year <= currentEndYear && d.forest_loss != null) {
                forest += d.forest_loss;
            }
        });
    }

    let co2Unit = 'tCO2';
    let co2Display = co2;
    if(co2 >= 1000000000) { co2Display = co2 / 1000000000; co2Unit = 'Gt'; }
    else if(co2 >= 1000000) { co2Display = co2 / 1000000; co2Unit = 'Mt'; }
    else if(co2 >= 1000) { co2Display = co2 / 1000; co2Unit = 'kt'; }

    let forestUnit = 'ha';
    let forestDisplay = forest;
    if(forest >= 1000000) { forestDisplay = forest / 1000000; forestUnit = 'Mha'; }
    else if(forest >= 1000) { forestDisplay = forest / 1000; forestUnit = 'k ha'; }

    document.getElementById('kpi-co2').innerHTML = `${co2Display.toFixed(2)} <span class="unit">${co2Unit}</span>`;
    document.getElementById('kpi-ebt').innerHTML = `${ebt.toFixed(1)} <span class="unit">%</span>`;
    document.getElementById('kpi-forest').innerHTML = `${forestDisplay.toFixed(2)} <span class="unit">${forestUnit}</span>`;

    // --- Update KPI Trend Indicators dynamically ---
    const co2Start = getYearlyMetric(currentCountry, currentStartYear, 'co2_total');
    const co2End = getYearlyMetric(currentCountry, currentEndYear, 'co2_total');
    const ebtStart = getYearlyMetric(currentCountry, currentStartYear, 'renewable_primary');
    const ebtEnd = getYearlyMetric(currentCountry, currentEndYear, 'renewable_primary');
    const forestStart = getYearlyMetric(currentCountry, currentStartYear, 'forest_loss');
    const forestEnd = getYearlyMetric(currentCountry, currentEndYear, 'forest_loss');

    const co2Pct = calculatePercentageChange(co2Start, co2End);
    const ebtPct = calculatePercentageChange(ebtStart, ebtEnd);
    const forestPct = calculatePercentageChange(forestStart, forestEnd);

    updateKPITrend('kpi1', co2Pct, true);    // CO2: bad if increase (isGoodDecrease = true)
    updateKPITrend('kpi2', ebtPct, false);   // EBT: good if increase (isGoodDecrease = false)
    updateKPITrend('kpi3', forestPct, true); // Forest Loss: bad if increase (isGoodDecrease = true)

    // --- Page 2 KPIs ---
    // 1. Cumulative Historical CO2
    const cumulativeVal = getCumulativeEmissions(currentCountry, currentEndYear);
    const cumulativeValGt = cumulativeVal / 1000000000;
    const kpiCumEl = document.getElementById('kpi-co2-cumulative');
    if (kpiCumEl) {
        kpiCumEl.innerHTML = `${cumulativeValGt.toFixed(2)} <span class="unit">Gt</span>`;
    }

    // 2. Total Land Use Emissions
    let landUseTotal = 0;
    globalData.forEach(d => {
        if (d.Entity === (currentCountry === 'World' ? 'World' : currentCountry) && d.Year >= currentStartYear && d.Year <= currentEndYear && d.co2_land_use != null) {
            landUseTotal += d.co2_land_use;
        }
    });
    const landUseMt = landUseTotal / 1000000; // convert to Mt
    let landUseDisplay = landUseMt;
    let landUseUnit = 'Mt';
    if (landUseMt >= 1000) {
        landUseDisplay = landUseMt / 1000;
        landUseUnit = 'Gt';
    }
    const kpiLandEl = document.getElementById('kpi-co2-landuse');
    if (kpiLandEl) {
        kpiLandEl.innerHTML = `${landUseDisplay.toFixed(2)} <span class="unit">${landUseUnit}</span>`;
    }

    // 3. Total Fossil Emissions (Replacing Target Net Zero)
    let fossilTotal = 0;
    globalData.forEach(d => {
        if (d.Entity === (currentCountry === 'World' ? 'World' : currentCountry) && d.Year >= currentStartYear && d.Year <= currentEndYear && d.co2_fossil != null) {
            fossilTotal += d.co2_fossil;
        }
    });
    const fossilMt = fossilTotal / 1000000; // convert to Mt
    let fossilDisplay = fossilMt;
    let fossilUnit = 'Mt';
    if (fossilMt >= 1000) {
        fossilDisplay = fossilMt / 1000;
        fossilUnit = 'Gt';
    }
    const kpiFossilEl = document.getElementById('kpi-net-zero');
    if (kpiFossilEl) {
        kpiFossilEl.innerHTML = `${fossilDisplay.toFixed(2)} <span class="unit">${fossilUnit}</span>`;
    }

    // --- Update Page 2 KPI Trend Indicators dynamically ---
    const cumStart = getCumulativeEmissions(currentCountry, currentStartYear);
    const cumEnd = getCumulativeEmissions(currentCountry, currentEndYear);
    const cumPct = calculatePercentageChange(cumStart, cumEnd);

    const landStart = getYearlyMetric(currentCountry, currentStartYear, 'co2_land_use');
    const landEnd = getYearlyMetric(currentCountry, currentEndYear, 'co2_land_use');
    const landPct = calculatePercentageChange(landStart, landEnd);

    const fossilStart = getYearlyMetric(currentCountry, currentStartYear, 'co2_fossil');
    const fossilEnd = getYearlyMetric(currentCountry, currentEndYear, 'co2_fossil');
    const fossilPct = calculatePercentageChange(fossilStart, fossilEnd);

    updateKPITrend('kpi-cum', cumPct, true);    // Cumulative CO2: bad if increase
    updateKPITrend('kpi-land', landPct, true);  // Land Use: bad if increase
    updateKPITrend('kpi-target', fossilPct, true); // Fossil: bad if increase
}

// --- Chart Renderers ---

const tooltipStyle = {
    appendToBody: true, // Guarantees tooltip is not cut off by panels
    extraCssText: 'z-index: 9999;', 
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderColor: 'rgba(255,255,255,0.1)',
    textStyle: { color: colors.text, fontFamily: commonFont },
    borderRadius: 8,
    padding: 12
};

function updateMapChart(snapshotData) {
    let metricField = 'co2_capita';
    let unitLabel = 'tCO2/kapita';
    let minVal = 0;
    let maxVal = 20;
    let colorPalette = ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15']; // Red range for CO2
    
    if (currentMapMetric === 'renewable_primary') {
        metricField = 'renewable_primary';
        unitLabel = '% EBT';
        minVal = 0;
        maxVal = 100;
        colorPalette = ['#edf8fb', '#b2e2e2', '#66c2a4', '#2ca25f', '#006d2c']; // Green range for renewables
    } else if (currentMapMetric === 'forest_loss') {
        metricField = 'forest_loss';
        unitLabel = 'ha Hutan Hilang/tahun';
        minVal = 0;
        colorPalette = ['#ffffd4', '#fed98e', '#fe9929', '#ec7014', '#cc4c02']; // Yellow/Orange/Brown range for forest loss
        
        // Calculate dynamic max to handle variations between global and local scales
        const values = snapshotData.map(d => d.forest_loss).filter(v => v != null);
        maxVal = values.length > 0 ? Math.max(...values) : 100000;
    } else {
        // dynamic max for CO2 capita too, cap to 25 to avoid outlier skew
        const values = snapshotData.map(d => d.co2_capita).filter(v => v != null);
        maxVal = values.length > 0 ? Math.min(25, Math.max(...values)) : 20;
    }

    const mapData = snapshotData
        .filter(d => d[metricField] != null)
        .map(d => {
            const isSelected = currentCountry === 'World' || d.Entity === currentCountry;
            return {
                name: d.Entity,
                value: isSelected ? d[metricField] : null
            };
        });

    const option = {
        tooltip: {
            ...tooltipStyle,
            trigger: 'item',
            formatter: function(params) {
                if(isNaN(params.value)) return params.name;
                let valStr = params.value.toFixed(2);
                if (currentMapMetric === 'forest_loss') {
                    valStr = params.value >= 1000 ? (params.value/1000).toFixed(2) + ' Ribu ha' : params.value.toFixed(0) + ' ha';
                }
                return `${params.name}<br/>${valStr} ${unitLabel}`;
            }
        },
        visualMap: {
            left: 'left',
            bottom: 'bottom',
            min: minVal,
            max: maxVal,
            itemWidth: 10,
            itemHeight: 70,
            text: ['Tinggi', 'Rendah'],
            calculable: false,
            inRange: {
                color: colorPalette
            },
            textStyle: { color: colors.textMuted },
            backgroundColor: 'transparent',
            padding: 5,
            borderRadius: 8,
            formatter: function(value) {
                if (currentMapMetric === 'forest_loss') {
                    return value >= 1000000 ? (value/1000000).toFixed(1) + ' Mha' : value >= 1000 ? (value/1000).toFixed(0) + 'k ha' : value.toFixed(0) + ' ha';
                } else if (currentMapMetric === 'renewable_primary') {
                    return value.toFixed(0) + '%';
                } else {
                    return value.toFixed(1) + ' tCO₂';
                }
            }
        },
        series: [
            {
                name: 'Data Lingkungan',
                type: 'map',
                map: 'world',
                nameMap: {
                    'Dem. Rep. Congo':                  'Democratic Republic of Congo',
                    'Republic of the Congo':            'Congo',
                    'United States of America':         'United States',
                    'Russian Federation':               'Russia',
                    'United Republic of Tanzania':      'Tanzania',
                    'Guinea Bissau':                    'Guinea-Bissau',
                    "Côte d'Ivoire":                    "Cote d'Ivoire",
                    'Ivory Coast':                      "Cote d'Ivoire",
                    'Iran (Islamic Republic of)':       'Iran',
                    'Syrian Arab Republic':             'Syria',
                    'Korea':                            'South Korea',
                    "Lao PDR":                          'Laos',
                    'Lao People\'s Democratic Republic': 'Laos',
                    'Viet Nam':                         'Vietnam',
                    'Myanmar':                          'Myanmar',
                    'Czech Republic':                   'Czechia',
                    'Czechia':                          'Czechia',
                    'Macedonia':                        'North Macedonia',
                    'Bosnia and Herz.':                 'Bosnia and Herzegovina',
                    'Bosnia and Herzegovina':           'Bosnia and Herzegovina',
                    'Timor-Leste':                      'East Timor',
                    'Swaziland':                        'Eswatini',
                    'eSwatini':                         'Eswatini',
                    'Palestine':                        'Palestine',
                    'West Bank and Gaza':               'Palestine',
                    'Cabo Verde':                       'Cape Verde',
                    'S. Sudan':                         'South Sudan',
                    'Central African Rep.':             'Central African Republic',
                    'W. Sahara':                        'Western Sahara',
                    'Eq. Guinea':                       'Equatorial Guinea',
                    'São Tomé and Príncipe':            'Sao Tome and Principe',
                    'Micronesia (Federated States of)': 'Micronesia (country)',
                    'Federated States of Micronesia':   'Micronesia (country)',
                    'Saint Kitts and Nevis':            'Saint Kitts and Nevis',
                    'St. Kitts and Nevis':              'Saint Kitts and Nevis',
                    'St. Lucia':                        'Saint Lucia',
                    'St. Vincent and the Gregs.':       'Saint Vincent and the Grenadines',
                    'St. Vincent and the Grenadines':   'Saint Vincent and the Grenadines',
                    'Trinidad and Tobago':              'Trinidad and Tobago',
                    'Antigua and Barb.':                'Antigua and Barbuda',
                    'Dominican Rep.':                   'Dominican Republic',
                    'Papua New Guinea':                 'Papua New Guinea',
                    'Brunei Darussalam':                'Brunei',
                    'Republic of Moldova':              'Moldova',
                    'Venezuela (Bolivarian Republic of)': 'Venezuela',
                    'Bolivia (Plurinational State of)': 'Bolivia'
                },
                roam: true,
                zoom: 1.2,
                selectedMode: false,
                itemStyle: {
                    areaColor: '#334155',
                    borderColor: 'rgba(255,255,255,0.2)'
                },
                emphasis: {
                    itemStyle: {
                        areaColor: colors.blue
                    },
                    label: { show: true, color: '#fff' }
                },
                data: mapData
            }
        ]
    };
    mapChart.setOption(option, true);
}

function updateBubbleChart(snapshotData) {
    const validData = snapshotData.filter(d => d.renewable_primary != null && d.co2_capita != null);
    
    const maxCo2 = Math.max(...validData.map(d => d.co2_capita), 1);

    const bubbleData = validData.map(d => {
        const isSelected = currentCountry === 'World' || d.Entity === currentCountry;
        return {
            name: d.Entity,
            value: [d.renewable_primary, d.co2_capita, d.co2_capita, d.Entity],
            itemStyle: isSelected ? {} : { color: '#475569', opacity: 0.1 }
        };
    });

    const option = {
        tooltip: {
            ...tooltipStyle,
            formatter: function (param) {
                const ebt = param.data.value[0].toFixed(2);
                const co2 = param.data.value[1].toFixed(2);
                return `<strong>${param.data.value[3]}</strong><br/>Rata-rata EBT: ${ebt}%<br/>Rata-rata CO2/Kapita: ${co2} tCO2/org`;
            }
        },
        grid: { left: '3%', right: '3%', bottom: '3%', top: '15%', containLabel: true },
        xAxis: {
            type: 'value',
            name: 'Rerata EBT (%)',
            nameLocation: 'middle',
            nameGap: 30,
            splitLine: { lineStyle: { color: colors.gridLine } },
            axisLabel: { color: colors.textMuted },
            nameTextStyle: { color: colors.textMuted }
        },
        yAxis: {
            type: 'value',
            name: 'Rerata CO2/Kapita',
            nameTextStyle: { color: colors.textMuted, align: 'left' },
            splitLine: { lineStyle: { color: colors.gridLine } },
            axisLabel: { color: colors.textMuted }
        },
        series: [{
            type: 'scatter',
            symbolSize: function (data) {
                return Math.max(5, Math.pow(data[2] / maxCo2, 0.4) * 15); 
            },
            itemStyle: {
                color: new echarts.graphic.RadialGradient(0.4, 0.3, 1, [{
                    offset: 0, color: 'rgba(59, 130, 246, 0.8)'
                }, {
                    offset: 1, color: 'rgba(29, 78, 216, 0.6)'
                }]),
                borderColor: 'rgba(255,255,255,0.4)',
                borderWidth: 1
            },
            data: bubbleData
        }]
    };
    bubbleChart.setOption(option, true);
}

function updateLineChart() {
    let years, co2Capita, ebt, forest;
    
    // 1. Get Selected Country Data
    if (currentCountry === 'World') {
        const worldRows = globalData
            .filter(d => d.Entity === 'World' && d.Year >= currentStartYear && d.Year <= currentEndYear)
            .sort((a,b) => a.Year - b.Year);

        years = worldRows.map(d => d.Year);
        co2Capita = worldRows.map(d => d.co2_capita || 0);
        ebt = worldRows.map(d => d.renewable_primary || 0);

        const forestByYear = {};
        years.forEach(y => { forestByYear[y] = 0; });
        globalData.forEach(d => {
            if (!isCountry(d)) return;
            if (d.Year < currentStartYear || d.Year > currentEndYear) return;
            if (d.forest_loss != null && forestByYear[d.Year] !== undefined) {
                forestByYear[d.Year] += d.forest_loss;
            }
        });
        forest = years.map(y => forestByYear[y] || 0);
    } else {
        const countryData = globalData.filter(d => d.Entity === currentCountry && d.Year >= currentStartYear && d.Year <= currentEndYear).sort((a,b) => a.Year - b.Year);
        years = countryData.map(d => d.Year);
        co2Capita = countryData.map(d => d.co2_capita || 0);
        ebt = countryData.map(d => d.renewable_primary || 0);
        forest = countryData.map(d => d.forest_loss || 0);
    }

    // 2. Get World Benchmark Data (only when currentCountry !== 'World')
    let worldYears = [], worldCo2Capita = [], worldEbt = [], worldForestAvg = [];
    if (currentCountry !== 'World') {
        const worldData = globalData.filter(d => d.Entity === 'World' && d.Year >= currentStartYear && d.Year <= currentEndYear).sort((a,b) => a.Year - b.Year);
        worldYears = worldData.map(d => d.Year);
        worldCo2Capita = worldData.map(d => d.co2_capita || 0);
        worldEbt = worldData.map(d => d.renewable_primary || 0);

        // Sum and average forest loss of all countries for benchmark
        const forestByYearWorld = {};
        const forestCountWorld = {};
        globalData.forEach(d => {
            if (!isCountry(d)) return;
            if (d.Year < currentStartYear || d.Year > currentEndYear) return;
            if (d.forest_loss != null) {
                if (!forestByYearWorld[d.Year]) {
                    forestByYearWorld[d.Year] = 0;
                    forestCountWorld[d.Year] = 0;
                }
                forestByYearWorld[d.Year] += d.forest_loss;
                forestCountWorld[d.Year]++;
            }
        });
        worldForestAvg = worldYears.map(y => (forestByYearWorld[y] && forestCountWorld[y]) ? forestByYearWorld[y] / forestCountWorld[y] : 0);
    }

    // 3. Configure Series and Axes depending on active Toggle View
    let option = {};
    const seriesList = [];
    const legendList = [];
    
    // Add dynamic vertical mark line if in play/animation mode
    const markLineOpt = isPlaying ? {
        symbol: ['none', 'none'],
        label: { show: false },
        lineStyle: { color: 'rgba(255, 255, 255, 0.4)', type: 'solid', width: 1.5 },
        data: [{ xAxis: currentStartYear.toString() }]
    } : null;

    if (currentLineView === 'ebt_co2') {
        // EBT and CO2 view
        legendList.push('EBT', 'CO2/Kapita');
        seriesList.push(
            {
                name: 'EBT',
                type: 'line',
                yAxisIndex: 0,
                smooth: true,
                data: ebt,
                symbol: 'circle',
                symbolSize: 4,
                itemStyle: { color: colors.green },
                lineStyle: { width: 3 },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(16, 185, 129, 0.25)' },
                        { offset: 1, color: 'rgba(16, 185, 129, 0.0)' }
                    ])
                },
                markLine: markLineOpt
            },
            {
                name: 'CO2/Kapita',
                type: 'line',
                yAxisIndex: 1,
                smooth: true,
                data: co2Capita,
                symbol: 'circle',
                symbolSize: 4,
                lineStyle: { width: 3 },
                itemStyle: { color: colors.red }
            }
        );

        // Append dashed global benchmark lines
        if (currentCountry !== 'World') {
            legendList.push({
                name: 'Rerata Dunia',
                itemStyle: { color: colors.textMuted }
            });
            seriesList.push(
                {
                    name: 'Rerata Dunia',
                    type: 'line',
                    yAxisIndex: 0,
                    smooth: true,
                    data: worldEbt,
                    symbol: 'none',
                    lineStyle: { type: 'dashed', width: 1.5, opacity: 0.6, color: colors.green },
                    itemStyle: { color: colors.green }
                },
                {
                    name: 'Rerata Dunia',
                    type: 'line',
                    yAxisIndex: 1,
                    smooth: true,
                    data: worldCo2Capita,
                    symbol: 'none',
                    lineStyle: { type: 'dashed', width: 1.5, opacity: 0.6, color: colors.red },
                    itemStyle: { color: colors.red }
                }
            );
        }

        option = {
            tooltip: { 
                ...tooltipStyle, 
                trigger: 'axis',
                formatter: function(params) {
                    let s = `<strong>${params[0].axisValue}</strong><br/>`;
                    params.forEach(p => {
                        const v = p.value;
                        if (v == null || isNaN(v)) return;
                        // Even seriesIndex (0, 2) is EBT, Odd seriesIndex (1, 3) is CO2
                        if (p.seriesIndex % 2 === 1) {
                            const displayName = p.seriesName === 'Rerata Dunia' ? 'Rerata Dunia (CO₂)' : p.seriesName;
                            s += `${p.marker} ${displayName}: <strong>${v.toFixed(2)} tCO₂/kapita</strong><br/>`;
                        } else {
                            const displayName = p.seriesName === 'Rerata Dunia' ? 'Rerata Dunia (EBT)' : p.seriesName;
                            s += `${p.marker} ${displayName}: <strong>${v.toFixed(1)}%</strong><br/>`;
                        }
                    });
                    return s;
                }
            },
            legend: {
                data: legendList,
                textStyle: { fontSize: 8.5, color: colors.textMuted },
                top: 0,
                itemWidth: 12,
                itemHeight: 8,
                itemGap: 8
            },
            grid: { left: '3%', right: '3%', bottom: '5%', top: '22%', containLabel: true },
            xAxis: {
                type: 'category',
                data: years.map(String),
                axisLabel: { color: colors.textMuted },
                axisLine: { lineStyle: { color: colors.gridLine } }
            },
            yAxis: [
                {
                    type: 'value',
                    name: 'EBT (%)',
                    nameTextStyle: { color: colors.green, fontSize: 9 },
                    splitLine: { lineStyle: { color: colors.gridLine } },
                    axisLabel: { color: colors.green, fontSize: 9, formatter: v => v.toFixed(0) }
                },
                {
                    type: 'value',
                    name: 'CO2/Kapita',
                    nameTextStyle: { color: colors.red, fontSize: 9 },
                    position: 'right',
                    splitLine: { show: false },
                    axisLabel: { color: colors.red, fontSize: 9, formatter: v => v.toFixed(1) }
                }
            ],
            series: seriesList
        };
    } else {
        // Forest loss view
        legendList.push('Hutan Hilang');
        seriesList.push({
            name: 'Hutan Hilang',
            type: 'line',
            smooth: true,
            data: forest,
            symbol: 'circle',
            symbolSize: 4,
            itemStyle: { color: colors.yellow },
            lineStyle: { width: 3 },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(234, 179, 8, 0.25)' },
                    { offset: 1, color: 'rgba(234, 179, 8, 0.0)' }
                ])
            },
            markLine: markLineOpt
        });

        if (currentCountry !== 'World') {
            legendList.push({
                name: 'Hutan Hilang (Rerata Dunia)',
                itemStyle: { color: colors.textMuted }
            });
            seriesList.push({
                name: 'Hutan Hilang (Rerata Dunia)',
                type: 'line',
                smooth: true,
                data: worldForestAvg,
                symbol: 'none',
                lineStyle: { type: 'dashed', width: 1.5, opacity: 0.5, color: colors.yellow },
                itemStyle: { color: colors.yellow }
            });
        }

        option = {
            tooltip: { 
                ...tooltipStyle, 
                trigger: 'axis',
                formatter: function(params) {
                    let s = `<strong>${params[0].axisValue}</strong><br/>`;
                    params.forEach(p => {
                        const v = p.value;
                        if (v == null || isNaN(v)) return;
                        const valStr = v >= 1000 ? (v/1000).toFixed(2) + ' Ribu ha' : v.toFixed(0) + ' ha';
                        s += `${p.marker} ${p.seriesName}: <strong>${valStr}</strong><br/>`;
                    });
                    return s;
                }
            },
            legend: {
                data: legendList,
                textStyle: { fontSize: 8.5, color: colors.textMuted },
                top: 0,
                itemWidth: 12,
                itemHeight: 8,
                itemGap: 8
            },
            grid: { left: '3%', right: '3%', bottom: '5%', top: '22%', containLabel: true },
            xAxis: {
                type: 'category',
                data: years.map(String),
                axisLabel: { color: colors.textMuted },
                axisLine: { lineStyle: { color: colors.gridLine } }
            },
            yAxis: {
                type: 'value',
                name: 'Luas Hutan (ha)',
                nameTextStyle: { color: colors.yellow, fontSize: 9 },
                splitLine: { lineStyle: { color: colors.gridLine } },
                axisLabel: { 
                    color: colors.yellow, 
                    fontSize: 9, 
                    formatter: v => v >= 1000000 ? (v/1000000).toFixed(1) + 'M' : v >= 1000 ? (v/1000).toFixed(0) + 'K' : v.toFixed(0)
                }
            },
            series: seriesList
        };
    }
    
    lineChart.setOption(option, true);
}

function updatePieChart(snapshotData) {
    let ren = 0;
    let nonRen = 0;
    
    if (currentCountry === 'World') {
        let wCount = 0;
        globalData.forEach(d => {
            if(d.Entity === 'World' && d.Year >= currentStartYear && d.Year <= currentEndYear) {
                if(d.renewable_elec != null) ren += d.renewable_elec;
                if(d.non_renewable_elec != null) nonRen += d.non_renewable_elec;
                wCount++;
            }
        });
        if(wCount) {
            ren = ren / wCount;
            nonRen = nonRen / wCount;
        }
    } else {
        const row = snapshotData.find(d => d.Entity === currentCountry);
        if (row) {
            ren = row.renewable_elec || 0;
            nonRen = row.non_renewable_elec || 0;
        }
    }

    // Calculate detailed EBT sources
    let hydro = 0, solar = 0, wind = 0, bio = 0, other = 0;
    let wCount = 0;
    globalData.forEach(d => {
        if(d.Entity === (currentCountry === 'World' ? 'World' : currentCountry) && d.Year >= currentStartYear && d.Year <= currentEndYear) {
            if(d.Hydropower != null) hydro += d.Hydropower;
            if(d.Solar != null) solar += d.Solar;
            if(d.Wind != null) wind += d.Wind;
            if(d.Bioenergy != null) bio += d.Bioenergy;
            if(d.other_renewables != null) other += d.other_renewables;
            wCount++;
        }
    });
    if(wCount) {
        hydro = hydro / wCount;
        solar = solar / wCount;
        wind = wind / wCount;
        bio = bio / wCount;
        other = other / wCount;
    }
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: function(params) {
                if (params.name === 'Terbarukan') {
                    let s = `<strong>${params.name}</strong>: ${params.value}% (${params.percent}%)<br/>`;
                    s += `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:9px;height:9px;background-color:#10b981;"></span> Rincian Sumber Listrik EBT:<br/>`;
                    
                    const details = [
                        { name: 'PLTA (Air)', val: hydro },
                        { name: 'PLTS (Surya)', val: solar },
                        { name: 'PLTB (Angin)', val: wind },
                        { name: 'Bioenergi', val: bio },
                        { name: 'EBT Lainnya', val: other }
                    ];
                    
                    let added = 0;
                    details.forEach(d => {
                        const formatted = d.val.toFixed(2);
                        if (formatted !== '0.00' && d.val > 0) {
                            s += ` &nbsp;&bull;&nbsp; ${d.name}: <strong>${formatted}%</strong><br/>`;
                            added++;
                        }
                    });
                    
                    if (added > 0 && s.endsWith('<br/>')) {
                        s = s.substring(0, s.length - 5);
                    }
                    return s;
                } else {
                    return `<strong>${params.name}</strong>: ${params.value}% (${params.percent}%)`;
                }
            },
            ...tooltipStyle
        },
        legend: {
            bottom: '0%',
            left: 'center',
            textStyle: { color: colors.textMuted },
            itemWidth: 10,
            itemHeight: 10
        },
        series: [
            {
                name: 'Sumber Listrik',
                type: 'pie',
                radius: ['45%', '70%'],
                center: ['50%', '45%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 5,
                    borderColor: 'rgba(30, 41, 59, 1)',
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 16,
                        fontWeight: 'bold',
                        color: colors.text,
                        formatter: '{d}%'
                    }
                },
                labelLine: {
                    show: false
                },
                data: [
                    { value: ren.toFixed(2), name: 'Terbarukan', itemStyle: { color: colors.green } },
                    { value: nonRen.toFixed(2), name: 'Fosil & Nuklir', itemStyle: { color: colors.orange } }
                ]
            }
        ]
    };
    pieChart.setOption(option, true);
}

function updateTop5Chart(snapshotData) {
    const validData = snapshotData.filter(d => d.renewable_primary != null);
    
    // Sort descending
    validData.sort((a,b) => b.renewable_primary - a.renewable_primary);
    const top5 = validData.slice(0, 5);
    
    // Reverse for ECharts (renders from bottom up)
    top5.reverse();

    const option = {
        tooltip: { ...tooltipStyle, trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '3%', bottom: '5%', top: '10%', containLabel: true },
        xAxis: {
            type: 'value',
            splitLine: { lineStyle: { color: colors.gridLine } },
            axisLabel: { color: colors.textMuted },
            max: 100
        },
        yAxis: {
            type: 'category',
            data: top5.map(d => d.Entity),
            axisLabel: { color: colors.text, fontWeight: 500, fontFamily: commonFont, width: 90, overflow: 'truncate' },
            axisLine: { show: false },
            axisTick: { show: false }
        },
        series: [
            {
                name: 'Share EBT (%)',
                type: 'bar',
                data: top5.map((d, index) => {
                    const greenShades = [
                        '#065f46', // 5th place (darkest)
                        '#047857', // 4th place
                        '#059669', // 3rd place
                        '#10b981', // 2nd place
                        '#34d399'  // 1st place (brightest green)
                    ];
                    
                    const isAnyInTop5 = currentCountry !== 'World' && top5.some(item => item.Entity === currentCountry);
                    
                    let barColor;
                    let barOpacity;
                    if (isAnyInTop5) {
                        if (d.Entity === currentCountry) {
                            barColor = greenShades[index];
                            barOpacity = 1;
                        } else {
                            barColor = '#475569'; // gray
                            barOpacity = 0.55;
                        }
                    } else {
                        barColor = greenShades[index];
                        barOpacity = (currentCountry === 'World') ? 1 : 0.4;
                    }
                    
                    return {
                        value: Number(d.renewable_primary.toFixed(2)),
                        itemStyle: {
                            color: barColor,
                            opacity: barOpacity,
                            borderRadius: [0, 4, 4, 0]
                        }
                    };
                }),
                emphasis: {
                    itemStyle: {
                        opacity: 1
                    }
                },
                label: {
                    show: true,
                    position: 'right',
                    color: colors.textMuted,
                    formatter: '{c}%'
                },
                barWidth: '50%'
            }
        ]
    };
    top5Chart.setOption(option, true);
}

function setupTabNavigation() {
    const tab1 = document.getElementById('tab-page1');
    const tab2 = document.getElementById('tab-page2');
    const page1 = document.getElementById('page1');
    const page2 = document.getElementById('page2');
    
    if (!tab1 || !tab2 || !page1 || !page2) return;
    
    tab1.addEventListener('click', () => {
        tab1.classList.add('active');
        tab2.classList.remove('active');
        page1.classList.add('active');
        page2.classList.remove('active');
        
        // Trigger resize on page 1 charts
        setTimeout(() => {
            if(mapChart) mapChart.resize();
            if(bubbleChart) bubbleChart.resize();
            if(lineChart) lineChart.resize();
            if(pieChart) pieChart.resize();
            if(top5Chart) top5Chart.resize();
        }, 50);
    });
    
    tab2.addEventListener('click', () => {
        tab2.classList.add('active');
        tab1.classList.remove('active');
        page2.classList.add('active');
        page1.classList.remove('active');
        
        // Trigger resize on page 2 charts
        setTimeout(() => {
            if(stackedSourceChart) stackedSourceChart.resize();
            if(cumulativeBarChart) cumulativeBarChart.resize();
            if(landUseForestChart) landUseForestChart.resize();
        }, 50);
    });
}

function updatePage2Charts() {
    updateStackedSourceChart();
    updateCumulativeBarChart();
    updateLandUseForestChart();
}

function updateStackedSourceChart() {
    if (!stackedSourceChart) return;
    
    const years = [];
    const coal = [];
    const oil = [];
    const gas = [];
    const flaring = [];
    const cement = [];
    const otherInd = [];
    const landUse = [];
    
    for (let y = currentStartYear; y <= currentEndYear; y++) {
        years.push(y);
        const row = globalData.find(d => d.Entity === (currentCountry === 'World' ? 'World' : currentCountry) && d.Year === y);
        if (row) {
            coal.push(row.co2_capita_coal || 0);
            oil.push(row.co2_capita_oil || 0);
            gas.push(row.co2_capita_gas || 0);
            flaring.push(row.co2_capita_flaring || 0);
            cement.push(row.co2_capita_cement || 0);
            otherInd.push(row.co2_capita_other_industry || 0);
            
            let landUseVal = 0;
            if (row.co2_fossil && row.co2_land_use && row.co2_capita) {
                landUseVal = (row.co2_land_use / row.co2_fossil) * row.co2_capita;
            }
            landUse.push(landUseVal);
        } else {
            coal.push(0);
            oil.push(0);
            gas.push(0);
            flaring.push(0);
            cement.push(0);
            otherInd.push(0);
            landUse.push(0);
        }
    }
    
    const option = {
        tooltip: {
            ...tooltipStyle,
            trigger: 'axis',
            formatter: function(params) {
                let s = `<strong>${params[0].axisValue}</strong><br/>`;
                let sum = 0;
                params.forEach(p => {
                    const v = p.value;
                    sum += v;
                    s += `${p.marker} ${p.seriesName}: <strong>${v.toFixed(3)} tCO₂/kapita</strong><br/>`;
                });
                s += `Total: <strong>${sum.toFixed(3)} tCO₂/kapita</strong>`;
                return s;
            }
        },
        legend: {
            data: ['Batu Bara', 'Minyak Bumi', 'Gas Alam', 'Alih Fungsi Lahan', 'Semen', 'Flaring', 'Industri Lainnya'],
            textStyle: { fontSize: 8.5, color: colors.textMuted },
            bottom: '0%',
            itemWidth: 10,
            itemHeight: 10
        },
        grid: { left: '3%', right: '3%', bottom: '22%', top: '10%', containLabel: true },
        xAxis: {
            type: 'category',
            data: years.map(String),
            axisLabel: { color: colors.textMuted },
            axisLine: { lineStyle: { color: colors.gridLine } }
        },
        yAxis: {
            type: 'value',
            name: 'tCO2/kapita',
            nameTextStyle: { color: colors.textMuted, fontSize: 9 },
            splitLine: { lineStyle: { color: colors.gridLine } },
            axisLabel: { color: colors.textMuted }
        },
        series: [
            {
                name: 'Batu Bara',
                type: 'line',
                stack: 'total',
                areaStyle: {},
                emphasis: { focus: 'series' },
                data: coal,
                itemStyle: { color: '#334155' }
            },
            {
                name: 'Minyak Bumi',
                type: 'line',
                stack: 'total',
                areaStyle: {},
                emphasis: { focus: 'series' },
                data: oil,
                itemStyle: { color: '#b45309' }
            },
            {
                name: 'Gas Alam',
                type: 'line',
                stack: 'total',
                areaStyle: {},
                emphasis: { focus: 'series' },
                data: gas,
                itemStyle: { color: colors.indigo }
            },
            {
                name: 'Alih Fungsi Lahan',
                type: 'line',
                stack: 'total',
                areaStyle: {},
                emphasis: { focus: 'series' },
                data: landUse,
                itemStyle: { color: colors.green }
            },
            {
                name: 'Semen',
                type: 'line',
                stack: 'total',
                areaStyle: {},
                emphasis: { focus: 'series' },
                data: cement,
                itemStyle: { color: '#64748b' }
            },
            {
                name: 'Flaring',
                type: 'line',
                stack: 'total',
                areaStyle: {},
                emphasis: { focus: 'series' },
                data: flaring,
                itemStyle: { color: '#f59e0b' }
            },
            {
                name: 'Industri Lainnya',
                type: 'line',
                stack: 'total',
                areaStyle: {},
                emphasis: { focus: 'series' },
                data: otherInd,
                itemStyle: { color: '#14b8a6' }
            }
        ]
    };
    
    stackedSourceChart.setOption(option, true);
}

function updateCumulativeBarChart() {
    if (!cumulativeBarChart) return;
    
    // Top 5 historical cumulative emitters in 2022
    const topEmitters = ['United States', 'China', 'Russia', 'Germany', 'United Kingdom'];
    
    // Build the list of countries to compare
    const entitiesToCompare = [...topEmitters];
    
    const isAnySelected = currentCountry !== 'World';
    
    // If a country is selected and it is not in the top 5, append it as a 6th country
    if (isAnySelected && !topEmitters.includes(currentCountry)) {
        entitiesToCompare.push(currentCountry);
    }
    
    const compareData = entitiesToCompare.map(entity => {
        const val = getCumulativeEmissions(entity, currentEndYear);
        const valGt = val / 1000000000;
        return {
            name: entity,
            value: valGt
        };
    });
    
    compareData.sort((a, b) => a.value - b.value);
    
    const option = {
        tooltip: {
            ...tooltipStyle,
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: function(params) {
                const p = params[0];
                return `<strong>${p.name}</strong><br/>Emisi Kumulatif: <strong>${p.value.toFixed(2)} Gt CO₂</strong>`;
            }
        },
        grid: { left: '3%', right: '3%', bottom: '5%', top: '5%', containLabel: true },
        xAxis: {
            type: 'value',
            name: 'Gt CO2',
            nameTextStyle: { color: colors.textMuted, fontSize: 9 },
            splitLine: { lineStyle: { color: colors.gridLine } },
            axisLabel: { color: colors.textMuted }
        },
        yAxis: {
            type: 'category',
            data: compareData.map(d => d.name),
            axisLabel: { color: colors.text, fontWeight: 500, width: 80, overflow: 'truncate' },
            axisLine: { show: false },
            axisTick: { show: false }
        },
        series: [
            {
                name: 'Emisi Kumulatif',
                type: 'bar',
                data: compareData.map((d, index) => {
                    const redShades = [
                        '#f56565', // lowest cumulative CO2 -> brightest red
                        '#e53e3e',
                        '#c53030',
                        '#b91c1c',
                        '#991b1b',
                        '#7f1d1d'  // highest cumulative CO2 -> darkest red
                    ];
                    // Map the index to the color range dynamically based on array length
                    const shadeIndex = Math.round((index / (compareData.length - 1)) * 4);
                    const baseColor = redShades[shadeIndex];
                    
                    let barColor;
                    let barOpacity;
                    if (isAnySelected) {
                        if (d.name === currentCountry) {
                            barColor = baseColor;
                            barOpacity = 1;
                        } else {
                            barColor = '#475569'; // gray
                            barOpacity = 0.55;
                        }
                    } else {
                        barColor = baseColor;
                        barOpacity = 1;
                    }
                    
                    return {
                        value: Number(d.value.toFixed(2)),
                        itemStyle: {
                            color: barColor,
                            opacity: barOpacity,
                            borderRadius: [0, 4, 4, 0]
                        }
                    };
                }),
                emphasis: {
                    itemStyle: {
                        opacity: 1
                    }
                },
                label: {
                    show: true,
                    position: 'right',
                    color: colors.textMuted,
                    formatter: '{c} Gt'
                },
                barWidth: compareData.length > 5 ? '45%' : '50%'
            }
        ]
    };
    
    cumulativeBarChart.setOption(option, true);
}

function updateLandUseForestChart() {
    if (!landUseForestChart) return;
    
    const lineYears = [];
    const forestLossData = [];
    const landUseData = [];
    
    for (let y = currentStartYear; y <= currentEndYear; y++) {
        lineYears.push(y);
        const row = globalData.find(d => d.Entity === (currentCountry === 'World' ? 'World' : currentCountry) && d.Year === y);
        
        let fLoss = 0;
        if (currentCountry === 'World') {
            globalData.forEach(d => {
                if (isCountry(d) && d.Year === y && d.forest_loss != null) {
                    fLoss += d.forest_loss;
                }
            });
        } else {
            if (row && row.forest_loss != null) {
                fLoss = row.forest_loss;
            }
        }
        forestLossData.push(fLoss);
        
        let luCO2 = 0;
        if (row && row.co2_land_use != null) {
            luCO2 = row.co2_land_use / 1000000; // convert to Mt
        }
        landUseData.push(luCO2);
    }
    
    const markLineOpt = isPlaying ? {
        symbol: ['none', 'none'],
        label: { show: false },
        lineStyle: { color: 'rgba(255, 255, 255, 0.4)', type: 'solid', width: 1.5 },
        data: [{ xAxis: currentStartYear.toString() }]
    } : null;
    
    const option = {
        tooltip: {
            ...tooltipStyle,
            trigger: 'axis',
            formatter: function(params) {
                let s = `<strong>${params[0].axisValue}</strong><br/>`;
                params.forEach(p => {
                    const v = p.value;
                    if (p.seriesName.includes('Hutan')) {
                        const valStr = v >= 1000 ? (v/1000).toFixed(2) + ' Ribu ha' : v.toFixed(0) + ' ha';
                        s += `${p.marker} ${p.seriesName}: <strong>${valStr}</strong><br/>`;
                    } else {
                        s += `${p.marker} ${p.seriesName}: <strong>${v.toFixed(2)} Mt CO₂</strong><br/>`;
                    }
                });
                return s;
            }
        },
        legend: {
            data: ['Kehilangan Hutan', 'Emisi Alih Fungsi Lahan'],
            textStyle: { fontSize: 8.5, color: colors.textMuted },
            top: 0
        },
        grid: { left: '3%', right: '3%', bottom: '5%', top: '20%', containLabel: true },
        xAxis: {
            type: 'category',
            data: lineYears.map(String),
            axisLabel: { color: colors.textMuted },
            axisLine: { lineStyle: { color: colors.gridLine } }
        },
        yAxis: [
            {
                type: 'value',
                name: 'Luas Hutan (ha)',
                nameTextStyle: { color: colors.yellow, fontSize: 9 },
                splitLine: { lineStyle: { color: colors.gridLine } },
                axisLabel: { 
                    color: colors.yellow, 
                    fontSize: 9, 
                    formatter: v => v >= 1000000 ? (v/1000000).toFixed(1) + 'M' : v >= 1000 ? (v/1000).toFixed(0) + 'K' : v.toFixed(0)
                }
            },
            {
                type: 'value',
                name: 'Emisi Lahan (Mt CO2)',
                nameTextStyle: { color: colors.red, fontSize: 9 },
                position: 'right',
                splitLine: { show: false },
                axisLabel: { color: colors.red, fontSize: 9 }
            }
        ],
        series: [
            {
                name: 'Kehilangan Hutan',
                type: 'line',
                yAxisIndex: 0,
                smooth: true,
                data: forestLossData,
                symbol: 'circle',
                symbolSize: 4,
                itemStyle: { color: colors.yellow },
                lineStyle: { width: 3 },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(234, 179, 8, 0.25)' },
                        { offset: 1, color: 'rgba(234, 179, 8, 0.0)' }
                    ])
                },
                markLine: markLineOpt
            },
            {
                name: 'Emisi Alih Fungsi Lahan',
                type: 'line',
                yAxisIndex: 1,
                smooth: true,
                data: landUseData,
                symbol: 'circle',
                symbolSize: 4,
                itemStyle: { color: colors.red },
                lineStyle: { width: 3 },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(239, 68, 68, 0.2)' },
                        { offset: 1, color: 'rgba(239, 68, 68, 0.0)' }
                    ])
                }
            }
        ]
    };
    
    landUseForestChart.setOption(option, true);
}
