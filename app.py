from flask import Flask, render_template, request, jsonify
import plotly
import plotly.graph_objs as go
import json
import numpy as np
from models.calculator import EnergyStorageCalculator
from models.financial import FinancialMetrics

app = Flask(__name__)

def create_cash_flow_chart(years, cash_flows, annual_revenues, maintenance_costs, battery_replacements, demand_charge_impacts=None):
    """
    创建现金流瀑布图
    - years: 年份列表
    - cash_flows: 总现金流
    - annual_revenues: 年度削峰填谷收益
    - maintenance_costs: 年度运维成本（包括基础运维和额外维护）
    - battery_replacements: 电池更换成本
    - demand_charge_impacts: 需量电费影响（可能是收益也可能是支出）
    """
    
    # 创建收益图（正值）
    revenue_trace = go.Bar(
        name='削峰填谷收益',
        x=years,
        y=[max(0, rev) for rev in annual_revenues],
        marker_color='rgb(0, 169, 80)',
        text=[f"+{rev:,.0f}" if rev > 0 else "" for rev in annual_revenues],
        textposition='outside',
        hovertemplate="年份: %{x}<br>收益: ¥%{y:,.0f}<extra></extra>"
    )
    
    # 如果有需量电费影响数据，创建相应的图表
    demand_positive_trace = None
    demand_negative_trace = None
    
    # 确保总是有需量电费影响数据（即使全为0）
    if demand_charge_impacts is None:
        demand_charge_impacts = [0] * len(years)
    
    # 创建需量电费收益图（正值）
    positive_values = [max(0, impact) if impact is not None else 0 for impact in demand_charge_impacts]
    if any(positive_values):
        demand_positive_trace = go.Bar(
            name='需量电费节省',
            x=years,
            y=positive_values,
            marker_color='rgb(65, 105, 225)',  # 皇家蓝色
            text=[f"+{impact:,.0f}" if impact and impact > 0 else "" for impact in demand_charge_impacts],
            textposition='outside',
            hovertemplate="年份: %{x}<br>需量电费节省: ¥%{y:,.0f}<extra></extra>"
        )
    
    # 创建需量电费支出图（负值）
    negative_values = [min(0, impact) if impact is not None else 0 for impact in demand_charge_impacts]
    if any(negative_values):
        demand_negative_trace = go.Bar(
            name='需量电费增加',
            x=years,
            y=negative_values,
            marker_color='rgb(148, 103, 189)',  # 紫色
            text=[f"{impact:,.0f}" if impact and impact < 0 else "" for impact in demand_charge_impacts],
            textposition='outside',
            hovertemplate="年份: %{x}<br>需量电费增加: ¥%{y:,.0f}<extra></extra>"
        )
    
    # 创建运维成本图（负值）
    maintenance_trace = go.Bar(
        name='运维成本',
        x=years,
        y=[-cost if cost != 0 else None for cost in maintenance_costs],
        marker_color='rgb(255, 127, 14)',
        text=[f"-{cost:,.0f}" if cost != 0 else "" for cost in maintenance_costs],
        textposition='outside',
        hovertemplate="年份: %{x}<br>运维成本: ¥%{y:,.0f}<extra></extra>"
    )
    
    # 创建电池更换成本图（负值）
    battery_trace = go.Bar(
        name='电池更换成本',
        x=years,
        y=[-cost if cost != 0 else None for cost in battery_replacements],
        marker_color='rgb(214, 39, 40)',
        text=[f"-{cost:,.0f}" if cost != 0 else "" for cost in battery_replacements],
        textposition='outside',
        hovertemplate="年份: %{x}<br>电池更换: ¥%{y:,.0f}<extra></extra>"
    )
    
    # 创建初始投资图（只有第0年）
    initial_investment = go.Bar(
        name='初始投资',
        x=[years[0]],
        y=[min(cash_flows[0], 0)],  # 应该是负值
        marker_color='rgb(31, 119, 180)',
        text=[f"{cash_flows[0]:,.0f}"],
        textposition='outside',
        hovertemplate="初始投资: ¥%{y:,.0f}<extra></extra>"
    )
    
    layout = go.Layout(
        title='年度现金流明细',
        barmode='relative',  # 使用相对模式，让正负值分别显示在x轴上下
        xaxis={
            'title': '年份',
            'tickmode': 'array',
            'ticktext': [f'第{year}年' for year in years],
            'tickvals': years
        },
        yaxis={
            'title': '金额 (元)',
            'zeroline': True,
            'zerolinewidth': 2,
            'zerolinecolor': 'black'
        },
        showlegend=True,
        legend={
            'orientation': 'h',
            'yanchor': 'bottom',
            'y': 1.02,
            'xanchor': 'right',
            'x': 1
        },
        margin={'t': 50, 'b': 50, 'l': 50, 'r': 50},
        hovermode='x unified'
    )
    
    # 准备数据系列 - 确保无论是否有非零值，总是添加需量电费的系列
    data = [initial_investment, revenue_trace]
    if demand_positive_trace:
        data.append(demand_positive_trace)
    data.append(maintenance_trace)
    if demand_negative_trace:
        data.append(demand_negative_trace)
    data.append(battery_trace)
    
    # 打印调试信息
    print(f"现金流图表数据系列数量: {len(data)}")
    for i, series in enumerate(data):
        print(f"系列 {i}: {series.name if hasattr(series, 'name') else '未命名'}")
    
    fig = go.Figure(
        data=data,
        layout=layout
    )
    
    return json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)

def simulate_storage_impact(original_loads, storage_power):
    """模拟储能系统对负荷的影响
    
    - original_loads: 原始负荷数组
    - storage_power: 储能系统功率
    - 返回: 考虑储能影响后的负荷数组
    """
    modified_loads = original_loads.copy()
    
    # 找出峰值负荷和峰值负荷时段
    peak_load = max(original_loads)
    peak_indices = [i for i, load in enumerate(original_loads) if load > 0.8 * peak_load]
    
    # 简单策略：在峰值时段放电，降低负荷
    for idx in peak_indices:
        if idx < len(modified_loads):
            # 确保不会减到负值
            modified_loads[idx] = max(0, modified_loads[idx] - storage_power)
    
    return modified_loads

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/calculate', methods=['POST'])
def calculate():
    data = request.json
    
    # 获取需量电价（如果存在）
    demand_charge_rate = float(data.get('demand_charge_rate', 38.8))
    
    # 为可能缺失的字段设置默认值
    charging_efficiency = float(data.get('charging_efficiency', 95))
    discharging_efficiency = float(data.get('discharging_efficiency', 95))
    
    calculator = EnergyStorageCalculator(
        capex=float(data.get('capex', 520000)),
        power=float(data.get('power', 250)),
        energy=float(data.get('energy', 2)),
        energy_capacity=float(data.get('energy_capacity', 522)),
        price_peak=float(data.get('price_peak', 1.0)),
        price_sharp_peak=float(data.get('price_sharp_peak', 1.2)),
        price_flat=float(data.get('price_flat', 0.6)),
        price_valley=float(data.get('price_valley', 0.4)),
        price_deep_valley=float(data.get('price_deep_valley', 0.2)),
        operation_years=int(data.get('operation_years', 15)),
        discount_rate=float(data.get('discount_rate', 0.08)),
        opex_percent=float(data.get('opex_percent', 0.02)),
        charge_discharge_mode=data.get('charge_discharge_mode', 'single'),
        capacity_degradation_rate=float(data.get('capacity_degradation_rate', 2)),
        warranty_period=int(data.get('warranty_period', 5)),
        maintenance_cost=float(data.get('maintenance_cost', 10000)),
        battery_cycle_life=float(data.get('battery_cycle_life', 6000)),
        battery_replacement_cost=float(data.get('battery_replacement_cost', 100000)),
        charging_efficiency=charging_efficiency,
        discharging_efficiency=discharging_efficiency,
        maintenance_cost_growth_rate=float(data.get('maintenance_cost_growth_rate', 5)),
        single_charge_price_type=data.get('single_charge_price', 'deep_valley'),
        single_discharge_price_type=data.get('single_discharge_price', 'sharp_peak'),
        first_charge_price_type=data.get('first_charge_price', 'deep_valley'),
        first_discharge_price_type=data.get('first_discharge_price', 'sharp_peak'),
        second_charge_price_type=data.get('second_charge_price', 'valley'),
        second_discharge_price_type=data.get('second_discharge_price', 'peak')
    )
    
    # 获取计算结果
    cash_flows, annual_revenues, daily_revenues, maintenance_costs, operation_data = calculator.calculate_cash_flows(float(data['cycles_per_year']))
    
    # 获取负荷数据（如果存在）
    hourly_loads = data.get('hourly_loads', [])
    
    # 计算需量电费影响
    demand_charge_impacts = None

    # 检查是否启用需量电费计算
    enable_demand_charge = data.get('enable_demand_charge', False)
    print(f"需量电费计算是否启用: {enable_demand_charge}")

    if enable_demand_charge and hourly_loads and len(hourly_loads) > 0:
        # 从前端获取计算好的负荷降低量
        load_reduction = float(data.get('load_reduction', 0))
        print(f"接收到的负荷降低量: {load_reduction}")  # 调试信息
        
        # 计算年度需量电费影响（正值表示节省，负值表示增加）
        annual_demand_impact = load_reduction * demand_charge_rate * 12
        print(f"计算的年度需量电费影响: {annual_demand_impact}")  # 调试信息
        
        # 创建需量电费影响数组
        demand_charge_impacts = [0]  # 第0年无影响
        for year in range(1, calculator.operation_years + 1):
            demand_charge_impacts.append(annual_demand_impact)
        
        print(f"需量电费影响数组: {demand_charge_impacts}")  # 调试信息
        
        # 关键修改：将需量电费影响添加到现金流中
        for i in range(1, len(cash_flows)):
            cash_flows[i] += demand_charge_impacts[i]
        print(f"更新后的现金流: {cash_flows}")  # 调试信息
    else:
        # 即使禁用，也创建一个全0数组，确保图表始终包含需量电费数据点
        demand_charge_impacts = [0] * (calculator.operation_years + 1)
        print("需量电费计算已禁用或无负荷数据，使用全0数组")
    
    # 添加选择的电价信息到返回数据中
    operation_data.update({
        'selected_prices': {
            'single_mode': {
                'charge': calculator.get_price_by_type(calculator.single_charge_price_type),
                'discharge': calculator.get_price_by_type(calculator.single_discharge_price_type)
            },
            'double_mode': {
                'first_charge': calculator.get_price_by_type(calculator.first_charge_price_type),
                'first_discharge': calculator.get_price_by_type(calculator.first_discharge_price_type),
                'second_charge': calculator.get_price_by_type(calculator.second_charge_price_type),
                'second_discharge': calculator.get_price_by_type(calculator.second_discharge_price_type)
            }
        }
    })
    
    years = list(range(calculator.operation_years + 1))
    
    # 重新计算财务指标，此时已经包含需量电费影响
    npv = float(FinancialMetrics.calculate_npv(cash_flows, calculator.discount_rate))

    # 计算IRR，确保结果是有效的JSON值
    try:
        irr = float(FinancialMetrics.calculate_irr(cash_flows))
        # 处理特殊情况 - 如果IRR是NaN或Infinite，转换为数值
        if np.isnan(irr) or np.isinf(irr):
            irr = None  # 使用None代替NaN或Infinite
    except:
        irr = None
    
    # 计算投资回收期，同样处理特殊情况
    try:
        payback_period = float(FinancialMetrics.calculate_payback_period(cash_flows))
        if np.isnan(payback_period) or np.isinf(payback_period):
            payback_period = None
    except:
        payback_period = None
    
    # 计算总能量和LCOS（考虑容量衰减）
    total_energy = sum([
        calculator.power * calculator.energy * float(data['cycles_per_year']) * 
        (1 - calculator.capacity_degradation_rate) ** year * calculator.system_efficiency
        for year in range(1, calculator.operation_years + 1)
    ])
    
    total_cost = float(calculator.capex + sum([
        maintenance_costs[i] / ((1 + calculator.discount_rate) ** i)
        for i in range(1, calculator.operation_years + 1)
    ]))
    
    lcos = float(FinancialMetrics.calculate_lcos(total_cost, total_energy))
    
    # 确保数据是JSON可序列化的
    cash_flows = [float(cf) for cf in cash_flows]
    annual_revenues = [float(ar) for ar in annual_revenues]
    daily_revenues = [float(dr) for dr in daily_revenues]
    maintenance_costs = [float(mc) for mc in maintenance_costs]
    
    # 这里添加提取 final_capacity 的代码
    final_capacity = operation_data['final_capacity']
    
    # 生成图表，加入需量电费影响数据
    chart = create_cash_flow_chart(
        years=years,
        cash_flows=cash_flows,
        annual_revenues=annual_revenues,
        maintenance_costs=maintenance_costs,
        battery_replacements=[0] * (calculator.operation_years + 1),
        demand_charge_impacts=demand_charge_impacts
    )
    
    # 计算LCOS组成部分
    lcos_data = calculator.calculate_lcos_components(float(data['cycles_per_year']), total_energy)
    
    # 创建LCOS饼图
    lcos_pie = {
        'data': [{
            'type': 'pie',
            'labels': list(lcos_data['components'].keys()),
            'values': list(lcos_data['components'].values()),
            'textinfo': 'label+percent',
            'hovertemplate': '%{label}<br>%{value:.2f} 元/kWh<br>占比: %{percent}<extra></extra>',
            'marker': {
                'colors': ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728']
            },
            'textposition': 'outside',
            'hole': 0.4
        }],
        'layout': {
            'title': 'LCOS构成分析',
            'height': 450,
            'width': 500,
            'showlegend': True,
            'legend': {
                'orientation': 'h',
                'yanchor': 'bottom',
                'y': -0.1,
                'xanchor': 'center',
                'x': 0.5
            },
            'margin': {
                't': 50,
                'b': 50,
                'l': 50,
                'r': 50
            }
        }
    }
    
    # 提取每日数据
    daily_data = operation_data.get('daily_data', {})
    
    # 在返回的JSON中添加负荷分析数据
    response_data = {
        'metrics': {
            'npv': npv,
            'irr': irr,
            'lcos': lcos,
            'payback_period': payback_period,
            'cash_flows': cash_flows,
            'years': years,
            'annual_revenues': annual_revenues,
            'daily_revenues': daily_revenues,
            'total_energy': float(total_energy),
            'final_capacity': float(final_capacity),
            'lcos_components': lcos_data['components'],
            'lcos_present_values': lcos_data['present_values'],
            'rated_capacity': operation_data.get('rated_capacity', 0),
            'effective_capacity': operation_data.get('effective_capacity', 0),
            'daily_charge_energy': daily_data.get('charge_energy', 0),
            'daily_discharge_energy': daily_data.get('discharge_energy', 0),
            'daily_charge_cost': daily_data.get('charge_cost', 0),
            'daily_discharge_income': daily_data.get('discharge_income', 0),
            'daily_net_income': daily_data.get('daily_revenue', 0),
            'yearly_operation_days': operation_data.get('yearly_operation_days', 0),
            'first_year_charge': operation_data.get('first_year_charge', 0),
            'first_year_discharge': operation_data.get('first_year_discharge', 0),
            'first_year_charge_cost': daily_data.get('charge_cost', 0) * operation_data.get('yearly_operation_days', 0),
            'first_year_discharge_income': daily_data.get('discharge_income', 0) * operation_data.get('yearly_operation_days', 0),
            'first_year_net_income': daily_data.get('daily_revenue', 0) * operation_data.get('yearly_operation_days', 0),
            'warranty_maintenance_cost': operation_data.get('warranty_maintenance_cost', 0),
            'first_year_after_warranty_cost': operation_data.get('first_year_after_warranty_cost', 0),
            'maintenance_growth_rate': operation_data.get('maintenance_growth_rate', 0),
            'first_replacement_year': operation_data.get('first_replacement_year', 0),
            'cycles_per_year': float(data['cycles_per_year']),
            'total_cycles': operation_data.get('total_cycles', 0),
            'current_capacity_percent': operation_data.get('current_capacity_percent', 0),
            'hourly_loads': hourly_loads,
            'demand_charge_rate': demand_charge_rate,
            'load_reduction': load_reduction if 'load_reduction' in locals() else 0,
            'annual_demand_impact': annual_demand_impact if 'annual_demand_impact' in locals() else 0,
            'demand_charge_impacts': demand_charge_impacts,
        },
        'chart': chart,
        'lcos_pie': json.dumps(lcos_pie, cls=plotly.utils.PlotlyJSONEncoder)
    }
    
    return jsonify(response_data)

if __name__ == '__main__':
    app.run(debug=True)