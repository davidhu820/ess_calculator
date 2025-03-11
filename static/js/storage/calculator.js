/**
 * 储能系统计算模块
 * 提供储能系统相关的所有计算功能
 */

const StorageCalculator = {
    /**
     * 计算系统效率
     * @param {number} chargingEff - 充电效率 (%)
     * @param {number} dischargingEff - 放电效率 (%)
     * @returns {number} 系统效率 (%)
     */
    calculateSystemEfficiency: function(chargingEff, dischargingEff) {
        return (chargingEff / 100) * (dischargingEff / 100) * 100;
    },
    
    /**
     * 更新储能系统参数
     * @param {number} cabinetCount - 储能柜数量
     * @param {number} singleCabinetPower - 单柜功率 (kW)
     * @param {number} singleCabinetCapacity - 单柜容量 (kWh)
     * @returns {Object} 更新后的系统参数
     */
    updateSystemParameters: function(cabinetCount, singleCabinetPower, singleCabinetCapacity) {
        const power = cabinetCount * singleCabinetPower;
        const capacity = cabinetCount * singleCabinetCapacity;
        const energyHours = capacity / power;
        
        return {
            power: power,
            capacity: capacity,
            energyHours: energyHours
        };
    },
    
    /**
     * 计算年维护费用
     * @param {number} capex - 总投资 (元)
     * @param {number} opexPercent - 年运维成本比例 (%)
     * @returns {number} 年维护费用 (元)
     */
    calculateMaintenanceCost: function(capex, opexPercent) {
        return capex * (opexPercent / 100);
    },
    
    /**
     * 计算储能系统与负荷的相互作用
     * @param {Array} originalLoads - 原始负荷数组 (24小时)
     * @param {number} power - 储能系统功率 (kW)
     * @param {number} energy - 储能时长 (h)
     * @param {Object} timeSettings - 充放电时间设置
     * @returns {Object} 计算结果对象
     */
    calculateStorageEffect: function(originalLoads, power, energy, timeSettings) {
        if (!originalLoads || originalLoads.length === 0) {
            return {
                originalLoads: Array(24).fill(0),
                modifiedLoads: Array(24).fill(0)
            };
        }
        
        const modifiedLoads = [...originalLoads];
        const chargeDischargeMode = timeSettings.mode || 'single';
        
        // 设置充放电倍率为0.5C (即充放电需要2小时)
        const chargeDischargeDuration = 2;  // 小时
        
        if (chargeDischargeMode === 'single') {
            // 一充一放模式
            const chargeStartHour = Utils.timeToHours(timeSettings.chargeStart);
            const dischargeStartHour = Utils.timeToHours(timeSettings.dischargeStart);
            
            // 执行充电和放电
            this.applyChargingEffect(modifiedLoads, chargeStartHour, power, chargeDischargeDuration);
            this.applyDischargingEffect(modifiedLoads, dischargeStartHour, power, chargeDischargeDuration);
        } else {
            // 两充两放模式
            const firstChargeStartHour = Utils.timeToHours(timeSettings.firstChargeStart);
            const firstDischargeStartHour = Utils.timeToHours(timeSettings.firstDischargeStart);
            const secondChargeStartHour = Utils.timeToHours(timeSettings.secondChargeStart);
            const secondDischargeStartHour = Utils.timeToHours(timeSettings.secondDischargeStart);
            
            // 先执行第一次充电
            this.applyChargingEffect(modifiedLoads, firstChargeStartHour, power / 2, chargeDischargeDuration);
            
            // 然后执行第一次放电
            this.applyDischargingEffect(modifiedLoads, firstDischargeStartHour, power / 2, chargeDischargeDuration);
            
            // 执行第二次充电和放电
            this.applyChargingEffect(modifiedLoads, secondChargeStartHour, power / 2, chargeDischargeDuration);
            this.applyDischargingEffect(modifiedLoads, secondDischargeStartHour, power / 2, chargeDischargeDuration);
        }
        
        return {
            originalLoads: originalLoads,
            modifiedLoads: modifiedLoads
        };
    },
    
    /**
     * 应用充电效应到负荷曲线
     * @private
     * @param {Array} loads - 负荷数组
     * @param {number} startHour - 开始小时 (可以是小数)
     * @param {number} power - 充电功率
     * @param {number} duration - 持续时间 (小时)
     */
    applyChargingEffect: function(loads, startHour, power, duration) {
        for (let hour = 0; hour < duration; hour++) {
            const currentHour = (startHour + hour) % 24;
            const hourIndex = Math.floor(currentHour);
            const nextHourIndex = (hourIndex + 1) % 24;
            const fraction = currentHour - hourIndex;
            
            if (fraction === 0 || duration === 1) {
                // 如果开始时间是整点，或者持续时间是1小时，则简单地增加负荷
                loads[hourIndex] += power;
            } else {
                // 如果开始时间不是整点，则需要在两个小时之间分配负荷
                loads[hourIndex] += power * (1 - fraction);
                loads[nextHourIndex] += power * fraction;
            }
        }
    },
    
    /**
     * 应用放电效应到负荷曲线
     * @private
     * @param {Array} loads - 负荷数组
     * @param {number} startHour - 开始小时 (可以是小数)
     * @param {number} power - 放电功率
     * @param {number} duration - 持续时间 (小时)
     */
    applyDischargingEffect: function(loads, startHour, power, duration) {
        for (let hour = 0; hour < duration; hour++) {
            const currentHour = (startHour + hour) % 24;
            const hourIndex = Math.floor(currentHour);
            const nextHourIndex = (hourIndex + 1) % 24;
            const fraction = currentHour - hourIndex;
            
            if (fraction === 0 || duration === 1) {
                // 如果开始时间是整点，或者持续时间是1小时，则简单地减少负荷
                loads[hourIndex] = Math.max(0, loads[hourIndex] - power);
            } else {
                // 如果开始时间不是整点，则需要在两个小时之间分配负荷减少
                loads[hourIndex] = Math.max(0, loads[hourIndex] - power * (1 - fraction));
                loads[nextHourIndex] = Math.max(0, loads[nextHourIndex] - power * fraction);
            }
        }
    },
    
    /**
     * 计算负荷优化指标
     * @param {Array} originalLoads - 原始负荷数组
     * @param {Array} modifiedLoads - 修改后的负荷数组
     * @returns {Object} 优化指标对象
     */
    calculateLoadOptimizationMetrics: function(originalLoads, modifiedLoads) {
        const originalPeakLoad = Math.max(...originalLoads);
        const modifiedPeakLoad = Math.max(...modifiedLoads);
        const loadReduction = originalPeakLoad - modifiedPeakLoad;
        
        const originalAvg = originalLoads.reduce((a, b) => a + b, 0) / originalLoads.length;
        const modifiedAvg = modifiedLoads.reduce((a, b) => a + b, 0) / modifiedLoads.length;
        
        const originalLoadFactor = (originalAvg / originalPeakLoad * 100);
        const modifiedLoadFactor = (modifiedAvg / modifiedPeakLoad * 100);
        const loadFactorImprovement = modifiedLoadFactor - originalLoadFactor;
        
        return {
            originalPeakLoad: originalPeakLoad,
            modifiedPeakLoad: modifiedPeakLoad,
            loadReduction: loadReduction,
            originalLoadFactor: originalLoadFactor,
            modifiedLoadFactor: modifiedLoadFactor,
            loadFactorImprovement: loadFactorImprovement
        };
    },
    
    /**
     * 计算需量电费
     * @param {number} loadReduction - 负荷降低量 (kW)
     * @param {number} demandChargeRate - 需量电价 (元/kW·月)
     * @returns {Object} 需量电费计算结果
     */
    calculateDemandCharge: function(loadReduction, demandChargeRate) {
        const monthlyImpact = loadReduction * demandChargeRate;
        const annualImpact = monthlyImpact * 12;
        
        return {
            loadChange: loadReduction,
            monthlyImpact: monthlyImpact,
            annualImpact: annualImpact
        };
    },
    
    /**
     * 获取充放电时间设置
     * @param {string} mode - 充放电模式 ('single' 或 'double')
     * @param {Object} timeSettings - 用户配置的时间设置
     * @returns {Object} 处理后的时间设置
     */
    getChargeDischargeTimeSettings: function(mode, timeSettings = {}) {
        if (mode === 'single') {
            return {
                mode: 'single',
                chargeStart: timeSettings.chargeStart || '11:00',  // 深谷时段
                dischargeStart: timeSettings.dischargeStart || '17:00'  // 尖峰时段
            };
        } else {
            return {
                mode: 'double',
                firstChargeStart: timeSettings.firstChargeStart || '11:00',  // 深谷时段
                firstDischargeStart: timeSettings.firstDischargeStart || '17:00',  // 尖峰时段
                secondChargeStart: timeSettings.secondChargeStart || '10:00',  // 谷时段
                secondDischargeStart: timeSettings.secondDischargeStart || '21:00'  // 峰时段
            };
        }
    }
};

// 导出储能计算器
window.StorageCalculator = StorageCalculator; 