# 电池储能系统经济性分析应用

此应用用于分析电池储能系统的经济效益，包括现金流分析、投资回报等指标。

## 安装指南

1. 确保你的电脑上已安装Python 3.7或更高版本
2. 克隆或下载此项目到本地文件夹
3. 打开命令行，进入项目文件夹
4. 安装所需依赖：

```bash
pip install -r requirements.txt
```

## 运行应用

完成安装后，通过以下命令启动应用：

```bash
python run.py
```

启动后，在浏览器中访问 http://localhost:5000 即可使用应用。

## 项目结构说明

- `app.py`: 主应用文件，包含Flask路由和图表生成函数
- `models/`: 包含计算模型和财务分析工具
  - `calculator.py`: 储能系统计算模型
  - `financial.py`: 财务指标计算
- `templates/`: HTML模板文件
- `static/`: CSS和JavaScript文件 
