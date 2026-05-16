// Chart Instances
let mapChart, bubbleChart, lineChart, pieChart, top5Chart;

// Theme Colors
const colors = {
    blue: '#3b82f6',
    green: '#10b981',
    orange: '#f59e0b',
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

// Initialize elements
const yearSlider = document.getElementById('year-slider');
const yearStartSpan = document.getElementById('year-start');
const yearEndSpan = document.getElementById('year-end');
const countrySelect = document.getElementById('country-select');

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
            populateFilters();
            updateDashboard();
        })
        .catch(err => {
            console.error("Map loading error:", err);
            document.getElementById('map-chart').innerHTML = '<div class="loading-overlay">Gagal memuat peta.</div>';
            initCharts();
            populateFilters();
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

    window.addEventListener('resize', () => {
        if(mapChart) mapChart.resize();
        bubbleChart.resize();
        lineChart.resize();
        if(pieChart) pieChart.resize();
        top5Chart.resize();
    });
}

// Helpers
function isCountry(row) {
    return row.Code && row.Code.length === 3 && !row.Code.startsWith('OWID');
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

        yearSlider.noUiSlider.on('change', function () {
            updateDashboard();
        });
    }

    const countries = [...new Set(globalData.filter(d => isCountry(d)).map(d => d.Entity))].sort();
    countrySelect.innerHTML = '<option value="World">Seluruh Dunia (Global)</option>';
    countries.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        countrySelect.appendChild(opt);
    });

    countrySelect.addEventListener('change', (e) => {
        currentCountry = e.target.value;
        updateDashboard();
    });
}

// Data Aggregation for Snapshot Charts
function getAggregatedData() {
    const agg = {};
    globalData.forEach(d => {
        if(d.Year >= currentStartYear && d.Year <= currentEndYear && isCountry(d)) {
            if(!agg[d.Entity]) {
                agg[d.Entity] = { Entity: d.Entity, Code: d.Code, count: 0, co2_total: 0, co2_capita: 0, renewable_primary: 0, renewable_elec: 0, non_renewable_elec: 0, 
                                  has_total: false, has_capita: false, has_renew_prim: false, has_renew_elec: false, has_non_renew_elec: false };
            }
            agg[d.Entity].count++;
            if(d.co2_total != null) { agg[d.Entity].co2_total += d.co2_total; agg[d.Entity].has_total = true; }
            if(d.co2_capita != null) { agg[d.Entity].co2_capita += d.co2_capita; agg[d.Entity].has_capita = true; }
            if(d.renewable_primary != null) { agg[d.Entity].renewable_primary += d.renewable_primary; agg[d.Entity].has_renew_prim = true; }
            if(d.renewable_elec != null) { agg[d.Entity].renewable_elec += d.renewable_elec; agg[d.Entity].has_renew_elec = true; }
            if(d.non_renewable_elec != null) { agg[d.Entity].non_renewable_elec += d.non_renewable_elec; agg[d.Entity].has_non_renew_elec = true; }
        }
    });
    
    return Object.values(agg).map(d => ({
        Entity: d.Entity,
        co2_total: d.has_total ? d.co2_total / d.count : null, // avg across range
        co2_capita: d.has_capita ? d.co2_capita / d.count : null,
        renewable_primary: d.has_renew_prim ? d.renewable_primary / d.count : null,
        renewable_elec: d.has_renew_elec ? d.renewable_elec / d.count : null,
        non_renewable_elec: d.has_non_renew_elec ? d.non_renewable_elec / d.count : null
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
}

function updateKPIs(snapshotData) {
    let co2 = 0;
    let ebt = 0;
    let ebtCount = 0;

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
    else if(co2 >= 1000) { co2Display = co2 / 1000; co2Unit = 'Ribuan tCO2'; }

    let forestUnit = 'ha';
    let forestDisplay = forest;
    if(forest >= 1000000) { forestDisplay = forest / 1000000; forestUnit = 'Mha'; }
    else if(forest >= 1000) { forestDisplay = forest / 1000; forestUnit = 'Ribuan ha'; }

    document.getElementById('kpi-co2').innerHTML = `${co2Display.toFixed(2)} <span class="unit">${co2Unit}</span>`;
    document.getElementById('kpi-ebt').innerHTML = `${ebt.toFixed(1)} <span class="unit">%</span>`;
    document.getElementById('kpi-forest').innerHTML = `${forestDisplay.toFixed(2)} <span class="unit">${forestUnit}</span>`;
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
    const mapData = snapshotData
        .filter(d => d.co2_capita != null)
        .map(d => {
            const isSelected = currentCountry === 'World' || d.Entity === currentCountry;
            return {
                name: d.Entity,
                value: isSelected ? d.co2_capita : null
            };
        });

    const option = {
        tooltip: {
            ...tooltipStyle,
            trigger: 'item',
            formatter: function(params) {
                if(isNaN(params.value)) return params.name;
                return `${params.name}<br/>${params.value.toFixed(2)} tCO2/kapita`;
            }
        },
        visualMap: {
            left: 'left',
            bottom: 'bottom',
            min: 0,
            max: 20,
            itemWidth: 10,
            itemHeight: 70,
            text: ['Tinggi', 'Rendah'],
            calculable: false,
            inRange: {
                color: ['#fef0d9', '#fdcc8a', '#fc8d59', '#e34a33', '#b30000']
            },
            textStyle: { color: colors.textMuted },
            backgroundColor: 'transparent',
            padding: 5,
            borderRadius: 8
        },
        series: [
            {
                name: 'Emisi CO2',
                type: 'map',
                map: 'world',
                nameMap: {
                    // ECharts geo name -> Dataset entity name
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
        grid: { left: '15%', right: '8%', bottom: '15%', top: '15%' },
        xAxis: {
            type: 'value',
            name: 'Energi Terbarukan (%)',
            nameLocation: 'middle',
            nameGap: 30,
            splitLine: { lineStyle: { color: colors.gridLine } },
            axisLabel: { color: colors.textMuted },
            nameTextStyle: { color: colors.textMuted }
        },
        yAxis: {
            type: 'value',
            name: 'Emisi CO2/Kapita',
            nameTextStyle: { color: colors.textMuted, padding: [0, 0, 0, 30] },
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

    if (currentCountry === 'World') {
        // CO2 and EBT: read from 'World' entity rows (as before)
        const worldRows = globalData
            .filter(d => d.Entity === 'World' && d.Year >= currentStartYear && d.Year <= currentEndYear)
            .sort((a,b) => a.Year - b.Year);

        years = worldRows.map(d => d.Year);
        co2Capita = worldRows.map(d => d.co2_capita || 0);
        ebt = worldRows.map(d => d.renewable_primary || 0);

        // Forest: sum all countries per year
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

    const option = {
        tooltip: { 
            ...tooltipStyle, 
            trigger: 'axis',
            formatter: function(params) {
                let s = `<strong>${params[0].axisValue}</strong><br/>`;
                params.forEach(p => {
                    const v = p.value;
                    if (v == null || isNaN(v)) return;
                    if (p.seriesName === 'CO2/Kapita') {
                        s += `${p.marker} CO2/Kapita: ${v.toFixed(2)} tCO2/org<br/>`;
                    } else if (p.seriesName === 'EBT') {
                        s += `${p.marker} EBT: ${v.toFixed(2)}%<br/>`;
                    } else if (p.seriesName === 'Hutan') {
                        const fDisp = v >= 1000 ? (v/1000).toFixed(2) + ' Ribu ha' : v.toFixed(2) + ' ha';
                        s += `${p.marker} Kehilangan Hutan: ${fDisp}<br/>`;
                    }
                });
                return s;
            }
        },
        legend: {
            data: ['EBT', 'CO2/Kapita'],
            textStyle: { fontSize: 10, color: colors.textMuted },
            top: 0,
            itemWidth: 12,
            itemHeight: 8,
            itemGap: 8
        },
        grid: { left: '14%', right: '16%', bottom: '15%', top: '30%' },
        xAxis: {
            type: 'category',
            data: years,
            axisLabel: { color: colors.textMuted },
            axisLine: { lineStyle: { color: colors.gridLine } }
        },
        yAxis: [
            {
                type: 'value',
                name: 'EBT (%)',
                nameTextStyle: { color: colors.green, fontSize: 9 },
                splitLine: { lineStyle: { color: colors.gridLine } },
                axisLabel: { color: colors.green, fontSize: 9, formatter: v => v.toFixed(1) }
            },
            {
                type: 'value',
                name: 'CO2 (tCO2)',
                nameTextStyle: { color: colors.red, fontSize: 9 },
                position: 'right',
                offset: 0,
                splitLine: { show: false },
                axisLabel: { color: colors.red, fontSize: 9, formatter: v => v.toFixed(1) }
            }
        ],
        series: [
            {
                name: 'EBT',
                type: 'line',
                yAxisIndex: 0,
                smooth: true,
                data: ebt,
                itemStyle: { color: colors.green },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
                        { offset: 1, color: 'rgba(16, 185, 129, 0.0)' }
                    ])
                }
            },
            {
                name: 'CO2/Kapita',
                type: 'line',
                yAxisIndex: 1,
                smooth: true,
                data: co2Capita,
                itemStyle: { color: colors.red }
            },
        ]
    };
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
    
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}% ({d}%)',
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
        grid: { left: '35%', right: '10%', bottom: '15%', top: '10%' },
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
                data: top5.map(d => {
                    const isSelected = currentCountry === 'World' || d.Entity === currentCountry;
                    return {
                        value: Number(d.renewable_primary.toFixed(2)),
                        itemStyle: isSelected ? {
                            color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                                { offset: 0, color: colors.teal },
                                { offset: 1, color: colors.blue }
                            ]),
                            borderRadius: [0, 4, 4, 0]
                        } : {
                            color: '#334155',
                            borderRadius: [0, 4, 4, 0]
                        }
                    };
                }),
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
