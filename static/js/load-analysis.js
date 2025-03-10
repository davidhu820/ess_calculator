// 初始化负荷分析功能
function initializeLoadAnalysis() {
    // 初始化24小时负荷输入
    initHourlyInputs();
    
    // 添加生成示例负荷的按钮事件
    $('#generate_load').on('click', function() {
        generateSampleLoad();
    });
    
    // 添加负荷模式选择变化事件
    $('#load_pattern_select').on('change', function() {
        updatePatternDescription();
    });
    
    // 初始化图表
    updateOriginalLoadChart();
    updateModifiedLoadChart();
    
    // 当储能系统参数变化时更新修改后的负荷曲线和需量电费
    $('#power, #energy, #charge_discharge_mode, #single_charge_price, #single_discharge_price, #first_charge_price, #first_discharge_price, #second_charge_price, #second_discharge_price').on('change', function() {
        updateModifiedLoadChart();
        calculateDemandCharge();
    });
    
    // 默认生成一个示例负荷曲线
    generateSampleLoad();
    
    // 添加充放电策略提示信息
    $('#load-optimization-tab').on('show', function() {
        updateChargingDischargeInfo();
    });
    
    // 当电价时间变更时，更新充放电信息
    $('#deep_valley_start, #sharp_peak_start, #valley_start, #peak_start, #charge_discharge_mode').on('change', function() {
        updateChargingDischargeInfo();
        updateModifiedLoadChart();
    });
    
    // 初始化需量电费计算
    $('#load-optimization-tab').on('shown', function() {
        calculateDemandCharge();
    });
    
    // 确保需量电价变化时重新计算
    $('#demand_charge_rate').on('input', function() {
        calculateDemandCharge();
    });
}

// 初始化24小时负荷输入框
function initHourlyInputs() {
    const container = $('.hourly-inputs-container');
    container.empty();
    
    for (let hour = 0; hour < 24; hour++) {
        const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
        const inputHtml = `
            <div class="hour-input">
                <label>${hourLabel}</label>
                <input type="number" id="load_hour_${hour}" class="hourly-load" value="0" min="0" step="0.1">
            </div>
        `;
        container.append(inputHtml);
    }
    
    // 为所有小时负荷输入框添加变化监听
    $('.hourly-load').on('input', function() {
        updateLoadSummary();
        updateOriginalLoadChart();
        updateModifiedLoadChart();
    });
}

// 更新负荷模式描述
function updatePatternDescription() {
    const selectedPattern = $('#load_pattern_select').val();
    let description = '';
    
    if (selectedPattern === 'day_evening_peak') {
        description = '<p><strong>模式一说明：</strong>日间和傍晚分别形成两个用电高峰，凌晨时段用电量显著下降。适合住宅区、商业区等场景。</p>';
    } else if (selectedPattern === 'balanced') {
        description = '<p><strong>模式二说明：</strong>用电均衡，用电负荷几乎不发生变化。适合24小时运转的工厂、数据中心等场景。</p>';
    } else if (selectedPattern === 'night_peak') {
        description = '<p><strong>模式三说明：</strong>夜间用电量高，白天用电量相对较低。适合夜间生产企业、娱乐场所等场景。</p>';
    }
    
    $('#pattern_description').html(description);
}

// 生成示例负荷曲线数据
function generateSampleLoad() {
    const dailyConsumption = parseFloat($('#monthly_consumption').val()) / 30;
    const selectedPattern = $('#load_pattern_select').val();
    
    let loadData;
    
    if (selectedPattern === 'day_evening_peak') {
        // 模式一：日间和傍晚双高峰型
        loadData = [
            15, 10, 8, 7, 10,    // 0:00 - 4:59
            20, 30, 45, 65, 80,  // 5:00 - 9:59
            90, 95, 85, 75, 60,  // 10:00 - 14:59
            55, 65, 80, 100, 90, // 15:00 - 19:59
            70, 50, 35, 20       // 20:00 - 23:59
        ];
    } else if (selectedPattern === 'balanced') {
        // 模式二：均衡负荷型
        loadData = [
            50, 48, 47, 46, 45, // 0:00 - 4:59
            46, 47, 48, 49, 50, // 5:00 - 9:59
            52, 53, 54, 55, 54, // 10:00 - 14:59
            53, 52, 51, 50, 50, // 15:00 - 19:59
            51, 52, 51, 50      // 20:00 - 23:59
        ];
    } else if (selectedPattern === 'night_peak') {
        // 模式三：夜间高峰型
        loadData = [
            90, 95, 100, 90, 85, // 0:00 - 4:59
            70, 60, 50, 40, 35,  // 5:00 - 9:59
            30, 25, 30, 35, 40,  // 10:00 - 14:59
            45, 50, 55, 65, 70,  // 15:00 - 19:59
            75, 80, 85, 90       // 20:00 - 23:59
        ];
    }
    
    // 归一化为输入的每日用电量
    const totalPercent = loadData.reduce((a, b) => a + b, 0);
    const scaledData = loadData.map(val => (val / totalPercent * dailyConsumption).toFixed(1));
    
    // 填充表单
    for (let hour = 0; hour < 24; hour++) {
        $(`#load_hour_${hour}`).val(scaledData[hour]);
    }
    
    updateLoadSummary();
    updateOriginalLoadChart();
    updateModifiedLoadChart();
}

// 更新负荷数据摘要
function updateLoadSummary() {
    const hourlyLoads = getHourlyLoads();
    
    const peakLoad = Math.max(...hourlyLoads);
    const minLoad = Math.min(...hourlyLoads);
    const avgLoad = hourlyLoads.reduce((a, b) => a + b, 0) / 24;
    const loadFactor = (avgLoad / peakLoad * 100).toFixed(2);
    const dailyConsumption = hourlyLoads.reduce((a, b) => a + b, 0);
    
    $('#peak_load_value').text(peakLoad.toFixed(1));
    $('#min_load_value').text(minLoad.toFixed(1));
    $('#load_factor_value').text(loadFactor);
    $('#daily_consumption_value').text(dailyConsumption.toFixed(1));
}

// 获取所有24小时的负荷值
function getHourlyLoads() {
    const loads = [];
    for (let hour = 0; hour < 24; hour++) {
        loads.push(parseFloat($(`#load_hour_${hour}`).val()) || 0);
    }
    return loads;
}

// 更新原始负荷曲线图表
function updateOriginalLoadChart() {
    const hours = Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`);
    const loads = getHourlyLoads();
    
    const trace = {
        x: hours,
        y: loads,
        type: 'scatter',
        mode: 'lines+markers',
        name: '原始负荷',
        line: { width: 3, color: '#2c5282' },
        marker: { size: 8, color: '#2c5282' }
    };
    
    const layout = {
        title: '用户原始负荷曲线',
        xaxis: {
            title: '时间',
            tickmode: 'array',
            tickvals: hours,
            ticktext: hours,
            tickangle: -45
        },
        yaxis: {
            title: '负荷 (kW)',
            rangemode: 'tozero'
        },
        margin: { l: 60, r: 30, b: 80, t: 50, pad: 4 }
    };
    
    Plotly.newPlot('original_load_chart', [trace], layout);
}

// 添加充放电调度信息显示
function updateChargingDischargeInfo() {
    const chargeDischargeMode = $('#charge_discharge_mode').val();
    const deepValleyStart = $('#deep_valley_start').val();
    const sharpPeakStart = $('#sharp_peak_start').val();
    
    let infoHtml = '<div class="info-box" style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0;">';
    
    if (chargeDischargeMode === 'single') {
        infoHtml += `<p>当前充放电策略：一充一放</p>
                     <p>充电时间：${deepValleyStart}起，持续2小时</p>
                     <p>放电时间：${sharpPeakStart}起，持续2小时</p>`;
    } else {
        const valleyStart = $('#valley_start').val();
        const peakStart = $('#peak_start').val();
        
        // 计算时间
        const firstChargeStartTime = deepValleyStart;
        const firstChargeEndTime = addHoursToTimeString(deepValleyStart, 2);
        const firstDischargeStartTime = sharpPeakStart;
        const firstDischargeEndTime = addHoursToTimeString(sharpPeakStart, 2);
        
        // 计算第二次充电开始时间
        let secondChargeStartTime = valleyStart;
        let secondChargeStartHour = timeToHours(valleyStart);
        let firstDischargeEndHour = timeToHours(firstDischargeEndTime);
        
        if (secondChargeStartHour < firstDischargeEndHour) {
            secondChargeStartTime = firstDischargeEndTime;
        }
        
        const secondChargeEndTime = addHoursToTimeString(secondChargeStartTime, 2);
        
        // 计算第二次放电开始时间
        let secondDischargeStartTime = peakStart;
        let secondDischargeStartHour = timeToHours(peakStart);
        let secondChargeEndHour = timeToHours(secondChargeEndTime);
        
        if (secondDischargeStartHour < secondChargeEndHour) {
            secondDischargeStartTime = secondChargeEndTime;
        }
        
        const secondDischargeEndTime = addHoursToTimeString(secondDischargeStartTime, 2);
        
        infoHtml += `<p>当前充放电策略：两充两放</p>
                     <p>第一次充电：${firstChargeStartTime} - ${firstChargeEndTime}</p>
                     <p>第一次放电：${firstDischargeStartTime} - ${firstDischargeEndTime}</p>
                     <p>第二次充电：${secondChargeStartTime} - ${secondChargeEndTime}</p>
                     <p>第二次放电：${secondDischargeStartTime} - ${secondDischargeEndTime}</p>`;
    }
    
    infoHtml += '</div>';
    
    // 在负荷优化选项卡中显示信息
    if ($('#charging_discharge_info').length) {
        $('#charging_discharge_info').html(infoHtml);
    } else {
        $('#modified_load_chart').before('<div id="charging_discharge_info">' + infoHtml + '</div>');
    }
}

// 辅助函数：给时间字符串添加小时数
function addHoursToTimeString(timeStr, hoursToAdd) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    let newHours = (hours + hoursToAdd) % 24;
    return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// 添加初始化调用
$(document).ready(function() {
    // 更新模式描述
    updatePatternDescription();
});

// 更新负荷优化指标
function updateLoadOptimizationMetrics() {
    const storageEffect = calculateStorageEffect();
    const originalLoads = storageEffect.originalLoads;
    const modifiedLoads = storageEffect.modifiedLoads;
    
    const originalPeakLoad = Math.max(...originalLoads);
    const modifiedPeakLoad = Math.max(...modifiedLoads);
    const loadReduction = originalPeakLoad - modifiedPeakLoad;
    
    const originalAvg = originalLoads.reduce((a, b) => a + b, 0) / 24;
    const modifiedAvg = modifiedLoads.reduce((a, b) => a + b, 0) / 24;
    
    const originalLoadFactor = (originalAvg / originalPeakLoad * 100);
    const modifiedLoadFactor = (modifiedAvg / modifiedPeakLoad * 100);
    const loadFactorImprovement = modifiedLoadFactor - originalLoadFactor;
    
    $('#original_peak_load').text(originalPeakLoad.toFixed(1));
    $('#modified_peak_load').text(modifiedPeakLoad.toFixed(1));
    $('#load_reduction').text(loadReduction.toFixed(1));
    
    $('#original_load_factor').text(originalLoadFactor.toFixed(1));
    $('#modified_load_factor').text(modifiedLoadFactor.toFixed(1));
    $('#load_factor_improvement').text(loadFactorImprovement.toFixed(1));
    
    // 确保计算并显示需量电费影响
    setTimeout(function() {
        calculateDemandCharge();
    }, 100); // 短暂延迟以确保DOM已更新
} 