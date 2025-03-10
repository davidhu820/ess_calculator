// 页面初始化
$(document).ready(function() {
    // 初始化系统效率计算
    updateSystemEfficiency();
    
    // 添加输入字段事件监听
    $('#charging_efficiency, #discharging_efficiency').on('input', updateSystemEfficiency);
    
    // 初始化电价时间设置
    initializePriceTimeSettings();
    
    // 初始化充放电模式选择
    initializeChargeDischargeModes();
    
    // 初始化负荷分析功能
    initializeLoadAnalysis();
    
    // 添加计算按钮事件
    $('#calculate-button').on('click', function() {
        calculate();
        
        // 计算完成后滚动到结果区域
        setTimeout(function() {
            $('html, body').animate({
                scrollTop: $('.results').offset().top - 20
            }, 1000);
        }, 500);
    });
    
    // 参数区域Tab切换
    $('.tabs .tab').on('click', function() {
        const tabId = $(this).data('tab');
        
        // 获取当前标签所属的标签组
        const tabGroup = $(this).closest('.tabs');
        
        // 仅切换当前标签组内的标签
        tabGroup.find('.tab').removeClass('active');
        $(this).addClass('active');
        
        // 隐藏所有相关的内容
        const tabContents = tabGroup.hasClass('results-tabs') ? 
                            $('#summary-tab, #operation-data-tab, #financial-analysis-tab, #load-optimization-tab') :
                            $('#basic-params, #price-params, #operation-params, #load-analysis');
        
        tabContents.removeClass('active');
        
        // 显示当前选中的内容
        $('#' + tabId).addClass('active');
        
        // 如果切换了电价参数或负荷分析，需要更新相应的图表
        if (tabId === 'price-params') {
            updatePriceTimeChart();
        } else if (tabId === 'load-analysis') {
            updateOriginalLoadChart();
        } else if (tabId === 'load-optimization-tab') {
            updateModifiedLoadChart();
            // 确保在切换到负荷优化标签页时计算需量电费
            calculateDemandCharge();
        }
    });
    
    // 添加欢迎信息
    setTimeout(function() {
        showWelcomeMessage();
    }, 500);
    
    // 初始化第三个平电价时段
    if (!$('#flat_enable_3').length) {
        // 如果HTML中没有第三个时段，添加它
        const thirdTimeRange = `
            <div class="time-range optional-time">
                <input type="checkbox" id="flat_enable_3" checked>
                <label>时间段3:</label>
                <input type="time" id="flat_start_3" value="23:00">
                <span>至</span>
                <input type="time" id="flat_end_3" value="00:00">
            </div>
        `;
        $('.price-group:contains("平电价")').append(thirdTimeRange);
    }
    
    // 确保已勾选的复选框对应的输入框是启用的
    $('#flat_enable_2, #flat_enable_3, #valley_enable_2').each(function() {
        if ($(this).is(':checked')) {
            const timeInputs = $(this).closest('.time-range').find('input[type="time"]');
            timeInputs.prop('disabled', false);
        }
    });
    
    // 初始化工具提示
    if (typeof $().tooltip === 'function') {
        $('.tooltip-icon').tooltip();
    }
    
    // 更新负荷模式描述
    if (typeof updatePatternDescription === 'function') {
        updatePatternDescription();
    }
    
    // 初始化储能柜计算
    updateStorageSystemParameters();
    
    // 添加事件监听
    $('#cabinet_count, #single_cabinet_power, #single_cabinet_capacity').on('change', function() {
        updateStorageSystemParameters();
    });
    
    // 计算并显示年维护费用
    updateMaintenanceCost();
    
    // 监听总投资和运维成本比例的变化，更新年维护费用
    $('#capex, #opex_percent').on('input', function() {
        updateMaintenanceCost();
    });
    
    // 添加预设配置事件
    $('#preset_config').on('change', function() {
        const preset = $(this).val();
        
        if (preset === 'small') {
            $('#cabinet_count').val(1);
            $('#single_cabinet_power').val(125);
            $('#single_cabinet_capacity').val(261);
            $('#capex').val(260000);
        } else if (preset === 'medium') {
            $('#cabinet_count').val(2);
            $('#single_cabinet_power').val(125);
            $('#single_cabinet_capacity').val(261);
            $('#capex').val(520000);
        } else if (preset === 'large') {
            $('#cabinet_count').val(4);
            $('#single_cabinet_power').val(125);
            $('#single_cabinet_capacity').val(261);
            $('#capex').val(1040000);
        }
        
        // 更新系统参数
        updateStorageSystemParameters();
    });
    
    // 添加需量电费启用复选框的事件监听
    $('#enable_demand_charge').on('change', function() {
        // 当复选框状态变化时更新需量电费显示
        calculateDemandCharge();
    });
});

// 更新系统效率显示
function updateSystemEfficiency() {
    const chargingEff = parseFloat($('#charging_efficiency').val()) / 100;
    const dischargingEff = parseFloat($('#discharging_efficiency').val()) / 100;
    const systemEff = (chargingEff * dischargingEff * 100).toFixed(2);
    $('#system_efficiency').text(systemEff);
}

// 计算按钮处理函数
function calculate() {
    // 显示加载状态
    $('#calculate-button').prop('disabled', true).text('计算中...');
    
    // 计算当前的年维护费用
    updateMaintenanceCost();
    const maintenanceCost = parseFloat($('#calculated_maintenance_cost').text());
    
    // 先更新负荷优化指标，确保计算最新的负荷降低量
    updateModifiedLoadChart();
    updateLoadOptimizationMetrics();
    
    // 获取是否启用需量电费计算
    const enableDemandCharge = $('#enable_demand_charge').is(':checked');
    
    // 获取最新计算的负荷降低量
    const loadReduction = parseFloat($('#load_reduction').text()) || 0;
    console.log("发送到后端的负荷降低量:", loadReduction); 
    console.log("需量电费计算是否启用:", enableDemandCharge);
    
    const data = {
        capex: $('#capex').val(),
        power: $('#power').val(),
        energy: $('#energy').val(),
        energy_capacity: $('#energy_capacity').val(),
        price_sharp_peak: $('#price_sharp_peak').val(),
        price_peak: $('#price_peak').val(),
        price_flat: $('#price_flat').val(),
        price_valley: $('#price_valley').val(),
        price_deep_valley: $('#price_deep_valley').val(),
        demand_charge_rate: $('#demand_charge_rate').val(),
        charge_discharge_mode: $('#charge_discharge_mode').val(),
        cycles_per_year: $('#cycles_per_year').val(),
        operation_years: $('#operation_years').val(),
        discount_rate: $('#discount_rate').val(),
        opex_percent: $('#opex_percent').val(),
        capacity_degradation_rate: $('#capacity_degradation_rate').val(),
        warranty_period: $('#warranty_period').val(),
        maintenance_cost: maintenanceCost,
        battery_cycle_life: $('#battery_cycle_life').val(),
        battery_replacement_cost: $('#battery_replacement_cost').val(),
        charging_efficiency: $('#charging_efficiency').val(),
        discharging_efficiency: $('#discharging_efficiency').val(),
        maintenance_cost_growth_rate: $('#maintenance_cost_growth_rate').val(),
        single_charge_price: $('#single_charge_price').val(),
        single_discharge_price: $('#single_discharge_price').val(),
        first_charge_price: $('#first_charge_price').val(),
        first_discharge_price: $('#first_discharge_price').val(),
        second_charge_price: $('#second_charge_price').val(),
        second_discharge_price: $('#second_discharge_price').val(),
        monthly_consumption: $('#monthly_consumption').val(),
        hourly_loads: getHourlyLoads(),
        load_reduction: loadReduction,
        enable_demand_charge: enableDemandCharge, // 添加此参数传递给后端
    };
    
    $.ajax({
        url: '/calculate',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(response) {
            console.log('接收到响应:', response);
            // 检查需量电费影响数据
            if (response.metrics.demand_charge_impacts) {
                console.log("需量电费影响数据:", response.metrics.demand_charge_impacts);
            }
            
            // 恢复按钮状态
            $('#calculate-button').prop('disabled', false).text('计算分析结果');
            
            // 更新结果显示
            updateResultsDisplay(response);
        },
        error: function(xhr, status, error) {
            console.error('Error:', error);
            console.log('Status:', status);
            console.log('Response:', xhr.responseText);
            
            // 恢复按钮状态
            $('#calculate-button').prop('disabled', false).text('计算分析结果');
            
            // 显示错误消息
            alert('计算过程中发生错误，请检查参数后重试');
        }
    });
}

// 更新计算结果后的回调函数
function updateResultsDisplay(response) {
    // 更新基本指标
    $('#npv').text(response.metrics.npv.toFixed(2));
    $('#irr').text(response.metrics.irr !== null ? response.metrics.irr.toFixed(2) : '无法计算');
    $('#lcos').text(response.metrics.lcos.toFixed(2));
    $('#payback_period').text(response.metrics.payback_period !== null ? response.metrics.payback_period.toFixed(1) : '无法计算');
    $('#result_system_efficiency').text($('#system_efficiency').text());
    
    // 更新其他计算值
    updateCalculatedValues(response);
    
    // 渲染图表
    if (response.chart) {
        Plotly.newPlot('chart', JSON.parse(response.chart));
    }
    
    // 更新LCOS组成部分的具体数值和占比
    const components = response.metrics.lcos_components;
    
    // 计算总LCOS
    const totalLCOS = Object.values(components).reduce((sum, value) => sum + value, 0);
    
    // 更新成本数值
    $('#initial_cost_per_kwh').text(components['初始投资'].toFixed(2));
    $('#om_cost_per_kwh').text(components['运维成本'].toFixed(2));
    $('#charging_cost_per_kwh').text(components['充电成本'].toFixed(2));
    $('#replacement_cost_per_kwh').text(components['更换成本'].toFixed(2));
    
    // 更新成本占比
    $('#initial_cost_percent').text(((components['初始投资'] / totalLCOS) * 100).toFixed(1));
    $('#om_cost_percent').text(((components['运维成本'] / totalLCOS) * 100).toFixed(1));
    $('#charging_cost_percent').text(((components['充电成本'] / totalLCOS) * 100).toFixed(1));
    $('#replacement_cost_percent').text(((components['更换成本'] / totalLCOS) * 100).toFixed(1));
    
    // 使用自定义配置渲染LCOS饼图
    if (response.metrics.lcos_components) {
        const pieData = updateLCOSPieChart(components);
        Plotly.newPlot('lcos_pie_chart', pieData.data, pieData.layout);
    }
    
    // 更新负荷优化数据和图表
    updateModifiedLoadChart();
    updateLoadOptimizationMetrics();
    updateChargingDischargeInfo();
    
    // 确保计算需量电费
    calculateDemandCharge();
    
    // 显示结果标签页
    $('.results').show();
    $('.results-tabs .tab[data-tab="summary-tab"]').click();
    
    // 先移除之前添加的需量电费提示
    $('#npv').closest('.param-group').find('.demand-impact-notice').remove();
    
    // 如果启用了需量电费计算，添加提示
    if ($('#enable_demand_charge').is(':checked')) {
        // 添加需量电费影响提示
        const annualImpact = response.metrics.annual_demand_impact || 0;
        let impactText = annualImpact >= 0 ? '需量电费节省(元/年)' : '需量电费增加(元/年)';
        let impactClass = annualImpact >= 0 ? 'positive' : 'negative';
        
        // 创建格式一致的提示
        let impactInfo = `<p class="demand-impact-notice">
                            ${impactText}: 
                            <span class="${impactClass} display-only">
                                ${Math.abs(annualImpact).toFixed(2)}
                            </span>
                        </p>`;
        
        // 在经济指标卡片添加提示
        $('#npv').closest('.param-group').append(impactInfo);
    }
}

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
}

// 更新计算结果显示
function updateCalculatedValues(response) {
    // 系统参数
    $('#rated_capacity').text((response.metrics.rated_capacity || 0).toFixed(2));
    $('#effective_capacity').text((response.metrics.effective_capacity || 0).toFixed(2));
    
    // 每日运行数据
    $('#daily_charge_energy').text((response.metrics.daily_charge_energy || 0).toFixed(2));
    $('#daily_discharge_energy').text((response.metrics.daily_discharge_energy || 0).toFixed(2));
    $('#daily_charge_cost').text((response.metrics.daily_charge_cost || 0).toFixed(2));
    $('#daily_discharge_income').text((response.metrics.daily_discharge_income || 0).toFixed(2));
    $('#daily_net_income').text((response.metrics.daily_net_income || 0).toFixed(2));
    
    // 年度运行数据
    $('#yearly_operation_days').text((response.metrics.yearly_operation_days || 0).toFixed(0));
    $('#first_year_charge').text(((response.metrics.first_year_charge || 0) / 1000).toFixed(2));
    $('#first_year_discharge').text(((response.metrics.first_year_discharge || 0) / 1000).toFixed(2));
    $('#first_year_charge_cost').text(((response.metrics.first_year_charge_cost || 0) / 10000).toFixed(2));
    $('#first_year_discharge_income').text(((response.metrics.first_year_discharge_income || 0) / 10000).toFixed(2));
    $('#first_year_net_income').text(((response.metrics.first_year_net_income || 0) / 10000).toFixed(2));
    
    // 维护成本数据
    $('#warranty_maintenance_cost').text(((response.metrics.warranty_maintenance_cost || 0) / 10000).toFixed(2));
    $('#first_year_after_warranty_cost').text(((response.metrics.first_year_after_warranty_cost || 0) / 10000).toFixed(2));
    $('#maintenance_growth_rate').text(((response.metrics.maintenance_growth_rate || 0) * 100).toFixed(2));
    
    // 电池寿命数据
    $('#first_replacement_year').text(response.metrics.first_replacement_year || '-');
    $('#cycles_per_year_result').text(response.metrics.cycles_per_year || '-');
    $('#total_cycles').text(response.metrics.total_cycles || '-');
    $('#current_capacity_percent').text((((response.metrics.current_capacity_percent || 0) * 100).toFixed(2)));
}

// 显示欢迎消息
function showWelcomeMessage() {
    // 如果需要显示欢迎消息，可以在这里实现
    console.log('储能系统经济性分析计算器已加载完成');
}

// 更新LCOS饼图配置
function updateLCOSPieChart(components) {
    const pieData = {
        data: [{
            type: 'pie',
            labels: Object.keys(components),
            values: Object.values(components),
            textinfo: 'label+percent',
            hovertemplate: '%{label}<br>%{value:.2f} 元/kWh<br>占比: %{percent}<extra></extra>',
            marker: {
                colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728']
            },
            textposition: 'outside',
            hole: 0.4
        }],
        layout: {
            title: {
                text: 'LCOS构成分析',
                font: { size: 16 }
            },
            height: 350,
            showlegend: true,
            legend: {
                orientation: 'h',
                yanchor: 'bottom',
                y: -0.15,
                xanchor: 'center',
                x: 0.5
            },
            margin: {
                t: 40,
                b: 40,
                l: 20,
                r: 20
            },
            annotations: [
                {
                    text: 'LCOS<br>' + $('#lcos').text(),
                    showarrow: false,
                    font: {
                        size: 14,
                        color: '#333',
                        fontWeight: 'bold'
                    },
                    x: 0.5,
                    y: 0.5
                }
            ]
        }
    };
    
    return pieData;
}

// 根据储能柜数量和单柜参数更新系统参数
function updateStorageSystemParameters() {
    const cabinetCount = parseInt($('#cabinet_count').val()) || 1;
    const singlePower = parseInt($('#single_cabinet_power').val()) || 125;
    const singleCapacity = parseInt($('#single_cabinet_capacity').val()) || 261;
    
    // 计算总功率、容量和储能时长
    const totalPower = cabinetCount * singlePower;
    const totalCapacity = cabinetCount * singleCapacity;
    const storageHours = totalCapacity / totalPower;
    
    // 更新显示
    $('#power').val(totalPower);
    $('#energy_capacity').val(totalCapacity);
    $('#energy').val(storageHours.toFixed(2));
    
    // 计算并更新系统效率
    updateSystemEfficiency();
    
    // 提供投资估算建议（如果需要）
    if ($('#capex').val() === '520000' && cabinetCount !== 2) {
        // 基于2柜默认值520000元进行简单估算
        const estimatedInvestment = 260000 * cabinetCount;
        $('#capex').val(estimatedInvestment);
    }
}

// 更新年维护费用
function updateMaintenanceCost() {
    const capex = parseFloat($('#capex').val()) || 0;
    const opexPercent = parseFloat($('#opex_percent').val()) || 0;
    
    // 计算年维护费用
    const maintenanceCost = capex * (opexPercent / 100);
    
    // 显示计算结果
    $('#calculated_maintenance_cost').text(maintenanceCost.toFixed(0));
}

// 初始化电价时间设置
function initializePriceTimeSettings() {
    const timeInputs = $('input[type="time"]');
    const priceInputs = $('.price-group input[type="number"]');
    
    timeInputs.add(priceInputs).on('change', function() {
        updatePriceTimeChart();
    });
    
    setupCheckboxHandlers();
    
    // 确保已勾选的复选框对应的输入框是启用的
    $('#flat_enable_2, #flat_enable_3, #valley_enable_2').each(function() {
        if ($(this).is(':checked')) {
            const timeInputs = $(this).closest('.time-range').find('input[type="time"]');
            timeInputs.prop('disabled', false);
        }
    });
    
    // 添加需量电价变化事件监听
    $('#demand_charge_rate').on('input', function() {
        calculateDemandCharge();
    });
    
    updatePriceTimeChart();
}

// 计算需量电费影响
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