# apex-refresh-current-page
Refresh a region keeping the pagination. Enables to refresh the current page on a region with pagination.

Refreshes the region (Classic Report, Interactive Report, Interactive Grid, Cards Region or Template Component Region), where instead of going back to the first page, it retains the current pagination page. Also any scrollbar positions are maintained. 

For IG, Cards/Template Component Regions, the plugin is applicable for Pagination Type 'Page' - have 'Show Total Count' as checked.

The dynamic action typically can be used on 'Dialog Closed' event.

![image](https://github.com/kekema/apex-refresh-current-page/blob/main/refresh-region-keep-pagination.jpg)

See: [demo page](https://apex.oracle.com/pls/apex/r/yola/demo/employees-refresh)

<h4>Plugin Versions</h4>
Version 1.0.0 - build under APEX 24.1<br/>
Version 1.1.0 - build under APEX 24.1<br/>
Version 1.1.1 - build under APEX 24.2<br/>
<br/>
See [here](https://github.com/kekema/apex-refresh-current-page/issues/1) for a backport to 23.1 contributed by [Steffen Clauß](https://github.com/scl-4711).

