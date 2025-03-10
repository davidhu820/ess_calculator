class EnergyStorageCalculator:
    def __init__(self, capex, power, energy, energy_capacity, 
                 price_peak, price_sharp_peak, price_flat, price_valley, price_deep_valley,
                 operation_years, discount_rate, opex_percent, charge_discharge_mode,
                 capacity_degradation_rate, warranty_period, maintenance_cost,
                 battery_cycle_life, battery_replacement_cost,
                 charging_efficiency, discharging_efficiency,
                 maintenance_cost_growth_rate,
                 # 新增参数
                 single_charge_price_type=None,
                 single_discharge_price_type=None,
                 first_charge_price_type=None,
                 first_discharge_price_type=None,
                 second_charge_price_type=None,
                 second_discharge_price_type=None):
        
        # 保持原有的初始化
        self.capex = capex
        self.power = power
        self.energy = energy
        self.energy_capacity = energy_capacity
        self.price_peak = price_peak
        self.price_sharp_peak = price_sharp_peak
        self.price_flat = price_flat
        self.price_valley = price_valley
        self.price_deep_valley = price_deep_valley
        self.operation_years = operation_years
        self.discount_rate = discount_rate
        self.opex_percent = opex_percent
        self.charge_discharge_mode = charge_discharge_mode
        self.capacity_degradation_rate = capacity_degradation_rate / 100
        self.warranty_period = warranty_period
        self.maintenance_cost = maintenance_cost
        self.battery_cycle_life = battery_cycle_life
        self.battery_replacement_cost = battery_replacement_cost
        self.charging_efficiency = charging_efficiency / 100
        self.discharging_efficiency = discharging_efficiency / 100
        self.system_efficiency = self.charging_efficiency * self.discharging_efficiency
        self.maintenance_cost_growth_rate = maintenance_cost_growth_rate / 100
        
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
        """计算每日收益（考虑用户选择的电价）"""
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
        """计算现金流和详细运营数据"""
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
                
                # 计算维护成本（质保期后开始，并逐年增长）
                if year > self.warranty_period:
                    years_after_warranty = year - self.warranty_period
                    growth_factor = (1 + self.maintenance_cost_growth_rate) ** (years_after_warranty - 1)
                    maintenance_cost = (self.maintenance_cost * growth_factor)
                else:
                    maintenance_cost = 0
                
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
            'current_capacity_percent': current_capacity / self.energy_capacity if self.energy_capacity != 0 else 0.0,  # 避免除以零
            'capacity_percentages': capacity_percentages,
            'final_capacity': current_capacity,  # 新增此行
        }

        return cash_flows, annual_revenues, daily_revenues, maintenance_costs, operation_data

    def calculate_lcos_components(self, cycles_per_year, total_energy):
        """计算LCOS的各个组成部分"""
        years = range(1, self.operation_years + 1)
        discount_factors = [(1 + self.discount_rate) ** -i for i in years]
        
        # 初始投资成本
        initial_cost = self.capex
        
        # 运维成本（考虑质保期和增长率）
        om_costs = []
        for year in years:
            if year > self.warranty_period:
                years_after_warranty = year - self.warranty_period
                growth_factor = (1 + self.maintenance_cost_growth_rate) ** (years_after_warranty - 1)
                om_cost = self.maintenance_cost * growth_factor
            else:
                om_cost = 0
            om_costs.append(om_cost)
        
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