/**
 * 储能系统图表模块
 * 负责储能系统相关的所有图表绘制功能
 */

const StorageCharts = {
    /**
     * 初始化储能系统图表
     */
    initialize: function() {
        // 保持一个缓存的储能效果计算结果
        this.storageEffectCache = null;
        
        // 集成负荷分析模块
        this.integrateWithLoadAnalysis();
    },
    
    /**
     * 与原有负荷分析模块集成
     * @private
     */
    integrateWithLoadAnalysis: function() {
        // 监听原有负荷分析模块中的事件
        if (typeof window.updateOriginalLoadChart === 'function') {
            // 保存原始函数
            const originalUpdateFunc = window.updateOriginalLoadChart;
            
            // 重写函数，在执行原始逻辑后清除缓存
            window.updateOriginalLoadChart = function() {
                // 调用原始函数
                const result = originalUpdateFunc.apply(this, arguments);
                
                // 清除储能效果缓存
                if (StorageCharts) {
                    StorageCharts.storageEffectCache = null;
                    console.log('负荷数据更新，已清除储能效果缓存');
                }
                
                return result;
            };
        }
        
        // 如果存在原有的负荷生成函数，也做类似处理
        if (typeof window.generateExampleLoad === 'function') {
            const originalGenerateFunc = window.generateExampleLoad;
            
            window.generateExampleLoad = function() {
                const result = originalGenerateFunc.apply(this, arguments);
                
                if (StorageCharts) {
                    StorageCharts.storageEffectCache = null;
                    console.log('生成示例负荷，已清除储能效果缓存');
                }
                
                return result;
            };
        }
    },
    
    /**
     * 更新电价时间图表
     */
    updatePriceTimeChart: function() {
        // 收集所有时间和电价数据
        const priceData = [
            {
                name: '尖峰',
                price: parseFloat($('#price_sharp_peak').val()),
                timeRanges: [
                    {
                        start: $('#sharp_peak_start').val(),
                        end: $('#sharp_peak_end').val()
                    }
                ]
            },
            {
                name: '峰',
                price: parseFloat($('#price_peak').val()),
                timeRanges: [
                    {
                        start: $('#peak_start').val(),
                        end: $('#peak_end').val()
                    }
                ]
            },
            {
                name: '平',
                price: parseFloat($('#price_flat').val()),
                timeRanges: [
                    {
                        start: $('#flat_start').val(),
                        end: $('#flat_end').val()
                    }
                ]
            },
            {
                name: '谷',
                price: parseFloat($('#price_valley').val()),
                timeRanges: [
                    {
                        start: $('#valley_start').val(),
                        end: $('#valley_end').val()
                    }
                ]
            },
            {
                name: '深谷',
                price: parseFloat($('#price_deep_valley').val()),
                timeRanges: [
                    {
                        start: $('#deep_valley_start').val(),
                        end: $('#deep_valley_end').val()
                    }
                ]
            }
        ];

        // 添加第二时间段（如果启用）
        if ($('#sharp_peak_enable_2').is(':checked')) {
            priceData[0].timeRanges.push({
                start: $('#sharp_peak_start_2').val(),
                end: $('#sharp_peak_end_2').val()
            });
        }
        if ($('#peak_enable_2').is(':checked')) {
            priceData[1].timeRanges.push({
                start: $('#peak_start_2').val(),
                end: $('#peak_end_2').val()
            });
        }
        if ($('#flat_enable_2').is(':checked')) {
            priceData[2].timeRanges.push({
                start: $('#flat_start_2').val(),
                end: $('#flat_end_2').val()
            });
        }
        // 添加平电价的第三个时段
        if ($('#flat_enable_3').is(':checked')) {
            priceData[2].timeRanges.push({
                start: $('#flat_start_3').val(),
                end: $('#flat_end_3').val()
            });
        }
        if ($('#valley_enable_2').is(':checked')) {
            priceData[3].timeRanges.push({
                start: $('#valley_start_2').val(),
                end: $('#valley_end_2').val()
            });
        }
        if ($('#deep_valley_enable_2').is(':checked')) {
            priceData[4].timeRanges.push({
                start: $('#deep_valley_start_2').val(),
                end: $('#deep_valley_end_2').val()
            });
        }

        // 生成24小时的数据点
        const times = [];
        const prices = [];
        
        for (let hour = 0; hour < 24; hour++) {
            const time = `${hour.toString().padStart(2, '0')}:00`;
            times.push(time);
            
            // 找到当前时间对应的电价
            let currentPrice = 0;
            for (const period of priceData) {
                for (const range of period.timeRanges) {
                    if (Utils.isTimeInRange(time, range.start, range.end)) {
                        currentPrice = period.price;
                        break;
                    }
                }
                if (currentPrice > 0) break;
            }
            prices.push(currentPrice);
        }
        
        // 使用通用图表工具绘制图表
        ChartUtils.createBarChart('price_time_chart', 
            { x: times, y: prices }, 
            {
                title: '24小时电价分布',
                xAxisTitle: '时间',
                yAxisTitle: '电价 (元/kWh)',
                barColor: 'rgb(0, 121, 107)',
                textinfo: 'value'
            }
        );
    },
    
    /**
     * 更新原始负荷图表
     * @param {Array} [loads] - 负荷数据，如果不提供则从输入框获取
     */
    updateOriginalLoadChart: function(loads) {
        // 如果未提供负荷数据，则从输入框获取
        if (!loads) {
            loads = StorageUI.getHourlyLoads();
        }
        
        const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
        
        // 使用通用图表工具绘制图表
        ChartUtils.createLineChart('original_load_chart', 
            { x: hours, y: loads }, 
            {
                title: '24小时负荷曲线',
                xAxisTitle: '时间',
                yAxisTitle: '负荷 (kW)',
                lineColor: 'rgb(41, 128, 185)',
                mode: 'lines+markers',
                fill: 'tozeroy'
            }
        );
        
        // 更新负荷摘要信息
        StorageUI.updateLoadSummary(loads);
        
        // 清除储能效果缓存，因为原始负荷已经改变
        this.storageEffectCache = null;
    },
    
    /**
     * 更新修改后的负荷图表
     */
    updateModifiedLoadChart: function() {
        // 获取储能系统效果
        const storageEffect = this.getStorageEffect();
        
        if (!storageEffect) return;
        
        const { originalLoads, modifiedLoads } = storageEffect;
        const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
        
        // 准备图表数据
        const originalSeries = {
            type: 'scatter',
            x: hours,
            y: originalLoads,
            name: '原始负荷',
            line: {
                color: 'rgb(44, 62, 80)',
                dash: 'dot',
                width: 2
            },
            opacity: 0.7
        };
        
        const modifiedSeries = {
            type: 'scatter',
            x: hours,
            y: modifiedLoads,
            name: '优化负荷',
            line: {
                color: 'rgb(41, 128, 185)',
                width: 3
            },
            fill: 'tozeroy'
        };
        
        // 计算充放电时段
        const chargeDischargeMarkers = this.calculateChargeDischargeMarkers();
        
        // 创建最终图表配置
        const layout = {
            title: '储能系统负荷优化效果',
            xaxis: {
                title: '时间'
            },
            yaxis: {
                title: '负荷 (kW)'
            },
            shapes: chargeDischargeMarkers,
            annotations: this.createChargeDischargeAnnotations(),
            showlegend: true,
            legend: {
                x: 0.5,
                y: 1.1,
                xanchor: 'center',
                orientation: 'h'
            }
        };
        
        // 绘制图表
        Plotly.newPlot('modified_load_chart', [originalSeries, modifiedSeries], layout);
    },
    
    /**
     * 获取储能系统效果（带缓存）
     * @returns {Object} 储能系统效果对象
     */
    getStorageEffect: function() {
        // 如果缓存存在，直接返回
        if (this.storageEffectCache) {
            return this.storageEffectCache;
        }
        
        // 获取必要参数
        let originalLoads = [];
        
        // 优先使用原始的getHourlyLoads全局函数(如果存在)以保持兼容性
        if (typeof getHourlyLoads === 'function') {
            originalLoads = getHourlyLoads();
        } else {
            // 回退到UI模块的方法
            originalLoads = StorageUI.getHourlyLoads();
        }
        
        if (!originalLoads || originalLoads.length === 0 || originalLoads.every(load => load === 0)) {
            console.warn('无法获取有效的负荷数据，尝试直接从小时输入框读取');
            // 直接从小时输入框读取数据
            originalLoads = [];
            for (let hour = 0; hour < 24; hour++) {
                const inputElem = document.getElementById('hour_' + hour);
                const load = inputElem ? parseFloat(inputElem.value) || 0 : 0;
                originalLoads.push(load);
            }
        }
        
        if (!originalLoads || originalLoads.length === 0) {
            return null;
        }
        
        console.log('获取到的原始负荷数据:', originalLoads);
        
        const power = parseFloat($('#power').val());
        const energy = parseFloat($('#energy').val());
        const chargeDischargeMode = $('#charge_discharge_mode').val();
        
        // 根据充放电模式获取时间设置
        let timeSettings = {};
        
        if (chargeDischargeMode === 'single') {
            // 一充一放模式
            timeSettings = {
                mode: 'single',
                chargeStart: $('#deep_valley_start').val(),
                dischargeStart: $('#sharp_peak_start').val()
            };
        } else {
            // 两充两放模式
            timeSettings = {
                mode: 'double',
                firstChargeStart: $('#deep_valley_start').val(),
                firstDischargeStart: $('#sharp_peak_start').val(),
                secondChargeStart: $('#valley_start').val(),
                secondDischargeStart: $('#peak_start').val()
            };
        }
        
        // 计算储能效果
        const storageEffect = StorageCalculator.calculateStorageEffect(
            originalLoads, 
            power, 
            energy, 
            timeSettings
        );
        
        // 缓存结果
        this.storageEffectCache = storageEffect;
        
        return storageEffect;
    },
    
    /**
     * 计算充放电标记区域
     * @returns {Array} 充放电标记区域
     */
    calculateChargeDischargeMarkers: function() {
        const shapes = [];
        const chargeDischargeMode = $('#charge_discharge_mode').val();
        
        // 充电区域颜色（浅绿色）
        const chargeColor = 'rgba(0, 200, 83, 0.2)';
        // 放电区域颜色（浅红色）
        const dischargeColor = 'rgba(213, 0, 0, 0.2)';
        
        // 添加充放电区域
        if (chargeDischargeMode === 'single') {
            // 一充一放模式
            const chargeStart = Utils.timeToHours($('#deep_valley_start').val());
            const dischargeStart = Utils.timeToHours($('#sharp_peak_start').val());
            
            // 充电区域（2小时）
            this.addTimeRangeShape(shapes, chargeStart, chargeStart + 2, chargeColor);
            
            // 放电区域（2小时）
            this.addTimeRangeShape(shapes, dischargeStart, dischargeStart + 2, dischargeColor);
        } else {
            // 两充两放模式
            const firstChargeStart = Utils.timeToHours($('#deep_valley_start').val());
            const firstDischargeStart = Utils.timeToHours($('#sharp_peak_start').val());
            const secondChargeStart = Utils.timeToHours($('#valley_start').val());
            const secondDischargeStart = Utils.timeToHours($('#peak_start').val());
            
            // 第一次充电区域（2小时）
            this.addTimeRangeShape(shapes, firstChargeStart, firstChargeStart + 2, chargeColor);
            
            // 第一次放电区域（2小时）
            this.addTimeRangeShape(shapes, firstDischargeStart, firstDischargeStart + 2, dischargeColor);
            
            // 第二次充电区域（2小时）
            this.addTimeRangeShape(shapes, secondChargeStart, secondChargeStart + 2, chargeColor);
            
            // 第二次放电区域（2小时）
            this.addTimeRangeShape(shapes, secondDischargeStart, secondDischargeStart + 2, dischargeColor);
        }
        
        return shapes;
    },
    
    /**
     * 添加时间范围标记
     * @private
     * @param {Array} shapes - 标记数组
     * @param {number} startHour - 开始小时
     * @param {number} endHour - 结束小时
     * @param {string} color - 颜色
     */
    addTimeRangeShape: function(shapes, startHour, endHour, color) {
        // 处理跨日的情况
        if (startHour >= 24) startHour -= 24;
        if (endHour >= 24) endHour -= 24;
        
        // 如果时间范围跨日，分成两段
        if (startHour > endHour) {
            // 第一段：从startHour到24
            shapes.push({
                type: 'rect',
                xref: 'x',
                yref: 'paper',
                x0: startHour,
                x1: 24,
                y0: 0,
                y1: 1,
                fillcolor: color,
                opacity: 0.5,
                line: {
                    width: 0
                }
            });
            
            // 第二段：从0到endHour
            shapes.push({
                type: 'rect',
                xref: 'x',
                yref: 'paper',
                x0: 0,
                x1: endHour,
                y0: 0,
                y1: 1,
                fillcolor: color,
                opacity: 0.5,
                line: {
                    width: 0
                }
            });
        } else {
            // 不跨日的情况
            shapes.push({
                type: 'rect',
                xref: 'x',
                yref: 'paper',
                x0: startHour,
                x1: endHour,
                y0: 0,
                y1: 1,
                fillcolor: color,
                opacity: 0.5,
                line: {
                    width: 0
                }
            });
        }
    },
    
    /**
     * 创建充放电注释
     * @returns {Array} 充放电注释
     */
    createChargeDischargeAnnotations: function() {
        const annotations = [];
        const chargeDischargeMode = $('#charge_discharge_mode').val();
        
        if (chargeDischargeMode === 'single') {
            // 一充一放模式
            const chargeStart = Utils.timeToHours($('#deep_valley_start').val());
            const dischargeStart = Utils.timeToHours($('#sharp_peak_start').val());
            
            // 充电注释
            annotations.push({
                x: chargeStart + 1,
                y: 1,
                xref: 'x',
                yref: 'paper',
                text: '充电',
                showarrow: true,
                arrowhead: 2,
                arrowsize: 1,
                arrowwidth: 1,
                ax: 0,
                ay: -20
            });
            
            // 放电注释
            annotations.push({
                x: dischargeStart + 1,
                y: 1,
                xref: 'x',
                yref: 'paper',
                text: '放电',
                showarrow: true,
                arrowhead: 2,
                arrowsize: 1,
                arrowwidth: 1,
                ax: 0,
                ay: -20
            });
        } else {
            // 两充两放模式
            const firstChargeStart = Utils.timeToHours($('#deep_valley_start').val());
            const firstDischargeStart = Utils.timeToHours($('#sharp_peak_start').val());
            const secondChargeStart = Utils.timeToHours($('#valley_start').val());
            const secondDischargeStart = Utils.timeToHours($('#peak_start').val());
            
            // 第一次充电注释
            annotations.push({
                x: firstChargeStart + 1,
                y: 1,
                xref: 'x',
                yref: 'paper',
                text: '一次充电',
                showarrow: true,
                arrowhead: 2,
                arrowsize: 1,
                arrowwidth: 1,
                ax: 0,
                ay: -20
            });
            
            // 第一次放电注释
            annotations.push({
                x: firstDischargeStart + 1,
                y: 1,
                xref: 'x',
                yref: 'paper',
                text: '一次放电',
                showarrow: true,
                arrowhead: 2,
                arrowsize: 1,
                arrowwidth: 1,
                ax: 0,
                ay: -20
            });
            
            // 第二次充电注释
            annotations.push({
                x: secondChargeStart + 1,
                y: 1,
                xref: 'x',
                yref: 'paper',
                text: '二次充电',
                showarrow: true,
                arrowhead: 2,
                arrowsize: 1,
                arrowwidth: 1,
                ax: 0,
                ay: -20
            });
            
            // 第二次放电注释
            annotations.push({
                x: secondDischargeStart + 1,
                y: 1,
                xref: 'x',
                yref: 'paper',
                text: '二次放电',
                showarrow: true,
                arrowhead: 2,
                arrowsize: 1,
                arrowwidth: 1,
                ax: 0,
                ay: -20
            });
        }
        
        return annotations;
    }
};

// 在文档加载完成后初始化
$(document).ready(function() {
    StorageCharts.initialize();
}); 