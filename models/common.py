import numpy as np

class SystemCalculator:
    """能源系统计算器的基类，包含所有能源系统共享的基本功能"""
    
    def __init__(self, capex, operation_years, discount_rate, maintenance_cost=0, 
                 warranty_period=0, maintenance_cost_growth_rate=0):
        """
        初始化系统计算器基类
        
        参数:
            capex (float): 系统初始投资
            operation_years (int): 系统运营年限
            discount_rate (float): 贴现率（小数形式，如0.08表示8%）
            maintenance_cost (float): 年度维护成本
            warranty_period (int): 质保期（年）
            maintenance_cost_growth_rate (float): 维护成本年增长率（小数形式）
        """
        self.capex = capex
        self.operation_years = operation_years
        self.discount_rate = discount_rate
        self.maintenance_cost = maintenance_cost
        self.warranty_period = warranty_period
        self.maintenance_cost_growth_rate = maintenance_cost_growth_rate / 100 if maintenance_cost_growth_rate > 1 else maintenance_cost_growth_rate
    
    def calculate_maintenance_cost(self, year):
        """
        计算特定年份的维护成本
        
        参数:
            year (int): 要计算的年份
            
        返回:
            float: 该年份的维护成本
        """
        if year <= 0 or year <= self.warranty_period:
            return 0
        
        years_after_warranty = year - self.warranty_period
        growth_factor = (1 + self.maintenance_cost_growth_rate) ** (years_after_warranty - 1)
        return self.maintenance_cost * growth_factor
    
    def calculate_discount_factors(self):
        """
        计算各年贴现因子
        
        返回:
            list: 运营期内各年贴现因子
        """
        return [(1 + self.discount_rate) ** -i for i in range(1, self.operation_years + 1)]
    
    def calculate_present_value(self, annual_values):
        """
        计算一系列年度现金流的现值
        
        参数:
            annual_values (list): 各年现金流列表
            
        返回:
            float: 现金流现值
        """
        discount_factors = self.calculate_discount_factors()
        if len(annual_values) > len(discount_factors):
            annual_values = annual_values[1:self.operation_years + 1]
        return sum(value * factor for value, factor in zip(annual_values, discount_factors)) 