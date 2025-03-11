/**
 * 光伏系统计算模块
 * 提供光伏系统相关的所有计算功能
 */

const PVCalculator = {
    /**
     * 计算光伏装机容量
     * @param {number} areaPV - 光伏面积 (m²)
     * @param {number} efficiency - 转换效率 (%)
     * @returns {number} 装机容量 (kW)
     */
    calculateCapacity: function(areaPV, efficiency) {
        // 标准测试条件下的光照强度: 1kW/m²
        const standardIrradiance = 1.0; // kW/m²
        return areaPV * (efficiency / 100) * standardIrradiance;
    },
    
    /**
     * 估算年发电量
     * @param {number} capacity - 装机容量 (kW)
     * @param {number} location - 地区辐照系数
     * @param {number} efficiencyLoss - 效率损失 (%)
     * @returns {number} 年发电量 (kWh)
     */
    estimateAnnualGeneration: function(capacity, location, efficiencyLoss) {
        // 根据地区的年日照时长计算
        const regionMultipliers = {
            'north': 1100,     // 华北地区
            'east': 1200,      // 华东地区
            'south': 1300,     // 华南地区
            'southwest': 1450, // 西南地区
            'northwest': 1600, // 西北地区
            'northeast': 1050  // 东北地区
        };
        
        const baseMultiplier = regionMultipliers[location] || 1300; // 默认值
        const efficiencyFactor = 1 - (efficiencyLoss / 100);
        
        return capacity * baseMultiplier * efficiencyFactor;
    },
    
    /**
     * 计算月发电量分布
     * @param {number} annualGeneration - 年发电量 (kWh)
     * @param {string} location - 地区
     * @returns {Array} 12个月的发电量数组
     */
    calculateMonthlyGeneration: function(annualGeneration, location) {
        // 不同地区各月份占年发电量的比例
        const monthlyRatios = {
            'north': [0.05, 0.06, 0.08, 0.09, 0.1, 0.11, 0.11, 0.1, 0.09, 0.08, 0.07, 0.06],
            'east': [0.06, 0.06, 0.07, 0.09, 0.1, 0.1, 0.11, 0.11, 0.09, 0.08, 0.07, 0.06],
            'south': [0.07, 0.07, 0.08, 0.09, 0.09, 0.08, 0.09, 0.09, 0.09, 0.09, 0.08, 0.08],
            'southwest': [0.07, 0.07, 0.09, 0.09, 0.09, 0.08, 0.08, 0.09, 0.09, 0.09, 0.08, 0.08],
            'northwest': [0.05, 0.06, 0.08, 0.09, 0.1, 0.11, 0.12, 0.11, 0.09, 0.08, 0.06, 0.05],
            'northeast': [0.05, 0.06, 0.07, 0.09, 0.1, 0.11, 0.12, 0.11, 0.09, 0.08, 0.07, 0.05]
        };
        
        const ratios = monthlyRatios[location] || monthlyRatios['east']; // 默认使用华东地区
        return ratios.map(ratio => annualGeneration * ratio);
    },
    
    /**
     * 计算日发电量曲线
     * @param {number} dailyGeneration - 日发电量 (kWh)
     * @param {string} season - 季节 ('spring', 'summer', 'autumn', 'winter')
     * @returns {Array} 24小时发电量数组
     */
    calculateHourlyGeneration: function(dailyGeneration, season) {
        // 不同季节的光照强度分布
        const hourlyPatterns = {
            'spring': [0, 0, 0, 0, 0, 0.01, 0.03, 0.05, 0.07, 0.09, 0.11, 0.12, 0.13, 0.12, 0.1, 0.08, 0.06, 0.03, 0, 0, 0, 0, 0, 0],
            'summer': [0, 0, 0, 0, 0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.11, 0.12, 0.12, 0.11, 0.09, 0.07, 0.05, 0.03, 0, 0, 0, 0, 0, 0],
            'autumn': [0, 0, 0, 0, 0, 0.01, 0.03, 0.05, 0.08, 0.1, 0.12, 0.13, 0.12, 0.1, 0.09, 0.07, 0.05, 0.02, 0.03, 0, 0, 0, 0, 0],
            'winter': [0, 0, 0, 0, 0, 0, 0.02, 0.04, 0.07, 0.09, 0.11, 0.13, 0.13, 0.11, 0.09, 0.06, 0.04, 0.01, 0, 0, 0, 0, 0, 0]
        };
        
        const pattern = hourlyPatterns[season] || hourlyPatterns['summer']; // 默认使用夏季
        return pattern.map(ratio => dailyGeneration * ratio);
    },
    
    /**
     * 计算逆变器功率
     * @param {number} pvCapacity - 光伏装机容量 (kW)
     * @param {number} dcAcRatio - 直流/交流比
     * @returns {number} 逆变器功率 (kW)
     */
    calculateInverterPower: function(pvCapacity, dcAcRatio) {
        return pvCapacity / dcAcRatio;
    },
    
    /**
     * 计算自发自用和上网电量
     * @param {Array} hourlyGeneration - 小时发电量数组
     * @param {Array} hourlyConsumption - 小时用电量数组
     * @returns {Object} 自发自用和上网电量
     */
    calculateEnergyUsage: function(hourlyGeneration, hourlyConsumption) {
        let selfConsumption = 0;
        let gridFeedIn = 0;
        
        for (let i = 0; i < 24; i++) {
            // 当前小时的发电量和用电量
            const generation = hourlyGeneration[i] || 0;
            const consumption = hourlyConsumption[i] || 0;
            
            // 自发自用部分：取发电量和用电量的较小值
            const hourSelfConsumption = Math.min(generation, consumption);
            selfConsumption += hourSelfConsumption;
            
            // 上网部分：发电量超过用电量的部分
            const hourGridFeedIn = Math.max(0, generation - consumption);
            gridFeedIn += hourGridFeedIn;
        }
        
        return {
            selfConsumption: selfConsumption,
            gridFeedIn: gridFeedIn,
            totalGeneration: selfConsumption + gridFeedIn
        };
    },
    
    /**
     * 计算经济性指标
     * @param {number} capacity - 装机容量 (kW)
     * @param {number} annualGeneration - 年发电量 (kWh)
     * @param {number} selfConsumptionRatio - 自发自用比例 (0-1)
     * @param {number} electricityPrice - 电价 (元/kWh)
     * @param {number} feedInTariff - 上网电价 (元/kWh)
     * @param {number} capex - 初始投资 (元)
     * @param {number} opex - 年运维成本 (元)
     * @param {number} lifespan - 系统寿命 (年)
     * @param {number} discountRate - 贴现率 (0-1)
     * @param {number} degradationRate - 年衰减率 (%) 
     * @returns {Object} 经济性指标对象
     */
    calculateEconomics: function(
        capacity, annualGeneration, selfConsumptionRatio, 
        electricityPrice, feedInTariff, capex, 
        opex, lifespan, discountRate, degradationRate
    ) {
        // 计算现金流
        const cashFlows = [-capex]; // 第0年为初始投资（负值）
        
        // 计算年收益和成本
        for (let year = 1; year <= lifespan; year++) {
            // 考虑发电量衰减
            const yearDegradation = (1 - degradationRate / 100) ** (year - 1);
            const yearGeneration = annualGeneration * yearDegradation;
            
            // 自发自用和上网电量
            const selfConsumption = yearGeneration * selfConsumptionRatio;
            const gridFeedIn = yearGeneration * (1 - selfConsumptionRatio);
            
            // 计算收益
            const selfConsumptionSavings = selfConsumption * electricityPrice;
            const gridFeedInIncome = gridFeedIn * feedInTariff;
            const totalIncome = selfConsumptionSavings + gridFeedInIncome;
            
            // 计算年度现金流
            const yearCashFlow = totalIncome - opex;
            cashFlows.push(yearCashFlow);
        }
        
        // 使用财务模块计算指标
        const npv = cashFlows.reduce((sum, cf, i) => sum + cf / ((1 + discountRate) ** i), 0);
        
        // 计算IRR
        let irr = null;
        try {
            // 使用二分法近似计算IRR
            let lowerRate = -0.99;
            let upperRate = 1;
            let midRate, npvAtMid;
            
            for (let i = 0; i < 1000; i++) {
                midRate = (lowerRate + upperRate) / 2;
                npvAtMid = cashFlows.reduce((sum, cf, i) => sum + cf / ((1 + midRate) ** i), 0);
                
                if (Math.abs(npvAtMid) < 0.0001) break;
                
                if (npvAtMid > 0) {
                    lowerRate = midRate;
                } else {
                    upperRate = midRate;
                }
            }
            
            irr = midRate * 100; // 转为百分比
        } catch (e) {
            console.error("IRR计算失败", e);
        }
        
        // 计算回收期
        let paybackPeriod = lifespan;
        let cumulativeCashFlow = -capex;
        for (let i = 1; i <= lifespan; i++) {
            cumulativeCashFlow += cashFlows[i];
            if (cumulativeCashFlow >= 0) {
                paybackPeriod = i;
                break;
            }
        }
        
        // 计算LCOE (平准化度电成本)
        const totalGeneration = annualGeneration * (1 - ((1 - (1 - degradationRate / 100) ** lifespan) / (degradationRate / 100) / lifespan));
        const totalCosts = capex + opex * lifespan;
        const lcoe = totalCosts / (totalGeneration * lifespan);
        
        return {
            npv: npv,
            irr: irr,
            paybackPeriod: paybackPeriod,
            lcoe: lcoe,
            cashFlows: cashFlows,
            annualGeneration: annualGeneration,
            totalGeneration: totalGeneration,
            selfConsumptionRatio: selfConsumptionRatio,
            selfConsumption: annualGeneration * selfConsumptionRatio,
            gridFeedIn: annualGeneration * (1 - selfConsumptionRatio)
        };
    }
};

// 导出光伏计算器
window.PVCalculator = PVCalculator; 