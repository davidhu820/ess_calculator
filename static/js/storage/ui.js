/**
 * 储能系统UI交互模块
 * 负责储能系统的UI事件处理和视图更新
 */

const StorageUI = {
    /**
     * 初始化储能系统UI
     */
    initialize: function() {
        this.initializeEventListeners();
        this.updateSystemEfficiency();
        this.updateStorageSystemParameters();
        this.updateMaintenanceCost();
    },
    
    /**
     * 初始化事件监听器
     */
    initializeEventListeners: function() {
        // 系统效率计算
        $('#charging_efficiency, #discharging_efficiency').on('input', this.updateSystemEfficiency);
        
        // 储能系统参数更新
        $('#cabinet_count, #single_cabinet_power, #single_cabinet_capacity').on('change', this.updateStorageSystemParameters);
        
        // 总投资和运维成本比例监听
        $('#capex, #opex_percent').on('input', this.updateMaintenanceCost);
        
        // 充放电模式切换
        $('#charge_discharge_mode').on('change', this.toggleChargeDischargeMode);
        
        // 电价时段选择框启用/禁用
        $('#sharp_peak_enable_2, #peak_enable_2, #flat_enable_2, #flat_enable_3, #valley_enable_2, #deep_valley_enable_2')
            .on('change', this.toggleTimeRangeInputs);
        
        // 计算按钮事件
        $('#calculate-button').on('click', this.calculate);
        
        // 需量电费启用复选框
        $('#enable_demand_charge').on('change', this.updateDemandChargeStatus);
        
        // 负荷模式选择
        $('#load_pattern_select').on('change', this.updatePatternDescription);
        
        // 生成示例负荷按钮
        $('#generate_load').on('click', this.generateExampleLoad);

        // 添加对小时负荷输入的监听，当负荷数据变化时清除储能效果缓存
        for (let hour = 0; hour < 24; hour++) {
            $('#hour_' + hour).on('change', function() {
                // 清除储能效果缓存，确保使用最新的负荷数据
                if (StorageCharts && typeof StorageCharts.initialize === 'function') {
                    StorageCharts.storageEffectCache = null;
                }
            });
        }
    },
    
    /**
     * 更新系统效率显示
     */
    updateSystemEfficiency: function() {
        const chargingEff = parseFloat($('#charging_efficiency').val());
        const dischargingEff = parseFloat($('#discharging_efficiency').val());
        const systemEff = StorageCalculator.calculateSystemEfficiency(chargingEff, dischargingEff);
        $('#system_efficiency').text(systemEff.toFixed(2));
    },
    
    /**
     * 更新储能系统参数
     */
    updateStorageSystemParameters: function() {
        const cabinetCount = parseInt($('#cabinet_count').val());
        const singleCabinetPower = parseInt($('#single_cabinet_power').val());
        const singleCabinetCapacity = parseInt($('#single_cabinet_capacity').val());
        
        const params = StorageCalculator.updateSystemParameters(
            cabinetCount,
            singleCabinetPower,
            singleCabinetCapacity
        );
        
        $('#power').val(params.power);
        $('#energy_capacity').val(params.capacity);
        $('#energy').val(params.energyHours.toFixed(2));
        
        StorageUI.updateMaintenanceCost();
    },
    
    /**
     * 计算并显示年维护费用
     */
    updateMaintenanceCost: function() {
        const capex = parseFloat($('#capex').val());
        const opexPercent = parseFloat($('#opex_percent').val());
        
        const maintenanceCost = StorageCalculator.calculateMaintenanceCost(capex, opexPercent);
        $('#calculated_maintenance_cost').text(maintenanceCost.toFixed(0));
    },
    
    /**
     * 切换充放电模式的相关UI元素
     */
    toggleChargeDischargeMode: function() {
        const mode = $(this).val();
        
        if (mode === 'single') {
            $('#single_mode_options').show();
            $('#double_mode_options').hide();
        } else {
            $('#single_mode_options').hide();
            $('#double_mode_options').show();
        }
    },
    
    /**
     * 启用/禁用时间范围输入框
     */
    toggleTimeRangeInputs: function() {
        const checkbox = $(this);
        const timeInputs = checkbox.closest('.time-range').find('input[type="time"]');
        timeInputs.prop('disabled', !checkbox.is(':checked'));
    },
    
    /**
     * 更新负荷模式描述
     */
    updatePatternDescription: function() {
        const pattern = $('#load_pattern_select').val();
        let description = '';
        
        if (pattern === 'day_evening_peak') {
            description = '<strong>模式一说明：</strong>日间和傍晚用电需求较高，凌晨时段用电量显著下降。适合商业办公、居民用户等场景。';
        } else if (pattern === 'balanced') {
            description = '<strong>模式二说明：</strong>用电需求分布均衡，波动较小。适合24小时连续运行的工厂、数据中心等场景。';
        } else if (pattern === 'night_peak') {
            description = '<strong>模式三说明：</strong>夜间用电需求较高，日间用电量较低。适合特殊工业场景或夜间运行的设施。';
        }
        
        $('#pattern_description').html('<p>' + description + '</p>');
    },
    
    /**
     * 生成示例负荷
     */
    generateExampleLoad: function() {
        const pattern = $('#load_pattern_select').val();
        const monthlyConsumption = parseFloat($('#monthly_consumption').val());
        const dailyConsumption = monthlyConsumption / 30;  // 假设每月30天
        
        let loadPattern = [];
        
        // 根据选择的模式生成不同的负荷曲线
        if (pattern === 'day_evening_peak') {
            // 日间和傍晚双高峰模式
            loadPattern = [0.5, 0.4, 0.3, 0.3, 0.4, 0.6, 0.8, 1.1, 1.3, 1.5, 1.6, 1.5, 
                           1.4, 1.3, 1.2, 1.3, 1.5, 1.7, 1.8, 1.6, 1.4, 1.2, 0.9, 0.6];
        } else if (pattern === 'balanced') {
            // 均衡负荷模式
            loadPattern = [0.9, 0.8, 0.8, 0.8, 0.8, 0.9, 1.0, 1.1, 1.2, 1.2, 1.2, 1.2, 
                           1.2, 1.2, 1.1, 1.1, 1.1, 1.1, 1.1, 1.0, 1.0, 1.0, 0.9, 0.9];
        } else if (pattern === 'night_peak') {
            // 夜间高峰模式
            loadPattern = [1.5, 1.6, 1.7, 1.8, 1.7, 1.5, 1.2, 1.0, 0.8, 0.7, 0.6, 0.6, 
                           0.6, 0.7, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.5];
        }
        
        // 计算总和并归一化
        const sum = loadPattern.reduce((a, b) => a + b, 0);
        
        // 计算平均功率
        const avgPower = dailyConsumption / 24;
        
        // 根据月用电量调整负荷曲线
        const hourlyLoads = loadPattern.map(factor => (factor * 24 * avgPower / sum).toFixed(1));
        
        // 更新小时输入框
        for (let hour = 0; hour < 24; hour++) {
            $('#hour_' + hour).val(hourlyLoads[hour]);
        }
        
        // 更新负荷摘要
        StorageUI.updateLoadSummary(hourlyLoads.map(parseFloat));
        
        // 更新负荷图表
        StorageCharts.updateOriginalLoadChart(hourlyLoads.map(parseFloat));
    },
    
    /**
     * 更新负荷摘要信息
     * @param {Array} loads - 负荷数组
     */
    updateLoadSummary: function(loads) {
        const peakLoad = Math.max(...loads);
        const minLoad = Math.min(...loads);
        const avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length;
        const loadFactor = (avgLoad / peakLoad * 100);
        const dailyConsumption = loads.reduce((a, b) => a + b, 0);
        
        $('#peak_load_value').text(peakLoad.toFixed(1));
        $('#min_load_value').text(minLoad.toFixed(1));
        $('#load_factor_value').text(loadFactor.toFixed(1));
        $('#daily_consumption_value').text(dailyConsumption.toFixed(1));
    },
    
    /**
     * 获取小时负荷数据
     * @returns {Array} 24小时负荷数组
     */
    getHourlyLoads: function() {
        // 首先尝试使用原始全局函数，以保持兼容性
        if (typeof getHourlyLoads === 'function') {
            const loads = getHourlyLoads();
            if (loads && loads.length > 0) {
                return loads;
            }
        }
        
        // 如果原始函数不存在或返回的数据无效，则直接读取DOM
        const loads = [];
        for (let hour = 0; hour < 24; hour++) {
            const inputElem = document.getElementById('hour_' + hour);
            const load = inputElem ? parseFloat(inputElem.value) || 0 : 0;
            loads.push(load);
        }
        return loads;
    },
    
    /**
     * 执行计算
     */
    calculate: function() {
        // 显示加载状态
        $('#calculate-button').prop('disabled', true).text('计算中...');
        
        // 更新负荷优化指标，确保计算最新的负荷降低量
        StorageCharts.updateModifiedLoadChart();
        StorageUI.updateLoadOptimizationMetrics();
        
        // 获取需量电费计算状态
        const enableDemandCharge = $('#enable_demand_charge').is(':checked');
        
        // 获取负荷降低量
        const loadReduction = parseFloat($('#load_reduction').text()) || 0;
        
        // 获取系统参数
        const maintenanceCost = parseFloat($('#calculated_maintenance_cost').text());
        
        // 构建请求数据
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
            hourly_loads: StorageUI.getHourlyLoads(),
            load_reduction: loadReduction,
            enable_demand_charge: enableDemandCharge,
        };
        
        // 发送API请求
        $.ajax({
            url: '/calculate',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                // 恢复按钮状态
                $('#calculate-button').prop('disabled', false).text('计算分析结果');
                
                // 更新结果显示
                StorageUI.updateResultsDisplay(response);
            },
            error: function(xhr, status, error) {
                console.error('Error:', error);
                console.log('Status:', status);
                console.log('Response:', xhr.responseText);
                
                // 恢复按钮状态
                $('#calculate-button').prop('disabled', false).text('计算分析结果');
                
                // 显示错误消息
                Utils.showNotification('计算过程中发生错误，请检查参数后重试', 'error');
            }
        });
    },
    
    /**
     * 更新计算结果显示
     * @param {Object} response - API响应数据
     */
    updateResultsDisplay: function(response) {
        // 更新基本指标
        $('#npv').text(response.metrics.npv.toFixed(2));
        $('#irr').text(response.metrics.irr !== null ? response.metrics.irr.toFixed(2) : '无法计算');
        $('#lcos').text(response.metrics.lcos.toFixed(2));
        $('#payback_period').text(response.metrics.payback_period !== null ? response.metrics.payback_period.toFixed(1) : '无法计算');
        $('#result_system_efficiency').text($('#system_efficiency').text());
        
        // 更新LCOS组成部分的具体数值和占比
        const components = response.metrics.lcos_components;
        const totalLCOS = Object.values(components).reduce((sum, value) => sum + value, 0);
        
        $('#initial_cost_per_kwh').text(components['初始投资'].toFixed(2));
        $('#om_cost_per_kwh').text(components['运维成本'].toFixed(2));
        $('#charging_cost_per_kwh').text(components['充电成本'].toFixed(2));
        $('#replacement_cost_per_kwh').text(components['更换成本'].toFixed(2));
        
        $('#initial_cost_percent').text(((components['初始投资'] / totalLCOS) * 100).toFixed(1));
        $('#om_cost_percent').text(((components['运维成本'] / totalLCOS) * 100).toFixed(1));
        $('#charging_cost_percent').text(((components['充电成本'] / totalLCOS) * 100).toFixed(1));
        $('#replacement_cost_percent').text(((components['更换成本'] / totalLCOS) * 100).toFixed(1));
        
        // 更新其他计算值
        $('#rated_capacity').text((response.metrics.rated_capacity || 0).toFixed(2));
        $('#effective_capacity').text((response.metrics.effective_capacity || 0).toFixed(2));
        
        $('#daily_charge_energy').text((response.metrics.daily_charge_energy || 0).toFixed(2));
        $('#daily_discharge_energy').text((response.metrics.daily_discharge_energy || 0).toFixed(2));
        $('#daily_charge_cost').text((response.metrics.daily_charge_cost || 0).toFixed(2));
        $('#daily_discharge_income').text((response.metrics.daily_discharge_income || 0).toFixed(2));
        $('#daily_net_income').text((response.metrics.daily_net_income || 0).toFixed(2));
        
        $('#yearly_operation_days').text((response.metrics.yearly_operation_days || 0).toFixed(0));
        $('#first_year_charge').text(((response.metrics.first_year_charge || 0) / 1000).toFixed(2));
        $('#first_year_discharge').text(((response.metrics.first_year_discharge || 0) / 1000).toFixed(2));
        $('#first_year_charge_cost').text(((response.metrics.first_year_charge_cost || 0) / 10000).toFixed(2));
        $('#first_year_discharge_income').text(((response.metrics.first_year_discharge_income || 0) / 10000).toFixed(2));
        $('#first_year_net_income').text(((response.metrics.first_year_net_income || 0) / 10000).toFixed(2));
        
        $('#warranty_maintenance_cost').text(((response.metrics.warranty_maintenance_cost || 0) / 10000).toFixed(2));
        $('#first_year_after_warranty_cost').text(((response.metrics.first_year_after_warranty_cost || 0) / 10000).toFixed(2));
        $('#maintenance_growth_rate').text(((response.metrics.maintenance_growth_rate || 0) * 100).toFixed(2));
        
        $('#first_replacement_year').text(response.metrics.first_replacement_year || '-');
        $('#cycles_per_year_result').text(response.metrics.cycles_per_year || '-');
        $('#total_cycles').text(response.metrics.total_cycles || '-');
        $('#capacity_degradation_rate_result').text((response.metrics.capacity_degradation_rate || 2).toFixed(1));
        $('#current_capacity_percent').text((((response.metrics.current_capacity_percent || 0) * 100).toFixed(2)));
        
        // 渲染图表
        if (response.chart) {
            Plotly.newPlot('chart', JSON.parse(response.chart));
        }
        
        // 渲染LCOS饼图
        if (response.lcos_pie) {
            Plotly.newPlot('lcos_pie_chart', JSON.parse(response.lcos_pie));
        }
        
        // 显示需量电费影响提示（如果启用）
        StorageUI.updateDemandChargeImpactDisplay(response.metrics);
        
        // 显示结果标签页
        $('.results').show();
        TabManager.activateTab('summary-tab', '.results-tabs');
    },
    
    /**
     * 更新负荷优化指标
     */
    updateLoadOptimizationMetrics: function() {
        const storageEffect = StorageCharts.getStorageEffect();
        
        if (!storageEffect) return;
        
        const { originalLoads, modifiedLoads } = storageEffect;
        const metrics = StorageCalculator.calculateLoadOptimizationMetrics(originalLoads, modifiedLoads);
        
        $('#original_peak_load').text(metrics.originalPeakLoad.toFixed(1));
        $('#modified_peak_load').text(metrics.modifiedPeakLoad.toFixed(1));
        $('#load_reduction').text(metrics.loadReduction.toFixed(1));
        
        $('#original_load_factor').text(metrics.originalLoadFactor.toFixed(1));
        $('#modified_load_factor').text(metrics.modifiedLoadFactor.toFixed(1));
        $('#load_factor_improvement').text(metrics.loadFactorImprovement.toFixed(1));
        
        // 更新需量电费计算
        StorageUI.updateDemandChargeStatus();
    },
    
    /**
     * 更新需量电费状态
     */
    updateDemandChargeStatus: function() {
        // 检查是否启用需量电费计算
        const isEnabled = $('#enable_demand_charge').is(':checked');
        
        if (!isEnabled) {
            // 如果未启用，显示为0
            $('#annual_demand_charge_impact').text('0.00');
            $('#monthly_demand_charge_impact').text('0.00');
            $('.status-text').html('需量电费计算已禁用');
            $('#demand_charge_status .status-icon').removeClass('positive negative');
            return;
        }
        
        // 获取原始最大负荷和优化后最大负荷
        const originalPeakLoad = parseFloat($('#original_peak_load').text()) || 0;
        const modifiedPeakLoad = parseFloat($('#modified_peak_load').text()) || 0;
        
        // 获取需量电价
        const demandChargeRate = parseFloat($('#demand_charge_rate').val()) || 38.8;
        
        // 计算负荷变化
        const loadReduction = originalPeakLoad - modifiedPeakLoad;
        
        // 计算需量电费影响
        const demandCharge = StorageCalculator.calculateDemandCharge(loadReduction, demandChargeRate);
        
        // 更新显示
        $('#annual_demand_charge_impact').text(demandCharge.annualImpact.toFixed(2))
            .removeClass('positive negative')
            .addClass(demandCharge.annualImpact >= 0 ? 'positive' : 'negative');
            
        $('#monthly_demand_charge_impact').text(demandCharge.monthlyImpact.toFixed(2))
            .removeClass('positive negative')
            .addClass(demandCharge.monthlyImpact >= 0 ? 'positive' : 'negative');
        
        // 更新状态图标和文本
        const statusIcon = $('#demand_charge_status .status-icon');
        const statusText = $('#demand_charge_status .status-text');
        
        statusIcon.removeClass('positive negative');
        
        if (loadReduction > 0) {
            statusText.html('储能系统可以有效降低最大负荷，节省需量电费');
            statusIcon.addClass('positive');
        } else if (loadReduction < 0) {
            statusText.html('警告：储能系统增加了最大负荷，可能导致需量电费增加');
            statusIcon.addClass('negative');
        } else {
            statusText.html('储能系统对最大负荷无影响，需量电费不变');
        }
    },
    
    /**
     * 更新需量电费影响显示
     * @param {Object} metrics - 计算指标数据
     */
    updateDemandChargeImpactDisplay: function(metrics) {
        // 先移除之前添加的需量电费提示
        $('#npv').closest('.param-group').find('.demand-impact-notice').remove();
        
        // 如果启用了需量电费计算，添加提示
        if ($('#enable_demand_charge').is(':checked')) {
            // 添加需量电费影响提示
            const annualImpact = metrics.annual_demand_impact || 0;
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
    },
    
    /**
     * 更新充放电策略信息显示
     */
    updateChargingDischargeInfo: function() {
        const mode = $('#charge_discharge_mode').val();
        let infoHTML = '<h4>充放电策略</h4>';
        
        if (mode === 'single') {
            const chargeType = $('#single_charge_price option:selected').text();
            const dischargeType = $('#single_discharge_price option:selected').text();
            infoHTML += `<p>使用<strong>一充一放</strong>模式，在${chargeType}时段充电，${dischargeType}时段放电。</p>`;
        } else {
            const firstChargeType = $('#first_charge_price option:selected').text();
            const firstDischargeType = $('#first_discharge_price option:selected').text();
            const secondChargeType = $('#second_charge_price option:selected').text();
            const secondDischargeType = $('#second_discharge_price option:selected').text();
            
            infoHTML += `<p>使用<strong>两充两放</strong>模式：</p>
                        <ul>
                            <li>第一次：${firstChargeType}时段充电，${firstDischargeType}时段放电</li>
                            <li>第二次：${secondChargeType}时段充电，${secondDischargeType}时段放电</li>
                        </ul>`;
        }
        
        $('#charging_discharge_info').html(infoHTML);
    }
};

// 在文档加载完成后初始化
$(document).ready(function() {
    StorageUI.initialize();
}); 