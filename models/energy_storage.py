from models.common import SystemCalculator

class EnergyStorageCalculator(SystemCalculator):
    """储能系统经济性计算器"""
    
    def __init__(self, capex, power, energy, energy_capacity, 
                 price_peak, price_sharp_peak, price_flat, price_valley, price_deep_valley,
                 operation_years, discount_rate, opex_percent, charge_discharge_mode,
                 capacity_degradation_rate, warranty_period, maintenance_cost,
                 battery_cycle_life, battery_replacement_cost,
                 charging_efficiency, discharging_efficiency,
                 maintenance_cost_growth_rate,
                 single_charge_price_type=None,
                 single_discharge_price_type=None,
                 first_charge_price_type=None,
                 first_discharge_price_type=None,
                 second_charge_price_type=None,
                 second_discharge_price_type=None):
        """
        初始化储能系统计算器
        
        参数:
            capex (float): 系统初始投资
            power (float): 系统功率 (kW)
            energy (float): 储能时长 (h)
            energy_capacity (float): 系统容量 (kWh)
            price_peak, price_sharp_peak, price_flat, price_valley, price_deep_valley (float): 不同时段电价
            operation_years (int): 系统运营年限
            discount_rate (float): 贴现率
            opex_percent (float): 年运维成本比例 (%)
            charge_discharge_mode (str): 充放电模式 ('single' 或 'double')
            capacity_degradation_rate (float): 电池容量衰减率 (%)
            warranty_period (int): 质保期 (年)
            maintenance_cost (float): 年度维护成本 (元)
            battery_cycle_life (float): 电池循环寿命 (次)
            battery_replacement_cost (float): 电池更换成本 (元)
            charging_efficiency, discharging_efficiency (float): 充放电效率 (%)
            maintenance_cost_growth_rate (float): 维护成本年增长率 (%)
            single_charge_price_type, single_discharge_price_type, 
            first_charge_price_type, first_discharge_price_type,
            second_charge_price_type, second_discharge_price_type (str): 电价类型选择
        """
        # 调用基类初始化方法
        super().__init__(
            capex=capex,
            operation_years=operation_years,
            discount_rate=discount_rate,
            maintenance_cost=maintenance_cost,
            warranty_period=warranty_period,
            maintenance_cost_growth_rate=maintenance_cost_growth_rate
        )
        
        # 储能系统特有属性
        self.power = power
        self.energy = energy
        self.energy_capacity = energy_capacity
        self.price_peak = price_peak
        self.price_sharp_peak = price_sharp_peak
        self.price_flat = price_flat
        self.price_valley = price_valley
        self.price_deep_valley = price_deep_valley
        self.opex_percent = opex_percent
        self.charge_discharge_mode = charge_discharge_mode
        self.capacity_degradation_rate = capacity_degradation_rate / 100 if capacity_degradation_rate > 1 else capacity_degradation_rate
        self.battery_cycle_life = battery_cycle_life
        self.battery_replacement_cost = battery_replacement_cost
        self.charging_efficiency = charging_efficiency / 100 if charging_efficiency > 1 else charging_efficiency
        self.discharging_efficiency = discharging_efficiency / 100 if discharging_efficiency > 1 else discharging_efficiency
        self.system_efficiency = self.charging_efficiency * self.discharging_efficiency
        
        # 创建电价类型到实际电价的映射
        self.price_map = {
            'deep_valley': price_deep_valley,
            'valley': price_valley,
            'flat': price_flat,
            'peak': price_peak,
            'sharp_peak': price_sharp_peak
        }
        
        # 存储充放电电价类型选择
        self.single_charge_price_type = single_charge_price_type or 'deep_valley'
        self.single_discharge_price_type = single_discharge_price_type or 'sharp_peak'
        self.first_charge_price_type = first_charge_price_type or 'deep_valley'
        self.first_discharge_price_type = first_discharge_price_type or 'sharp_peak'
        self.second_charge_price_type = second_charge_price_type or 'valley'
        self.second_discharge_price_type = second_discharge_price_type or 'peak'

    def get_price_by_type(self, price_type):
        """根据电价类型获取实际电价"""
        return self.price_map.get(price_type, 0)

    def calculate_daily_revenue(self, current_capacity):
        """
        计算每日收益（考虑用户选择的电价）
        
        参数:
            current_capacity (float): 当前电池容量
            
        返回:
            dict: 包含每日收益数据的字典
        """
        if self.charge_discharge_mode == "single":
            # 一充一放模式
            charge_price = self.get_price_by_type(self.single_charge_price_type)
            discharge_price = self.get_price_by_type(self.single_discharge_price_type)
            
            # 考虑充放电效率
            charge_energy = min(self.power * self.energy, current_capacity)
            discharge_energy = charge_energy * self.system_efficiency
            
            # 计算成本和收入
            charge_cost = charge_energy * charge_price
            discharge_income = discharge_energy * discharge_price
            
        else:
            # 两充两放模式
            first_charge_price = self.get_price_by_type(self.first_charge_price_type)
            first_discharge_price = self.get_price_by_type(self.first_discharge_price_type)
            second_charge_price = self.get_price_by_type(self.second_charge_price_type)
            second_discharge_price = self.get_price_by_type(self.second_discharge_price_type)
            
            # 每次充放电量为总容量的一半
            charge_energy = min(self.power * self.energy / 2, current_capacity / 2)
            discharge_energy = charge_energy * self.system_efficiency
            
            # 计算两次充放电的成本和收入
            first_charge_cost = charge_energy * first_charge_price
            first_discharge_income = discharge_energy * first_discharge_price
            second_charge_cost = charge_energy * second_charge_price
            second_discharge_income = discharge_energy * second_discharge_price
            
            charge_cost = first_charge_cost + second_charge_cost
            discharge_income = first_discharge_income + second_discharge_income
            
        daily_revenue = discharge_income - charge_cost
        
        return {
            'daily_revenue': daily_revenue,
            'charge_energy': charge_energy * (2 if self.charge_discharge_mode == "double" else 1),
            'discharge_energy': discharge_energy * (2 if self.charge_discharge_mode == "double" else 1),
            'charge_cost': charge_cost,
            'discharge_income': discharge_income
        }

    def calculate_first_replacement_year(self, cycles_per_year):
        """计算首次电池更换年份"""
        years_to_replacement = self.battery_cycle_life / cycles_per_year
        return int(years_to_replacement) if years_to_replacement > 0 else float('inf')

    def calculate_cash_flows(self, cycles_per_year):
        """
        计算现金流和详细运营数据
        
        参数:
            cycles_per_year (float): 每年充放电循环次数
            
        返回:
            tuple: (现金流列表, 年收益列表, 日收益列表, 维护成本列表, 运营数据字典)
        """
        cash_flows = []
        annual_revenues = []
        daily_revenues = []
        maintenance_costs = []
        capacity_percentages = []
        total_cycles = 0
        current_capacity = self.energy_capacity
        daily_data = None  # 用于存储第一年的每日数据

        for year in range(self.operation_years + 1):
            if year == 0:
                # 初始投资年
                cash_flow = -self.capex
                annual_revenue = 0
                daily_revenue = 0
                maintenance_cost = 0
                capacity_percentages.append(100)
            else:
                # 计算当年收益（考虑容量衰减）
                daily_data = self.calculate_daily_revenue(current_capacity)
                daily_revenue = daily_data['daily_revenue']
                annual_revenue = daily_revenue * cycles_per_year
                
                # 计算维护成本（使用基类方法）
                maintenance_cost = self.calculate_maintenance_cost(year)
                
                # 计算是否需要更换电池
                total_cycles += cycles_per_year
                battery_replacement = self.battery_replacement_cost if total_cycles > self.battery_cycle_life else 0
                if battery_replacement > 0:
                    total_cycles = 0
                    current_capacity = self.energy_capacity
                
                cash_flow = annual_revenue - maintenance_cost - battery_replacement
                capacity_percentages.append((current_capacity / self.energy_capacity) * 100)
                
                # 更新下一年的容量
                if battery_replacement == 0:
                    current_capacity *= (1 - self.capacity_degradation_rate)

            cash_flows.append(cash_flow)
            annual_revenues.append(annual_revenue)
            daily_revenues.append(daily_revenue)
            maintenance_costs.append(maintenance_cost)

        # 收集详细运营数据
        operation_data = {
            'rated_capacity': self.energy_capacity,
            'effective_capacity': self.energy_capacity * self.system_efficiency,
            'daily_data': daily_data,  # 第一年的每日数据
            'yearly_operation_days': cycles_per_year,
            'first_year_charge': daily_data['charge_energy'] * cycles_per_year if daily_data else 0,
            'first_year_discharge': daily_data['discharge_energy'] * cycles_per_year if daily_data else 0,
            'warranty_maintenance_cost': 0,  # 质保期内维护成本
            'first_year_after_warranty_cost': self.maintenance_cost,  # 质保期后首年维护成本
            'maintenance_growth_rate': self.maintenance_cost_growth_rate,
            'first_replacement_year': self.calculate_first_replacement_year(cycles_per_year),
            'total_cycles': total_cycles,
            'current_capacity_percent': current_capacity / self.energy_capacity if self.energy_capacity != 0 else 0.0,
            'capacity_percentages': capacity_percentages,
            'final_capacity': current_capacity,  # 新增此行
        }

        return cash_flows, annual_revenues, daily_revenues, maintenance_costs, operation_data

    def calculate_lcos_components(self, cycles_per_year, total_energy):
        """
        计算LCOS的各个组成部分
        
        参数:
            cycles_per_year (float): 每年循环次数
            total_energy (float): 系统总放电量
            
        返回:
            dict: LCOS组成部分数据
        """
        years = range(1, self.operation_years + 1)
        discount_factors = self.calculate_discount_factors()
        
        # 初始投资成本
        initial_cost = self.capex
        
        # 运维成本（使用基类方法）
        om_costs = [self.calculate_maintenance_cost(year) for year in years]
        
        # 充电成本
        daily_charge_cost = self.calculate_daily_revenue(self.energy_capacity)['charge_cost']
        annual_charge_costs = [daily_charge_cost * cycles_per_year] * self.operation_years
        
        # 电池更换成本
        replacement_costs = []
        total_cycles = 0
        for year in years:
            total_cycles += cycles_per_year
            if total_cycles > self.battery_cycle_life:
                replacement_costs.append(self.battery_replacement_cost)
                total_cycles = 0
            else:
                replacement_costs.append(0)
        
        # 计算现值
        pv_initial = initial_cost
        pv_om = sum(cost * df for cost, df in zip(om_costs, discount_factors))
        pv_charging = sum(cost * df for cost, df in zip(annual_charge_costs, discount_factors))
        pv_replacement = sum(cost * df for cost, df in zip(replacement_costs, discount_factors))
        
        # 计算每个组成部分的LCOS
        lcos_initial = pv_initial / total_energy
        lcos_om = pv_om / total_energy
        lcos_charging = pv_charging / total_energy
        lcos_replacement = pv_replacement / total_energy
        
        return {
            'components': {
                '初始投资': lcos_initial,
                '运维成本': lcos_om,
                '充电成本': lcos_charging,
                '更换成本': lcos_replacement
            },
            'present_values': {
                'initial': pv_initial,
                'om': pv_om,
                'charging': pv_charging,
                'replacement': pv_replacement
            }
        } 