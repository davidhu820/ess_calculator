from models.common import SystemCalculator
import numpy as np

class PhotovoltaicCalculator(SystemCalculator):
    """光伏系统经济性计算器"""
    
    def __init__(self, capex, capacity, operation_years, discount_rate, 
                 annual_generation=None, annual_degradation_rate=0.5,
                 maintenance_cost=0, warranty_period=0, maintenance_cost_growth_rate=0,
                 electricity_price=None, feed_in_tariff=None):
        """
        初始化光伏系统计算器
        
        参数:
            capex (float): 系统初始投资 (元)
            capacity (float): 系统装机容量 (kW)
            operation_years (int): 系统运营年限
            discount_rate (float): 贴现率
            annual_generation (float, optional): 年发电量 (kWh)，如不提供将根据容量自动估算
            annual_degradation_rate (float): 年发电量衰减率 (%)
            maintenance_cost (float): 年度维护成本 (元)
            warranty_period (int): 质保期 (年)
            maintenance_cost_growth_rate (float): 维护成本年增长率 (%)
            electricity_price (float or dict, optional): 电价（元/kWh）或电价时段字典
            feed_in_tariff (float, optional): 上网电价（元/kWh）
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
        
        # 光伏系统特有属性
        self.capacity = capacity  # kW
        self.annual_degradation_rate = annual_degradation_rate / 100 if annual_degradation_rate > 1 else annual_degradation_rate
        
        # 处理年发电量
        if annual_generation is None:
            # 默认按照每kW 1300kWh的年发电量估算（中国平均水平）
            self.annual_generation = capacity * 1300  # kWh
        else:
            self.annual_generation = annual_generation
        
        # 处理电价
        if isinstance(electricity_price, dict):
            self.electricity_price = electricity_price  # 分时电价字典
            self.avg_electricity_price = sum(electricity_price.values()) / len(electricity_price)
        else:
            self.electricity_price = electricity_price or 0.6  # 默认0.6元/kWh
            self.avg_electricity_price = self.electricity_price
        
        # 上网电价
        self.feed_in_tariff = feed_in_tariff or 0.4  # 默认0.4元/kWh
        
        # 初始化自发自用和上网比例
        self.self_consumption_ratio = 0.3  # 默认30%自发自用
        self.grid_feed_in_ratio = 0.7     # 默认70%上网
    
    def set_consumption_patterns(self, self_consumption_ratio):
        """
        设置电力消纳方式
        
        参数:
            self_consumption_ratio (float): 自发自用比例 (0-1)
        """
        self.self_consumption_ratio = max(0, min(1, self_consumption_ratio))
        self.grid_feed_in_ratio = 1 - self.self_consumption_ratio
        
    def calculate_annual_generation(self, year):
        """
        计算特定年份的发电量（考虑衰减）
        
        参数:
            year (int): 年份 (1开始)
            
        返回:
            float: 该年发电量 (kWh)
        """
        if year <= 0:
            return 0
        
        # 考虑年衰减率
        degradation_factor = (1 - self.annual_degradation_rate) ** (year - 1)
        return self.annual_generation * degradation_factor
    
    def calculate_annual_revenue(self, year, electricity_price=None, feed_in_tariff=None):
        """
        计算特定年份的收益
        
        参数:
            year (int): 年份 (1开始)
            electricity_price (float, optional): 电价，如不提供则使用默认值
            feed_in_tariff (float, optional): 上网电价，如不提供则使用默认值
            
        返回:
            float: 该年收益 (元)
        """
        if year <= 0:
            return 0
        
        # 使用提供的参数或默认值
        electricity_price = electricity_price or self.avg_electricity_price
        feed_in_tariff = feed_in_tariff or self.feed_in_tariff
        
        # 计算年发电量
        annual_generation = self.calculate_annual_generation(year)
        
        # 计算自发自用和上网部分的收益
        self_consumption = annual_generation * self.self_consumption_ratio
        grid_feed_in = annual_generation * self.grid_feed_in_ratio
        
        # 自发自用相当于节省的电费，上网部分按照上网电价计算
        self_consumption_revenue = self_consumption * electricity_price
        grid_feed_in_revenue = grid_feed_in * feed_in_tariff
        
        return self_consumption_revenue + grid_feed_in_revenue
    
    def calculate_cash_flows(self):
        """
        计算光伏系统现金流
        
        返回:
            tuple: (现金流列表, 年发电量列表, 年收益列表, 年维护成本列表, 运营数据字典)
        """
        cash_flows = []
        generation_data = []
        revenue_data = []
        maintenance_costs = []
        
        # 初始投资年 (第0年)
        cash_flows.append(-self.capex)
        generation_data.append(0)
        revenue_data.append(0)
        maintenance_costs.append(0)
        
        # 运营期
        for year in range(1, self.operation_years + 1):
            # 计算年发电量
            annual_generation = self.calculate_annual_generation(year)
            generation_data.append(annual_generation)
            
            # 计算年收益
            annual_revenue = self.calculate_annual_revenue(year)
            revenue_data.append(annual_revenue)
            
            # 计算维护成本
            annual_maintenance = self.calculate_maintenance_cost(year)
            maintenance_costs.append(annual_maintenance)
            
            # 计算净现金流
            annual_cash_flow = annual_revenue - annual_maintenance
            cash_flows.append(annual_cash_flow)
        
        # 计算总发电量
        total_generation = sum(generation_data)
        
        # 收集运营数据
        operation_data = {
            'capacity': self.capacity,
            'annual_generation_first_year': self.annual_generation,
            'total_generation': total_generation,
            'annual_degradation_rate': self.annual_degradation_rate,
            'self_consumption_ratio': self.self_consumption_ratio,
            'grid_feed_in_ratio': self.grid_feed_in_ratio,
            'average_electricity_price': self.avg_electricity_price,
            'feed_in_tariff': self.feed_in_tariff
        }
        
        return cash_flows, generation_data, revenue_data, maintenance_costs, operation_data
    
    def calculate_lcoe(self):
        """
        计算平准化度电成本 (LCOE)
        
        返回:
            float: LCOE (元/kWh)
        """
        cash_flows, generation_data, _, maintenance_costs, _ = self.calculate_cash_flows()
        
        # 计算成本现值
        discount_factors = self.calculate_discount_factors()
        maintenance_pv = sum(cost * factor for cost, factor in zip(maintenance_costs[1:], discount_factors))
        total_cost = self.capex + maintenance_pv
        
        # 计算发电量现值
        generation_pv = sum(gen * factor for gen, factor in zip(generation_data[1:], discount_factors))
        
        # 计算LCOE
        if generation_pv == 0:
            return float('inf')
        
        return total_cost / generation_pv 