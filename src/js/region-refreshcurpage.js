window.lib4x = window.lib4x || {};
window.lib4x.axt = window.lib4x.axt || {};
window.lib4x.axt.region = window.lib4x.axt.region || {};

/*
 * refreshCurrentPage
 * Supports the Dynamic Action
 */
lib4x.axt.region.refreshCurrentPage = (function($)
{
    let paginateRefresh = false;    // current request is a regular paginate refresh (as opposed to a reset)

    // set up eventhandlers before/after refresh
    // as to save/restore scrollbars
    $(function() {
        let saveScrollTop = [];      // backup of vertical scrollbar position for window/regionBody
        let saveScrollLeft = [];     // backup of horizontal scrollbar position for window/regionBody

        // get the region body having any scrollbars
        function getRegionBody(regionId)
        {
            let regionBody$ = null;
            let regionType = apex.region(regionId).type;          
            if (regionType == 'ClassicReport')
            {
                regionBody$ = $('#' + regionId).find('.t-Region-body');
            }
            else if (regionType == 'InteractiveReport')
            {
                regionBody$ =  $('#' + regionId + '_content').find('.t-fht-tbody'); // heading fixed to 'Page'/'Region'
                if (!regionBody$.length)
                {
                    regionBody$ =  $('#' + regionId + '_content').find('.a-IRR-tableContainer'); // heading fixed to 'None'
                }
            }
            return regionBody$
        }

        $('.t-Region, .t-IRR-region').on('apexbeforerefresh', function(e){
            // backup scrollbar position 
            let regionId = e.currentTarget.id;  
            let regionBody$ = getRegionBody(e.currentTarget.id);
            saveScrollTop[regionId] = {window: $(window).scrollTop(), regionBody: regionBody$.scrollTop()};
            saveScrollLeft[regionId] = {window: $(window).scrollLeft(), regionBody: regionBody$.scrollLeft()};                     
        });

        $('.t-Region, .t-IRR-region').on('apexafterrefresh', function(e){
            if (paginateRefresh)
            {
                // only for paginateRefresh, adjust any scrollbars, not for reset to first page
                paginateRefresh = false; 
                let regionId = e.currentTarget.id;   
                let regionBody$ = getRegionBody(regionId);
                try {                            
                    $(window).scrollTop(saveScrollTop[regionId].window);
                    $(window).scrollLeft(saveScrollLeft[regionId].window);
                    regionBody$.scrollTop(saveScrollTop[regionId].regionBody);
                    regionBody$.scrollLeft(saveScrollLeft[regionId].regionBody);
                } catch(e) {};
                // check for invalid pagination situation
                let errorIndicator$ = null;
                let regionType = apex.region(regionId).type;                
                if (regionType == 'ClassicReport')
                {
                    errorIndicator$ = $('#' + regionId).find('.apex-tabular-form-error-box');
                }
                else if (regionType == 'InteractiveReport')
                {
                    errorIndicator$ = $('#' + regionId + '_content').find('.a-IRR-pagination-reset');
                }
                if (errorIndicator$.length)
                {
                    // this might be when a row was deleted which was the only row on the page
                    // in ui normally the user gets a message 'invalid set of rows selected'
                    // and a link as to reset the pagination
                    // here we do it by region refresh
                    setTimeout(()=>{apex.region(regionId).refresh();}, 10);
                }
            }
        });       
    });

    // extract start/end row from pagination label
    function extractPagination(paginationLabel, maxRowsToQuery)
    {
        let result = null;
        const regex = /(\d+)\s*-\s*(\d+)/;
        const match = paginationLabel.trim().match(regex);
        if (match && match.length >= 3)
        {
            result = {startRow: parseInt(match[1]), endRow: parseInt(match[2])};    
        }  
        else if (maxRowsToQuery)
        {
            // cover situation in which paginationLabel is just having the page number only
            // which is the case for CR - Search Engine 1,2,3,4 (set based pagination)
            let pageNumber = 0;
            try {
                pageNumber = parseInt(paginationLabel);
            }
            catch(e) {};
            if (pageNumber > 0)
            {
                let startRow = 1 + ((pageNumber-1) * maxRowsToQuery);
                result = {startRow: startRow, endRow: (startRow + maxRowsToQuery - 1)};    
            }
        } 
        return result; 
    }

    /*
    * Refresh region current page for Classic Report
    */
    lib4x.axt.region.cr = (function()
    {
        // get current pagination parameters from any pagination label
        function getCurrentPagination(regionId, maxRowsToQuery)
        {
            let result = null;
            // try/catch block for defensive programming here
            try {
                // first try in case select list pagination is configured
                let paginationLabel = $('#cr_emp .t-Report-pagination .t-Report-paginationText select option[selected]').text();
                if (!paginationLabel)
                {
                    // next try in case 'set pagination' is configured
                    paginationLabel = $('#' + regionId + ' .t-Report-pagination .t-Report-paginationText strong').first().text();
                }
                if (!paginationLabel)
                {
                    // last try for any other pagination type
                    paginationLabel = $('#' + regionId + ' .t-Report-pagination .t-Report-paginationText').first().text();
                }
                if (paginationLabel)
                {
                    let startEndRow = extractPagination(paginationLabel, maxRowsToQuery);
                    if (startEndRow)
                    {
                        result = {
                            minRow: startEndRow.startRow,
                            fetched: (startEndRow.endRow - startEndRow.startRow + 1)
                        };
                    }
                }  
            } catch(e) {};
            return result;      
        }    

        /*
        * refreshCurrentPage
        * main function as to refresh the current page for the CR region
        */
        function refreshCurrentPage(regionId, internalRegionId, maxRowsToQuery)
        {
            apex.debug.trace('lib4x.axt.region.cr.refreshCurrentPage: regionId:', regionId);
            // assume a reset is required, unless we get a complete hold on the 
            // pagination parameters from any pagination label
            let doReset = true;
            if (internalRegionId)
            {
                let ajaxIdentifier = null;
                try
                {
                    // try to get ajaxIdentifier from (first found) pagination link
                    ajaxIdentifier = $('#' + regionId + ' .t-Report-pagination tr td a').first().attr('href').match(/'(.*?)'/g)[1].replace(/\'/g, "");
                }
                catch (e) {}
                if (ajaxIdentifier)
                {
                    // get minRow/fetched as derived from any pagination label
                    let currentPagination = getCurrentPagination(regionId, maxRowsToQuery);
                    if (currentPagination)
                    {
                        // we got what we need, no feedback required on reset
                        apex.debug.trace('lib4x.axt.region.cr.refreshCurrentPage: parameters from pagination label taken');
                        apex.debug.trace('lib4x.axt.region.cr.refreshCurrentPage: call apex.widget.report.paginate');                        
                        doReset = false;
                        paginateRefresh = true;
                        // use internal method - there is no other way
                        apex.widget.report.paginate(internalRegionId, ajaxIdentifier, {
                            min: currentPagination.minRow,
                            max: maxRowsToQuery,
                            fetched: currentPagination.fetched
                        });                        
                    }
                }
            }
            if (doReset)
            {
                // in case 'partial page refresh' has been switched off, it will also land up 
                // here (ajaxIdentifier null), and the below refresh will have no effect
                apex.debug.trace('lib4x.axt.report.cr.refreshCurrentPage: fallback on region reset');                
                apex.region(regionId).refresh();
            }
        }    

        return{
            refreshCurrentPage: refreshCurrentPage
        }
    })();

    /*
    * Refresh region current page for Interactive Report
    */
    lib4x.axt.region.ir = (function()
    {
        /*
        * refreshCurrentPage
        * Refresh the current report page as per the current startRow and rowsPerPage
        */
        refreshCurrentPage = function(regionId)
        {
            apex.debug.trace('lib4x.axt.region.ir.refreshCurrentPage: regionId:', regionId);
            let startRow = getCurrentPagination(regionId).startRow;
            let currentRowsPerPage = getCurrentRowsPerPage(regionId);
            let paginationString = composePaginationString(startRow, currentRowsPerPage);
            apex.debug.trace('lib4x.axt.region.ir.refreshCurrentPage: paginationString:', paginationString);
            let reportInstance = getReportWidgetInstance(regionId);
            paginateRefresh = true;
            // use internal method - there is no other way
            reportInstance._paginate(paginationString);                
        }    

        // get the report widget instance
        function getReportWidgetInstance(regionId)
        {
            return (apex.region(regionId).widget().interactiveReport('instance'));        
        }

        // compose the pagination string as per startRow/rowsPerPage
        function composePaginationString(startRow, rowsPerPage)
        {
            return ('pgR_min_row=' + startRow + 'max_rows=' + rowsPerPage + 'rows_fetched=' + rowsPerPage);
        }

        // get the current configured rowsPerPage from the widget options
        function getCurrentRowsPerPage(regionId)
        {
            return(apex.region(regionId).widget().interactiveReport('option').currentRowsPerPage);
        }

        // get the current startRow and endRow as per the pagination label
        // if not found, startRow will be 1 and endRow 0
        function getCurrentPagination(regionId)
        {
            let result = {startRow: 1, endRow: 0};  // if no paginationLabel found, start at 1
            let paginationLabel = $('#' + regionId).find('.a-IRR-pagination-label').first().text();
            if (paginationLabel)
            {
                let startEndRow = extractPagination(paginationLabel);
                result = startEndRow || result;
            }  
            return result;      
        }    

        return{
            refreshCurrentPage: refreshCurrentPage
        }
    })();  

    /*
    * Refresh current page for model based data
    * Pagination Type should be 'Page' and 'Show Total Count' should be checked
    */
    function refreshCurrentModelPage(regionId)
    {   
        apex.debug.trace('lib4x.axt.region.refreshCurrentPage - refreshCurrentModelPage: regionId:', regionId);    
        let regionType = apex.region(regionId).type;
        let viewInstance, model, widget;
        if (regionType == "Cards")
        {
            viewInstance = apex.region(regionId).call('instance');
            model = apex.region(regionId).call('getModel');
            widget = apex.region(regionId).widget();
        } 
        else if (regionType == 'TemplateComponent')
        {
            let tc$ = $('#' + regionId + '_TemplateComponent');
            viewInstance = tc$.tableModelView('instance');
            model = tc$.tableModelView('getModel');
            widget = tc$;
        }  
        if (widget && viewInstance && (viewInstance.pageSize > 0) && model && (model.getTotalRecords() > 0))
        {           
            let pageNumber = Math.ceil( viewInstance.pageOffset / viewInstance.pageSize ); //zero based page number
            widget.on('tablemodelviewpagechange.lib4xregionrefresh', function(event, data) {
                setTimeout(()=>{
                    widget.off('tablemodelviewpagechange.lib4xregionrefresh');
                    // gotoPage will check for valid page number; 
                    // if not valid anymore, it will remain on page 0
                    viewInstance.gotoPage(pageNumber);
                });
            });
            apex.region(regionId).refresh();     
        }   
        else if (model.getTotalRecords() <= 0)
        {
            apex.debug.trace('lib4x.axt.region.refreshCurrentPage - refreshCurrentModelPage: Pagination Type should be \'Page\' and \'Show Total Count\' should be checked');
        }
    }

    // execute the DA
    let execute = function()
    {
        // read DA attribute values
        let daThis = this;
        let regionId = daThis.action.affectedRegionId;
        let internalRegionId = daThis.action.attribute01;
        let maxRowsToQuery = 10;
        if (daThis.action.attribute02)
        {
            maxRowsToQuery = parseInt(daThis.action.attribute02);
            // maxRowsToQuery server-side retrieved for CR
            // as CR is not having this client-side readily available (IR has)
        }
        if (regionId)
        {
            let regionType = apex.region(regionId).type;
            if (regionType == 'ClassicReport')
            {
                lib4x.axt.region.cr.refreshCurrentPage(regionId, internalRegionId, maxRowsToQuery);
            }
            else if (regionType == 'InteractiveReport')
            {
                // current view should be report view
                if (apex.region(regionId).widget().interactiveReport('option').reportViewMode == 'REPORT')
                {
                    lib4x.axt.region.ir.refreshCurrentPage(regionId);
                }
            }
            else if ((regionType == 'Cards') || (regionType == 'TemplateComponent'))
            {
                refreshCurrentModelPage(regionId);
            }            
        }
        else
        {
            apex.debug.trace('lib4x.axt.region.refreshCurrentPage - Region not specified');
        }
    }    

    return{
        _execute: execute
    }
})(apex.jQuery);      
