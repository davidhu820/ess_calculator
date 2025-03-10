// 计算储能系统与负荷的相互作用
function calculateStorageEffect() {
    const originalLoads = getHourlyLoads();
    const modifiedLoads = [...originalLoads];
    
    // 获取储能系统参数
    const power = parseFloat($('#power').val());  // 功率(kW)
    const chargeDischargeMode = $('#charge_discharge_mode').val();
    
    // 设置充放电倍率为0.5C (即充放电需要2小时)
    const chargeDischargeDuration = 2;  // 小时
    
    // 使用用户设定的深谷电价开始时间作为第一次充电开始时间
    let firstChargeStartTime = $('#deep_valley_start').val();
    let firstChargeStartHour = timeToHours(firstChargeStartTime);
    let firstChargeEndHour = firstChargeStartHour + chargeDischargeDuration;
    
    // 使用用户设定的尖峰电价开始时间作为第一次放电开始时间
    let firstDischargeStartTime = $('#sharp_peak_start').val();
    let firstDischargeStartHour = timeToHours(firstDischargeStartTime);
    let firstDischargeEndHour = firstDischargeStartHour + chargeDischargeDuration;
    
    // 对于两充两放模式，需要确保充放电顺序合理
    if (chargeDischargeMode === 'double') {
        // 先执行第一次充电
        applyChargingEffect(modifiedLoads, firstChargeStartHour, power, chargeDischargeDuration);
        
        // 然后执行第一次放电
        applyDischargingEffect(modifiedLoads, firstDischargeStartHour, power, chargeDischargeDuration);
        
        // 使用谷电价时间段作为第二次充电的开始时间
        // 但要确保第二次充电在第一次放电结束后开始
        let secondChargeStartTime = $('#valley_start').val();
        let secondChargeStartHour = timeToHours(secondChargeStartTime);
        
        // 如果第二次充电时间早于第一次放电结束时间，则将第二次充电推迟到第一次放电结束后
        if (secondChargeStartHour < firstDischargeEndHour) {
            secondChargeStartHour = firstDischargeEndHour;
        }
        
        // 第二次充放电
        let secondChargeEndHour = secondChargeStartHour + chargeDischargeDuration;
        
        // 使用峰电价时间段作为第二次放电的开始时间
        // 但要确保第二次放电在第二次充电结束后开始
        let secondDischargeStartTime = $('#peak_start').val();
        let secondDischargeStartHour = timeToHours(secondDischargeStartTime);
        
        // 如果第二次放电时间早于第二次充电结束时间，则将第二次放电推迟到第二次充电结束后
        if (secondDischargeStartHour < secondChargeEndHour) {
            secondDischargeStartHour = secondChargeEndHour;
        }
        
        // 执行第二次充电和放电
        applyChargingEffect(modifiedLoads, secondChargeStartHour, power, chargeDischargeDuration);
        applyDischargingEffect(modifiedLoads, secondDischargeStartHour, power, chargeDischargeDuration);
        
        return {
            originalLoads: originalLoads,
            modifiedLoads: modifiedLoads,
            chargePeriods: [
                {start: Math.floor(firstChargeStartHour), end: Math.floor(firstChargeEndHour)},
                {start: Math.floor(secondChargeStartHour), end: Math.floor(secondChargeEndHour)}
            ],
            dischargePeriods: [
                {start: Math.floor(firstDischargeStartHour), end: Math.floor(firstDischargeEndHour)},
                {start: Math.floor(secondDischargeStartHour), end: Math.floor(secondDischargeStartHour + chargeDischargeDuration)}
            ]
        };
    }
    
    // 一充一放模式的逻辑保持不变
    applyChargingEffect(modifiedLoads, firstChargeStartHour, power, chargeDischargeDuration);
    applyDischargingEffect(modifiedLoads, firstDischargeStartHour, power, chargeDischargeDuration);
    
    return {
        originalLoads: originalLoads,
        modifiedLoads: modifiedLoads,
        chargePeriods: [{start: Math.floor(firstChargeStartHour), end: Math.floor(firstChargeEndHour)}],
        dischargePeriods: [{start: Math.floor(firstDischargeStartHour), end: Math.floor(firstDischargeEndHour)}]
    };
}

// 对负荷应用充电效应
function applyChargingEffect(loads, startHour, power, duration) {
    for (let h = 0; h < duration; h++) {
        const hour = Math.floor((startHour + h) % 24);  // 处理跨天情况
        loads[hour] += power;
    }
}

// 对负荷应用放电效应
function applyDischargingEffect(loads, startHour, power, duration) {
    for (let h = 0; h < duration; h++) {
        const hour = Math.floor((startHour + h) % 24);  // 处理跨天情况
        loads[hour] = Math.max(0, loads[hour] - power);
    }
}

// 将时间字符串转换为小时数（包含小数）
function timeToHours(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes / 60);
}

// 更新修改后的负荷曲线图表
function updateModifiedLoadChart() {
    const hours = Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`);
    const storageEffect = calculateStorageEffect();
    
    const originalTrace = {
        x: hours,
        y: storageEffect.originalLoads,
        type: 'scatter',
        mode: 'lines',
        name: '原始负荷',
        line: { width: 2, color: '#2c5282', dash: 'dash' }
    };
    
    const modifiedTrace = {
        x: hours,
        y: storageEffect.modifiedLoads,
        type: 'scatter',
        mode: 'lines+markers',
        name: '含储能系统负荷',
        line: { width: 3, color: '#e53e3e' },
        marker: { size: 7, color: '#e53e3e' }
    };
    
    // 创建充电和放电区域背景
    const shapes = [];
    
    // 充电区域（浅绿色背景）
    storageEffect.chargePeriods.forEach(period => {
        // 确保时间在0-23范围内
        const start = period.start % 24;
        const end = period.end % 24;
        
        shapes.push({
            type: 'rect',
            xref: 'x',
            yref: 'paper',
            x0: hours[start],
            y0: 0,
            x1: end === 0 ? '24:00' : hours[end],
            y1: 1,
            fillcolor: 'rgba(0, 200, 0, 0.1)',
            line: { width: 0 }
        });
    });
    
    // 放电区域（浅红色背景）
    storageEffect.dischargePeriods.forEach(period => {
        // 确保时间在0-23范围内
        const start = period.start % 24;
        const end = period.end % 24;
        
        shapes.push({
            type: 'rect',
            xref: 'x',
            yref: 'paper',
            x0: hours[start],
            y0: 0,
            x1: end === 0 ? '24:00' : hours[end],
            y1: 1,
            fillcolor: 'rgba(255, 0, 0, 0.1)',
            line: { width: 0 }
        });
    });
    
    // 更新充放电信息显示
    updateChargingDischargeInfo();
    
    const layout = {
        title: '储能系统作用后的负荷曲线',
        xaxis: {
            title: '时间',
            tickmode: 'array',
            tickvals: hours,
            ticktext: hours,
            tickangle: -45,
            range: [-0.5, 23.5]
        },
        yaxis: {
            title: '负荷 (kW)',
            rangemode: 'tozero'
        },
        margin: { l: 60, r: 30, b: 80, t: 50, pad: 4 },
        legend: {
            orientation: 'h',
            yanchor: 'top',
            y: -0.2,
            xanchor: 'center',
            x: 0.5
        },
        shapes: shapes,
        annotations: [
            {
                xref: 'paper',
                yref: 'paper',
                x: 0.01,
                y: 0.95,
                text: '绿色区域: 充电时段（2小时）',
                showarrow: false,
                font: { size: 12, color: '#1a8754' }
            },
            {
                xref: 'paper',
                yref: 'paper',
                x: 0.01,
                y: 0.9,
                text: '红色区域: 放电时段（2小时）',
                showarrow: false,
                font: { size: 12, color: '#dc3545' }
            }
        ]
    };
    
    Plotly.newPlot('modified_load_chart', [originalTrace, modifiedTrace], layout);
}

// 计算需量电费
function calculateDemandCharge() {
    // 检查是否启用需量电费计算
    if (!$('#enable_demand_charge').is(':checked')) {
        // 如果未启用，显示为0
        $('#annual_demand_charge_impact').text('0.00');
        $('#monthly_demand_charge_impact').text('0.00');
        $('.status-text').html('需量电费计算已禁用');
        $('#demand_charge_status .status-icon').removeClass('positive negative');
        return {
            loadChange: 0,
            annualImpact: 0,
            monthlyImpact: 0
        };
    }
    
    // 确保原始负荷信息已计算
    if (!$('#original_peak_load').text() || $('#original_peak_load').text() === '-') {
        const storageEffect = calculateStorageEffect();
        if (storageEffect) {
            updateLoadOptimizationMetrics();
        }
    }
    
    // 获取原始最大负荷和优化后最大负荷
    const originalPeakLoad = parseFloat($('#original_peak_load').text()) || 0;
    const modifiedPeakLoad = parseFloat($('#modified_peak_load').text()) || 0;
    
    console.log("原始负荷:", originalPeakLoad, "修改后负荷:", modifiedPeakLoad);
    
    // 获取需量电价
    const demandChargeRate = parseFloat($('#demand_charge_rate').val()) || 38.8;
    console.log("需量电价:", demandChargeRate);
    
    // 计算负荷变化
    const loadChange = originalPeakLoad - modifiedPeakLoad;
    console.log("负荷降低量:", loadChange);
    
    // 计算年度和月度需量电费影响
    const annualImpact = loadChange * demandChargeRate * 12;
    const monthlyImpact = loadChange * demandChargeRate;
    
    console.log("年度需量电费影响:", annualImpact, "月度需量电费影响:", monthlyImpact);
    
    // 更新显示
    $('#annual_demand_charge_impact').text(annualImpact.toFixed(2))
        .removeClass('positive negative')
        .addClass(annualImpact >= 0 ? 'positive' : 'negative');
    
    $('#monthly_demand_charge_impact').text(monthlyImpact.toFixed(2))
        .removeClass('positive negative')
        .addClass(monthlyImpact >= 0 ? 'positive' : 'negative');
    
    // 更新状态框
    const $statusIcon = $('.status-icon');
    const $statusText = $('.status-text');
    
    $statusIcon.removeClass('positive negative');
    
    if (loadChange > 0) {
        $statusIcon.addClass('positive');
        $statusText.html(`储能系统每年可节省需量电费 <strong>${annualImpact.toFixed(2)}</strong> 元`);
    } else if (loadChange < 0) {
        $statusIcon.addClass('negative');
        $statusText.html(`储能系统导致每年增加需量电费 <strong>${Math.abs(annualImpact).toFixed(2)}</strong> 元`);
    } else {
        $statusText.html('储能系统对需量电费无影响');
    }
    
    return {
        loadChange: loadChange,
        annualImpact: annualImpact,
        monthlyImpact: monthlyImpact
    };
} 