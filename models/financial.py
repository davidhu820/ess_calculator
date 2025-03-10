import numpy_financial as npf
import numpy as np

class FinancialMetrics:
    @staticmethod
    def calculate_npv(cash_flows, discount_rate):
        return npf.npv(discount_rate, cash_flows)
    
    @staticmethod
    def calculate_irr(cash_flows):
        try:
            irr_value = npf.irr(cash_flows) * 100  # 转换为百分比
            
            # 检查结果是否有效
            if np.isnan(irr_value) or np.isinf(irr_value):
                return None  # 返回None而不是NaN或Infinite
            return irr_value
        except:
            return None  # 如果计算出错，返回None
    
    @staticmethod
    def calculate_lcos(total_cost, total_energy):
        return total_cost / total_energy if total_energy != 0 else float('inf')
    
    @staticmethod
    def calculate_payback_period(cash_flows):
        cumulative_cash_flow = np.cumsum(cash_flows)
        positive_indices = np.where(cumulative_cash_flow >= 0)[0]
        return positive_indices[0] if len(positive_indices) > 0 else float('inf')