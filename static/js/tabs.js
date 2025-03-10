/**
 * 标签页功能管理
 */
$(document).ready(function() {
    // 参数区域Tab切换
    $('.tabs .tab').on('click', function() {
        const tabId = $(this).data('tab');
        
        // 获取当前标签所属的标签组
        const tabGroup = $(this).closest('.tabs');
        
        // 仅切换当前标签组内的标签
        tabGroup.find('.tab').removeClass('active');
        $(this).addClass('active');
        
        // 确定要操作的内容集合
        let tabContents;
        if (tabGroup.hasClass('results-tabs')) {
            tabContents = $('#summary-tab, #operation-data-tab, #financial-analysis-tab, #load-optimization-tab');
        } else {
            tabContents = $('#basic-params, #price-params, #operation-params, #load-analysis');
        }
        
        // 隐藏所有相关的内容
        tabContents.removeClass('active').hide();
        
        // 显示当前选中的内容
        $('#' + tabId).addClass('active').show();
        
        // 如果切换了图表相关标签页，触发更新以保证图表正常显示
        if (tabId === 'price-params') {
            updatePriceTimeChart();
        } else if (tabId === 'load-analysis') {
            updateOriginalLoadChart();
        } else if (tabId === 'load-optimization-tab') {
            updateModifiedLoadChart();
        } else if (tabId === 'financial-analysis-tab' && $('#chart').html()) {
            // 只有当图表已经有数据时才触发重绘
            $(window).trigger('resize');
        }
    });
}); 