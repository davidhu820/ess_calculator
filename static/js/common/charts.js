/**
 * 通用图表绘制模块
 * 提供各种图表创建和更新功能
 */

const ChartUtils = {
    /**
     * 创建柱状图
     * @param {string} elementId - 图表容器元素ID
     * @param {Object} data - 图表数据
     * @param {Array} data.x - X轴数据
     * @param {Array} data.y - Y轴数据
     * @param {Object} options - 图表选项
     * @returns {Object} Plotly图表对象
     */
    createBarChart: function(elementId, data, options = {}) {
        const defaultOptions = {
            title: '',
            xAxisTitle: '',
            yAxisTitle: '',
            barColor: 'rgb(31, 119, 180)',
            orientation: 'v',  // 'v'垂直柱状图，'h'水平柱状图
            textinfo: 'none',  // 'none', 'value', 'percent'
            hoverinfo: 'y+name'
        };
        
        const chartOptions = { ...defaultOptions, ...options };
        
        const trace = {
            x: data.x,
            y: data.y,
            type: 'bar',
            orientation: chartOptions.orientation,
            marker: {
                color: chartOptions.barColor
            },
            text: chartOptions.textinfo === 'value' ? data.y.map(v => v.toFixed(1)) : null,
            textposition: 'auto',
            hoverinfo: chartOptions.hoverinfo,
            name: chartOptions.name || ''
        };
        
        const layout = {
            title: chartOptions.title,
            xaxis: {
                title: chartOptions.xAxisTitle
            },
            yaxis: {
                title: chartOptions.yAxisTitle
            },
            margin: {
                l: 50,
                r: 50,
                t: 50,
                b: 100
            }
        };
        
        Plotly.newPlot(elementId, [trace], layout);
        return document.getElementById(elementId);
    },
    
    /**
     * 创建折线图
     * @param {string} elementId - 图表容器元素ID
     * @param {Object} data - 图表数据
     * @param {Array} data.x - X轴数据
     * @param {Array} data.y - Y轴数据
     * @param {Object} options - 图表选项
     * @returns {Object} Plotly图表对象
     */
    createLineChart: function(elementId, data, options = {}) {
        const defaultOptions = {
            title: '',
            xAxisTitle: '',
            yAxisTitle: '',
            lineColor: 'rgb(31, 119, 180)',
            lineWidth: 2,
            mode: 'lines+markers', // 'lines', 'markers', 'lines+markers'
            markerSize: 6,
            fill: 'none'  // 'none', 'tozeroy', 'tozerox'
        };
        
        const chartOptions = { ...defaultOptions, ...options };
        
        const trace = {
            x: data.x,
            y: data.y,
            type: 'scatter',
            mode: chartOptions.mode,
            marker: {
                color: chartOptions.lineColor,
                size: chartOptions.markerSize
            },
            line: {
                color: chartOptions.lineColor,
                width: chartOptions.lineWidth
            },
            fill: chartOptions.fill,
            name: chartOptions.name || ''
        };
        
        const layout = {
            title: chartOptions.title,
            xaxis: {
                title: chartOptions.xAxisTitle
            },
            yaxis: {
                title: chartOptions.yAxisTitle
            },
            margin: {
                l: 50,
                r: 50,
                t: 50,
                b: 100
            }
        };
        
        Plotly.newPlot(elementId, [trace], layout);
        return document.getElementById(elementId);
    },
    
    /**
     * 创建饼图
     * @param {string} elementId - 图表容器元素ID
     * @param {Object} data - 图表数据
     * @param {Array} data.labels - 标签数据
     * @param {Array} data.values - 值数据
     * @param {Object} options - 图表选项
     * @returns {Object} Plotly图表对象
     */
    createPieChart: function(elementId, data, options = {}) {
        const defaultOptions = {
            title: '',
            colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'],
            textinfo: 'label+percent',  // 'label', 'percent', 'label+percent'
            hole: 0,  // 0-1，设置为>0创建环形图
            showLegend: true
        };
        
        const chartOptions = { ...defaultOptions, ...options };
        
        const trace = {
            type: 'pie',
            labels: data.labels,
            values: data.values,
            textinfo: chartOptions.textinfo,
            marker: {
                colors: chartOptions.colors
            },
            hole: chartOptions.hole,
            hoverinfo: 'label+percent+value'
        };
        
        const layout = {
            title: chartOptions.title,
            showlegend: chartOptions.showLegend,
            legend: {
                orientation: 'h',
                xanchor: 'center',
                yanchor: 'bottom',
                x: 0.5,
                y: -0.2
            },
            margin: {
                l: 50,
                r: 50,
                t: 50,
                b: 100
            }
        };
        
        Plotly.newPlot(elementId, [trace], layout);
        return document.getElementById(elementId);
    },
    
    /**
     * 创建堆叠柱状图
     * @param {string} elementId - 图表容器元素ID
     * @param {Array} data - 图表数据数组，每个元素包含x, y和name
     * @param {Object} options - 图表选项
     * @returns {Object} Plotly图表对象
     */
    createStackedBarChart: function(elementId, data, options = {}) {
        const defaultOptions = {
            title: '',
            xAxisTitle: '',
            yAxisTitle: '',
            barmode: 'stack',  // 'stack', 'group'
            colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b']
        };
        
        const chartOptions = { ...defaultOptions, ...options };
        
        const traces = data.map((series, index) => {
            return {
                x: series.x,
                y: series.y,
                type: 'bar',
                name: series.name,
                marker: {
                    color: chartOptions.colors[index % chartOptions.colors.length]
                }
            };
        });
        
        const layout = {
            title: chartOptions.title,
            barmode: chartOptions.barmode,
            xaxis: {
                title: chartOptions.xAxisTitle
            },
            yaxis: {
                title: chartOptions.yAxisTitle
            },
            margin: {
                l: 50,
                r: 50,
                t: 50,
                b: 100
            },
            legend: {
                orientation: 'h',
                xanchor: 'center',
                x: 0.5,
                y: 1.1
            }
        };
        
        Plotly.newPlot(elementId, traces, layout);
        return document.getElementById(elementId);
    },
    
    /**
     * 创建瀑布图（用于现金流分析）
     * @param {string} elementId - 图表容器元素ID
     * @param {Object} data - 图表数据
     * @param {Array} data.years - 年份数据
     * @param {Array} data.values - 各年现金流数据
     * @param {Object} options - 图表选项
     * @returns {Object} Plotly图表对象
     */
    createWaterfallChart: function(elementId, data, options = {}) {
        const defaultOptions = {
            title: '现金流分析',
            positiveColor: 'rgb(0, 169, 80)',
            negativeColor: 'rgb(214, 39, 40)',
            initialColor: 'rgb(31, 119, 180)',
            showValues: true
        };
        
        const chartOptions = { ...defaultOptions, ...options };
        const { years, values } = data;
        
        // 创建瀑布图的各个柱子
        const colors = values.map((val, index) => {
            if (index === 0) return chartOptions.initialColor;  // 初始投资
            return val >= 0 ? chartOptions.positiveColor : chartOptions.negativeColor;
        });
        
        const text = chartOptions.showValues 
            ? values.map(val => `${val >= 0 ? '+' : ''}${val.toFixed(0)}`)
            : null;
        
        const trace = {
            type: 'waterfall',
            x: years,
            y: values,
            text: text,
            textposition: 'outside',
            connector: {
                line: {
                    color: 'rgb(63, 63, 63)'
                }
            },
            increasing: {
                marker: { color: chartOptions.positiveColor }
            },
            decreasing: {
                marker: { color: chartOptions.negativeColor }
            },
            marker: {
                color: colors
            }
        };
        
        const layout = {
            title: chartOptions.title,
            xaxis: {
                title: '年份',
                tickmode: 'array',
                ticktext: years.map(year => `第${year}年`),
                tickvals: years
            },
            yaxis: {
                title: '金额 (元)',
                zeroline: true,
                zerolinewidth: 2,
                zerolinecolor: 'black'
            },
            margin: {
                l: 50,
                r: 50,
                t: 50,
                b: 100
            },
            showlegend: false
        };
        
        // 如果Plotly没有原生支持瀑布图，使用模拟方式
        if (!Plotly.Waterfall) {
            this.createWaterfallChartAlternative(elementId, data, chartOptions);
            return document.getElementById(elementId);
        }
        
        Plotly.newPlot(elementId, [trace], layout);
        return document.getElementById(elementId);
    },
    
    /**
     * 使用普通柱状图模拟瀑布图（兼容性方案）
     * @private
     */
    createWaterfallChartAlternative: function(elementId, data, options) {
        const { years, values } = data;
        
        // 创建正值和负值的分开柱状图
        const positiveValues = values.map(val => Math.max(0, val));
        const negativeValues = values.map(val => Math.min(0, val));
        
        const positiveTrace = {
            type: 'bar',
            x: years,
            y: positiveValues,
            marker: {
                color: options.positiveColor
            },
            text: options.showValues 
                ? positiveValues.map(val => val > 0 ? `+${val.toFixed(0)}` : '')
                : null,
            textposition: 'outside',
            name: '正值'
        };
        
        const negativeTrace = {
            type: 'bar',
            x: years,
            y: negativeValues,
            marker: {
                color: options.negativeColor
            },
            text: options.showValues 
                ? negativeValues.map(val => val < 0 ? val.toFixed(0) : '')
                : null,
            textposition: 'outside',
            name: '负值'
        };
        
        const initialTrace = {
            type: 'bar',
            x: [years[0]],
            y: [values[0]],
            marker: {
                color: options.initialColor
            },
            text: options.showValues ? [values[0].toFixed(0)] : null,
            textposition: 'outside',
            name: '初始投资'
        };
        
        const layout = {
            title: options.title,
            barmode: 'relative',
            xaxis: {
                title: '年份',
                tickmode: 'array',
                ticktext: years.map(year => `第${year}年`),
                tickvals: years
            },
            yaxis: {
                title: '金额 (元)',
                zeroline: true,
                zerolinewidth: 2,
                zerolinecolor: 'black'
            },
            margin: {
                l: 50,
                r: 50,
                t: 50,
                b: 100
            },
            showlegend: false
        };
        
        Plotly.newPlot(elementId, [initialTrace, positiveTrace, negativeTrace], layout);
    },
    
    /**
     * 更新图表数据
     * @param {string} elementId - 图表容器元素ID
     * @param {Array} newData - 新的数据数组
     */
    updateChart: function(elementId, newData) {
        Plotly.react(elementId, newData);
    },
    
    /**
     * 添加新的数据系列到图表
     * @param {string} elementId - 图表容器元素ID
     * @param {Object} newSeries - 新的数据系列
     */
    addSeries: function(elementId, newSeries) {
        Plotly.addTraces(elementId, newSeries);
    },
    
    /**
     * 导出图表为图片
     * @param {string} elementId - 图表容器元素ID
     * @param {string} filename - 文件名
     * @param {string} format - 格式 ('png', 'jpeg', 'svg', 'webp')
     */
    exportChart: function(elementId, filename, format = 'png') {
        Plotly.downloadImage(elementId, {
            format: format,
            filename: filename,
            height: 600,
            width: 800
        });
    }
};

// 导出图表工具
window.ChartUtils = ChartUtils; 