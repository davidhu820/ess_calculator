// 初始化电价时间设置
function initializePriceTimeSettings() {
    const timeInputs = $('input[type="time"]');
    const priceInputs = $('.price-group input[type="number"]');
    
    timeInputs.add(priceInputs).on('change', function() {
        updatePriceTimeChart();
        
        // 如果是需量电价变化，重新计算需量电费
        if ($(this).attr('id') === 'demand_charge_rate') {
            calculateDemandCharge();
        }
    });
    
    setupCheckboxHandlers();
    
    // 确保已勾选的复选框对应的输入框是启用的
    $('#flat_enable_2, #flat_enable_3, #valley_enable_2').each(function() {
        if ($(this).is(':checked')) {
            const timeInputs = $(this).closest('.time-range').find('input[type="time"]');
            timeInputs.prop('disabled', false);
        }
    });
    
    updatePriceTimeChart();
}

// 为复选框添加事件处理
function setupCheckboxHandlers() {
    $('input[type="checkbox"]').on('change', function() {
        const timeInputs = $(this).closest('.time-range').find('input[type="time"]');
        timeInputs.prop('disabled', !this.checked);
        updatePriceTimeChart();
    });
}

// 初始化充放电模式选择
function initializeChargeDischargeModes() {
    $('#charge_discharge_mode').on('change', function() {
        const mode = $(this).val();
        if (mode === 'single') {
            $('#single_mode_options').show();
            $('#double_mode_options').hide();
        } else {
            $('#single_mode_options').hide();
            $('#double_mode_options').show();
        }
        updatePriceTimeChart();
    });

    // 为所有电价选择添加更新事件
    $('.charge-discharge-select select').on('change', function() {
        updatePriceTimeChart();
    });
}

// 更新电价时间图表
function updatePriceTimeChart() {
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
                if (isTimeInRange(time, range.start, range.end)) {
                    currentPrice = period.price;
                    break;
                }
            }
            if (currentPrice > 0) break;
        }
        prices.push(currentPrice);
    }

    // 创建图表数据
    const trace = {
        x: times,
        y: prices,
        type: 'scatter',
        mode: 'lines+markers',
        line: {
            width: 2,
            color: '#2c5282'
        },
        marker: {
            size: 8,
            color: '#2c5282'
        },
        name: '电价'
    };

    const layout = {
        title: '24小时电价变化',
        xaxis: {
            title: '时间',
            ticktext: times,  // 使用生成的时间作为刻度标签
            tickvals: times,  // 对应的值
            tickangle: -45,
            tickmode: 'array',
            nticks: 24  // 显示24个刻度
        },
        yaxis: {
            title: '电价 (元/kWh)',
            rangemode: 'tozero'
        },
        margin: {
            l: 50,
            r: 50,
            b: 80,
            t: 50,
            pad: 4
        }
    };

    Plotly.newPlot('price_time_chart', [trace], layout);
}

// 判断时间是否在范围内的辅助函数
function isTimeInRange(time, start, end) {
    const timeMinutes = timeToMinutes(time);
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);
    
    if (startMinutes <= endMinutes) {
        return timeMinutes >= startMinutes && timeMinutes < endMinutes;
    } else {
        // 处理跨午夜的情况
        return timeMinutes >= startMinutes || timeMinutes < endMinutes;
    }
}

// 将时间转换为分钟数的辅助函数
function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

// 时间字符串转换为小时数（带小数）
function timeToHours(timeStr) {
    if (!timeStr) return 0; // 处理空值或undefined
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
} 