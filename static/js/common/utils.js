/**
 * 通用工具函数
 * 包含所有系统共享的辅助功能
 */

/**
 * 格式化数字为货币显示格式
 * @param {number} value - 要格式化的数字
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的字符串
 */
function formatCurrency(value, decimals = 2) {
    return parseFloat(value).toFixed(decimals);
}

/**
 * 格式化数字为百分比显示格式
 * @param {number} value - 要格式化的比例值 (0-1)
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的百分比字符串
 */
function formatPercent(value, decimals = 1) {
    return (value * 100).toFixed(decimals) + '%';
}

/**
 * 转换时间字符串为小时数
 * @param {string} timeStr - 时间字符串 (HH:MM 格式)
 * @returns {number} 小时数 (可能包含小数部分)
 */
function timeToHours(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
}

/**
 * 判断给定时间是否在指定时间范围内
 * @param {string} time - 要检查的时间
 * @param {string} startTime - 开始时间
 * @param {string} endTime - 结束时间
 * @returns {boolean} 是否在范围内
 */
function isTimeInRange(time, startTime, endTime) {
    // 将时间字符串转换为小时数进行比较
    const timeHour = timeToHours(time);
    const startHour = timeToHours(startTime);
    let endHour = timeToHours(endTime);
    
    // 处理跨日的情况
    if (endHour <= startHour) {
        endHour += 24;
    }
    
    // 处理跨日比较
    let comparisonHour = timeHour;
    if (timeHour < startHour && timeHour < endHour % 24) {
        comparisonHour += 24;
    }
    
    return comparisonHour >= startHour && comparisonHour < endHour;
}

/**
 * 显示提示消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型 ('success', 'error', 'info')
 * @param {number} duration - 显示时长(毫秒)
 */
function showNotification(message, type = 'info', duration = 3000) {
    // 移除现有通知
    $('.notification').remove();
    
    // 创建新通知
    const notification = $('<div>')
        .addClass('notification')
        .addClass(type)
        .text(message)
        .appendTo('body');
    
    // 显示动画
    notification.animate({
        opacity: 1,
        bottom: '20px'
    }, 300);
    
    // 设置自动消失
    setTimeout(function() {
        notification.animate({
            opacity: 0,
            bottom: '-50px'
        }, 300, function() {
            notification.remove();
        });
    }, duration);
}

/**
 * 将数组数据导出为CSV格式
 * @param {Array} data - 要导出的数据
 * @param {string} filename - 文件名
 */
function exportToCsv(data, filename) {
    // 检查输入
    if (!data || !data.length) {
        showNotification('没有数据可导出', 'error');
        return;
    }
    
    // 处理文件名
    if (!filename) {
        filename = 'export.csv';
    } else if (!filename.endsWith('.csv')) {
        filename += '.csv';
    }
    
    // 创建CSV内容
    let csvContent = '';
    
    // 如果是对象数组，添加表头
    if (typeof data[0] === 'object') {
        csvContent += Object.keys(data[0]).join(',') + '\n';
    }
    
    // 添加数据行
    data.forEach(function(row) {
        if (typeof row === 'object') {
            const values = Object.values(row).map(value => {
                // 处理包含逗号的字段
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value}"`;
                }
                return value;
            });
            csvContent += values.join(',') + '\n';
        } else {
            csvContent += row + '\n';
        }
    });
    
    // 创建下载链接
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * 将form元素数据转换为对象
 * @param {HTMLFormElement} form - 表单元素
 * @returns {Object} 表单数据对象
 */
function formToObject(form) {
    const formData = new FormData(form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
        // 处理数字输入
        if (!isNaN(value) && value !== '') {
            data[key] = parseFloat(value);
        } else {
            data[key] = value;
        }
    }
    
    return data;
}

// 导出所有函数
window.Utils = {
    formatCurrency,
    formatPercent,
    timeToHours,
    isTimeInRange,
    showNotification,
    exportToCsv,
    formToObject
}; 