/**
 * 标签页控制模块
 * 提供通用的标签页切换功能
 */

/**
 * 初始化标签页功能
 * @param {Object} options - 配置选项
 * @param {string} options.tabSelector - 标签选择器
 * @param {string} options.contentSelector - 内容区域选择器
 * @param {Function} options.onTabChange - 标签切换回调函数
 */
function initializeTabs(options = {}) {
    const config = {
        tabSelector: '.tab',
        contentSelector: '.tab-content',
        onTabChange: null,
        ...options
    };
    
    $(document).on('click', config.tabSelector, function() {
        const tabId = $(this).data('tab');
        
        // 获取当前标签组
        const tabGroup = $(this).closest('.tabs');
        
        // 切换当前标签组内的标签
        tabGroup.find(config.tabSelector).removeClass('active');
        $(this).addClass('active');
        
        // 获取相关内容元素
        const contentElements = $(config.contentSelector);
        
        // 隐藏所有内容
        contentElements.removeClass('active');
        
        // 显示当前选中的内容
        $('#' + tabId).addClass('active');
        
        // 如果提供了回调函数，调用它
        if (typeof config.onTabChange === 'function') {
            config.onTabChange(tabId, this);
        }
    });
}

/**
 * 激活特定标签
 * @param {string} tabId - 要激活的标签ID
 * @param {string} [tabGroupSelector='.tabs'] - 标签组选择器
 */
function activateTab(tabId, tabGroupSelector = '.tabs') {
    const tabElement = $(`${tabGroupSelector} .tab[data-tab="${tabId}"]`);
    if (tabElement.length) {
        tabElement.click();
    }
}

/**
 * 获取当前激活的标签ID
 * @param {string} [tabGroupSelector='.tabs'] - 标签组选择器
 * @returns {string} 激活的标签ID
 */
function getActiveTab(tabGroupSelector = '.tabs') {
    return $(`${tabGroupSelector} .tab.active`).data('tab');
}

// 在文档加载完成后初始化标签页
$(document).ready(function() {
    initializeTabs();
});

// 导出函数
window.TabManager = {
    initialize: initializeTabs,
    activateTab: activateTab,
    getActiveTab: getActiveTab
}; 