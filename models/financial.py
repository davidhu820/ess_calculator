import numpy_financial as npf
import numpy as np

class FinancialMetrics:
    """财务指标计算工具类"""
    
    @staticmethod
    def calculate_npv(cash_flows, discount_rate):
        """
        计算净现值 (NPV)
        
        参数:
            cash_flows (list): 现金流列表，第一个元素为初始投资（通常为负）
            discount_rate (float): 贴现率（小数形式，如0.08表示8%）
            
        返回:
            float: 净现值
        """
        return npf.npv(discount_rate, cash_flows)
    
    @staticmethod
    def calculate_irr(cash_flows):
        """
        计算内部收益率 (IRR)
        
        参数:
            cash_flows (list): 现金流列表，第一个元素为初始投资（通常为负）
            
        返回:
            float: 内部收益率（百分比形式），如计算失败则返回None
        """
        try:
            irr_value = npf.irr(cash_flows) * 100  # 转换为百分比
            
            # 检查结果是否有效
            if np.isnan(irr_value) or np.isinf(irr_value):
                return None  # 返回None而不是NaN或Infinite
            return irr_value
        except:
            return None  # 如果计算出错，返回None
    
    @staticmethod
    def calculate_lcoe(total_cost, total_energy):
        """
        计算平准化度电成本 (LCOE - Levelized Cost of Electricity)
        
        参数:
            total_cost (float): 系统生命周期总成本（元）
            total_energy (float): 系统生命周期总发电量（kWh）
            
        返回:
            float: 平准化度电成本（元/kWh）
        """
        return total_cost / total_energy if total_energy != 0 else float('inf')
    
    @staticmethod
    def calculate_lcos(total_cost, total_energy):
        """
        计算平准化储能成本 (LCOS - Levelized Cost of Storage)
        
        参数:
            total_cost (float): 系统生命周期总成本（元）
            total_energy (float): 系统生命周期总放电量（kWh）
            
        返回:
            float: 平准化储能成本（元/kWh）
        """
        return total_cost / total_energy if total_energy != 0 else float('inf')
    
    @staticmethod
    def calculate_payback_period(cash_flows):
        """
        计算投资回收期
        
        参数:
            cash_flows (list): 现金流列表，第一个元素为初始投资（通常为负）
            
        返回:
            float: 投资回收期（年），如未能在现金流周期内回收则返回inf
        """
        cumulative_cash_flow = np.cumsum(cash_flows)
        positive_indices = np.where(cumulative_cash_flow >= 0)[0]
        return positive_indices[0] if len(positive_indices) > 0 else float('inf')
    
    @staticmethod
    def calculate_benefit_cost_ratio(positive_flows, negative_flows, discount_rate):
        """
        计算效益成本比 (BCR)
        
        参数:
            positive_flows (list): 正现金流列表
            negative_flows (list): 负现金流列表（绝对值）
            discount_rate (float): 贴现率
            
        返回:
            float: 效益成本比
        """
        # 计算正现金流现值
        pv_positive = sum(flow / ((1 + discount_rate) ** i) for i, flow in enumerate(positive_flows) if i > 0)
        
        # 计算负现金流现值（包括初始投资）
        pv_negative = abs(negative_flows[0])  # 初始投资
        pv_negative += sum(flow / ((1 + discount_rate) ** i) for i, flow in enumerate(negative_flows) if i > 0)
        
        return pv_positive / pv_negative if pv_negative != 0 else float('inf')
    
    @classmethod
    def calculate_all_metrics(cls, cash_flows, discount_rate, total_energy=None):
        """
        计算所有财务指标
        
        参数:
            cash_flows (list): 现金流列表
            discount_rate (float): 贴现率
            total_energy (float, optional): 系统生命周期总能量，用于LCOE/LCOS计算
            
        返回:
            dict: 包含所有财务指标的字典
        """
        # 将现金流分为正负两部分
        positive_flows = [max(0, flow) for flow in cash_flows]
        negative_flows = [abs(min(0, flow)) for flow in cash_flows]
        
        # 计算基本指标
        npv = cls.calculate_npv(cash_flows, discount_rate)
        irr = cls.calculate_irr(cash_flows)
        payback = cls.calculate_payback_period(cash_flows)
        
        # 创建结果字典
        results = {
            'npv': npv,
            'irr': irr,
            'payback_period': payback
        }
        
        # 如果提供了总能量，计算LCOE/LCOS
        if total_energy is not None:
            # 计算总成本（初始投资加运营成本现值）
            total_cost = negative_flows[0]  # 初始投资
            for i, flow in enumerate(negative_flows):
                if i > 0:  # 跳过初始投资
                    total_cost += flow / ((1 + discount_rate) ** i)
                    
            lcoe_lcos = cls.calculate_lcoe(total_cost, total_energy)
            results['lcoe'] = lcoe_lcos
            results['lcos'] = lcoe_lcos
        
        # 计算效益成本比
        results['bcr'] = cls.calculate_benefit_cost_ratio(positive_flows, negative_flows, discount_rate)
        
        return results